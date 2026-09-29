import { db, setWriteListener } from './db.js'
import { T } from './schema.js'
import { pullAll, pushTables } from './remote.js'
import { readStoredValue, writeStoredValue, removeStoredValue } from './storage.js'

const TABLES = Object.values(T)
const LAST_PULL_KEY = 'sqms_last_pull_time'
const PENDING_SYNC_KEY = 'sqms_pending_sync'
const PRESERVE_WHEN_REMOTE_EMPTY = new Set([T.EMPLOYEE, T.CUSTOMER])
const PROTECTED_WECHAT_FIELDS = ['wechatOpenid', 'wechatUnionid', 'wechatBindTime']

// 推送到后端前剥离微信绑定字段：这些字段以服务端为权威，避免本地脏副本把已绑 openid 覆盖清空
function stripWechatFields(table, rows) {
	if (table !== T.EMPLOYEE && table !== T.CUSTOMER) return rows
	return rows.map((row) => {
		const copy = { ...row }
		PROTECTED_WECHAT_FIELDS.forEach((f) => delete copy[f])
		return copy
	})
}

let enabled = false
let timer = null
let flushPromise = null
let refreshPromise = null
let activeBatch = null
let pendingHydrated = false
let syncQueue = Promise.resolve()
let lastSyncError = ''
let retryDelay = 500
const dirtyUpserts = new Map()
const dirtyDeletions = new Map()

setWriteListener(markDirty)

function enqueueSync(operation) {
	const result = syncQueue.then(operation)
	syncQueue = result.catch(() => {})
	return result
}

export function getLastSyncError() {
	return lastSyncError
}

function rememberError(error) {
	lastSyncError = (error && (error.message || error.errMsg)) || '网络连接失败，请重试'
	console.warn('SQMS sync failed:', lastSyncError)
}

export function enableRemoteSync(value = true) {
	enabled = value
}

export function isRemoteSyncEnabled() {
	return enabled
}

export async function syncFromRemote() {
	const res = await pullAll()
	const data = res.data || {}
	const preservedTables = {}
	const remoteCount = TABLES.reduce((count, table) => {
		return count + (Array.isArray(data[table]) ? data[table].length : 0)
	}, 0)
	if (remoteCount === 0) {
		throw new Error('服务器返回空数据，已保留本机记录')
	}
	// 网络请求期间仍可能发生录入或上传；在覆盖缓存前捕获最新的待同步记录。
	const pendingLocalState = capturePendingLocalState()
	TABLES.forEach((table) => {
		if (Array.isArray(data[table])) {
			if (PRESERVE_WHEN_REMOTE_EMPTY.has(table) && data[table].length === 0 && db.count(table) > 0) {
				preservedTables[table] = stripWechatFields(table, db.list(table))
				return
			}
			// Merge pending edits BEFORE writing the cache, so even a storage failure cannot erase them.
			const rowsById = new Map(data[table].map((row) => [row._id, row]))
			;(pendingLocalState.deletions[table] || []).forEach((id) => rowsById.delete(id))
			;(pendingLocalState.tables[table] || []).forEach((row) => rowsById.set(row._id, row))
			db.setAll(table, Array.from(rowsById.values()), true)
		}
	})
	data.__preservedTables = preservedTables
	uni.setStorageSync(LAST_PULL_KEY, data.serverTime || Date.now())
	return data
}

export async function syncAllToRemote() {
	const tables = {}
	TABLES.forEach((table) => {
		tables[table] = stripWechatFields(table, db.list(table))
	})
	return pushTables(tables)
}

function idsFor(map, table) {
	if (!map.has(table)) map.set(table, new Set())
	return map.get(table)
}

function hasPendingChanges() {
	return dirtyUpserts.size > 0 || dirtyDeletions.size > 0
}

function applyIds(targetUpserts, targetDeletions, table, upsertIds = [], deletedIds = []) {
	const upserts = idsFor(targetUpserts, table)
	const deletions = idsFor(targetDeletions, table)
	deletedIds.forEach((id) => {
		if (!id) return
		upserts.delete(id)
		deletions.add(id)
	})
	upsertIds.forEach((id) => {
		if (!id) return
		deletions.delete(id)
		upserts.add(id)
	})
	if (!upserts.size) targetUpserts.delete(table)
	if (!deletions.size) targetDeletions.delete(table)
}

function pendingIdMaps() {
	const upserts = new Map()
	const deletions = new Map()
	if (activeBatch) {
		Object.entries(activeBatch.tables || {}).forEach(([table, rows]) => {
			applyIds(upserts, deletions, table, rows.map((row) => row && row._id).filter(Boolean), [])
		})
		Object.entries(activeBatch.deletions || {}).forEach(([table, ids]) => {
			applyIds(upserts, deletions, table, [], ids)
		})
	}
	dirtyDeletions.forEach((ids, table) => applyIds(upserts, deletions, table, [], Array.from(ids)))
	dirtyUpserts.forEach((ids, table) => applyIds(upserts, deletions, table, Array.from(ids), []))
	return { upserts, deletions }
}

function mapToObject(map) {
	const data = {}
	map.forEach((ids, table) => {
		if (ids.size) data[table] = Array.from(ids)
	})
	return data
}

function persistPendingChanges() {
	const pending = pendingIdMaps()
	const payload = {
		upserts: mapToObject(pending.upserts),
		deletions: mapToObject(pending.deletions)
	}
	if (!Object.keys(payload.upserts).length && !Object.keys(payload.deletions).length) {
		removeStoredValue(PENDING_SYNC_KEY)
		return
	}
	writeStoredValue(PENDING_SYNC_KEY, payload)
}

function hydratePendingChanges() {
	if (pendingHydrated) return
	const saved = readStoredValue(PENDING_SYNC_KEY) || {}
	Object.entries(saved.deletions || {}).forEach(([table, ids]) => {
		applyIds(dirtyUpserts, dirtyDeletions, table, [], Array.isArray(ids) ? ids : [])
	})
	Object.entries(saved.upserts || {}).forEach(([table, ids]) => {
		applyIds(dirtyUpserts, dirtyDeletions, table, Array.isArray(ids) ? ids : [], [])
	})
	pendingHydrated = true
}

function capturePendingLocalState() {
	const tables = {}
	const deletions = {}
	const pending = pendingIdMaps()
	pending.upserts.forEach((ids, table) => {
		const rows = Array.from(ids).map((id) => db.get(table, id)).filter(Boolean)
		if (rows.length) tables[table] = rows
	})
	pending.deletions.forEach((ids, table) => {
		if (ids.size) deletions[table] = Array.from(ids)
	})
	return { tables, deletions }
}

function scheduleFlush() {
	if (timer) clearTimeout(timer)
	timer = setTimeout(() => {
		timer = null
		flushDirtyTables()
	}, retryDelay)
}

export function markDirty(table, mutation = null) {
	if (!enabled || !table) return
	hydratePendingChanges()
	const upsertIds = mutation && Array.isArray(mutation.upsertIds)
		? mutation.upsertIds
		: db.list(table).map((row) => row && row._id).filter(Boolean)
	const deletedIds = mutation && Array.isArray(mutation.deletedIds) ? mutation.deletedIds : []
	const upserts = idsFor(dirtyUpserts, table)
	const deletions = idsFor(dirtyDeletions, table)

	deletedIds.forEach((id) => {
		if (!id) return
		upserts.delete(id)
		deletions.add(id)
	})
	upsertIds.forEach((id) => {
		if (!id) return
		deletions.delete(id)
		upserts.add(id)
	})
	if (!upserts.size) dirtyUpserts.delete(table)
	if (!deletions.size) dirtyDeletions.delete(table)
	retryDelay = 500
	scheduleFlush()
	persistPendingChanges()
}

function takePendingChanges() {
	const tables = {}
	const deletions = {}
	dirtyUpserts.forEach((ids, table) => {
		const rows = Array.from(ids).map((id) => db.get(table, id)).filter(Boolean)
		if (rows.length) tables[table] = stripWechatFields(table, rows)
	})
	dirtyDeletions.forEach((ids, table) => {
		if (ids.size) deletions[table] = Array.from(ids)
	})
	dirtyUpserts.clear()
	dirtyDeletions.clear()
	return { tables, deletions }
}

function restorePendingChanges(batch) {
	Object.entries(batch.tables).forEach(([table, rows]) => {
		const upserts = idsFor(dirtyUpserts, table)
		const deletions = dirtyDeletions.get(table)
		rows.forEach((row) => {
			if (row && row._id && !(deletions && deletions.has(row._id))) upserts.add(row._id)
		})
	})
	Object.entries(batch.deletions).forEach(([table, ids]) => {
		const deletions = idsFor(dirtyDeletions, table)
		const upserts = dirtyUpserts.get(table)
		ids.forEach((id) => {
			if (id && !(upserts && upserts.has(id))) deletions.add(id)
		})
	})
}

async function flushPendingChanges() {
	const batch = takePendingChanges()
	activeBatch = batch
	try {
		await pushTables(batch.tables, batch.deletions)
		activeBatch = null
		persistPendingChanges()
		lastSyncError = ''
		retryDelay = 500
		return true
	} catch (e) {
		activeBatch = null
		restorePendingChanges(batch)
		persistPendingChanges()
		rememberError(e)
		retryDelay = Math.min(retryDelay * 2, 30000)
		return false
	}
}

async function drainPendingChanges() {
	if (timer) { clearTimeout(timer); timer = null }
	try {
		hydratePendingChanges()
		while (hasPendingChanges()) {
			if (!(await flushPendingChanges())) return false
		}
		return true
	} catch (error) {
		rememberError(error)
		retryDelay = Math.min(retryDelay * 2, 30000)
		return false
	} finally {
		if (hasPendingChanges()) scheduleFlush()
	}
}

export function flushDirtyTables() {
	if (flushPromise) return flushPromise
	// Serialize pushes and pulls: a delayed pull must not replace a just-acknowledged edit.
	flushPromise = enqueueSync(drainPendingChanges).finally(() => { flushPromise = null })
	return flushPromise
}

export async function saveRemoteChanges() {
	if (!(await flushDirtyTables())) throw new Error(lastSyncError || '尚未写入服务器，请重试')
	if (typeof uni.$emit === 'function') uni.$emit('sqms:synced')
	return true
}

async function runRemoteSync() {
	// 启动拉取尚未结束时也要追踪新录入，不能漏掉这段时间的修改。
	enableRemoteSync(true)
	try {
		hydratePendingChanges()
		// Saving is independent of downloading the cache. A failed pull must not block uploads.
		if (!(await drainPendingChanges())) return false
		const data = await syncFromRemote()
		const remoteCount = TABLES.reduce((count, table) => {
			return count + (Array.isArray(data[table]) ? data[table].length : 0)
		}, 0)
		if (remoteCount > 0 && data.__preservedTables && Object.keys(data.__preservedTables).length) {
			await pushTables(data.__preservedTables)
		}
		if (!(await drainPendingChanges())) return false
		lastSyncError = ''
		if (typeof uni.$emit === 'function') uni.$emit('sqms:synced')
		return true
	} catch (e) {
		rememberError(e)
		enableRemoteSync(true)
		try { persistPendingChanges() } catch (storageError) { rememberError(storageError) }
		if (hasPendingChanges()) scheduleFlush()
		return false
	}
}

export function refreshRemoteSync() {
	if (refreshPromise) return refreshPromise
	refreshPromise = enqueueSync(runRemoteSync).finally(() => { refreshPromise = null })
	return refreshPromise
}

export function bootstrapRemoteSync() {
	return refreshRemoteSync()
}
