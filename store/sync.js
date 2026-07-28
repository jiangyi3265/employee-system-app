import { db, setWriteListener } from './db.js'
import { T } from './schema.js'
import { pullAll, pushTables } from './remote.js'

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
let activeBatch = null
let pendingHydrated = false
const dirtyUpserts = new Map()
const dirtyDeletions = new Map()

setWriteListener(markDirty)

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
		TABLES.forEach((table) => {
			db.setAll(table, [], true)
		})
		uni.setStorageSync(LAST_PULL_KEY, data.serverTime || Date.now())
		return data
	}
	TABLES.forEach((table) => {
		if (Array.isArray(data[table])) {
			if (PRESERVE_WHEN_REMOTE_EMPTY.has(table) && data[table].length === 0 && db.count(table) > 0) {
				preservedTables[table] = stripWechatFields(table, db.list(table))
				return
			}
			db.setAll(table, data[table], true)
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
		uni.removeStorageSync(PENDING_SYNC_KEY)
		return
	}
	uni.setStorageSync(PENDING_SYNC_KEY, payload)
}

function hydratePendingChanges() {
	if (pendingHydrated) return
	pendingHydrated = true
	const saved = uni.getStorageSync(PENDING_SYNC_KEY) || {}
	Object.entries(saved.deletions || {}).forEach(([table, ids]) => {
		applyIds(dirtyUpserts, dirtyDeletions, table, [], Array.isArray(ids) ? ids : [])
	})
	Object.entries(saved.upserts || {}).forEach(([table, ids]) => {
		applyIds(dirtyUpserts, dirtyDeletions, table, Array.isArray(ids) ? ids : [], [])
	})
}

function capturePendingLocalState() {
	const tables = {}
	const deletions = {}
	dirtyUpserts.forEach((ids, table) => {
		const rows = Array.from(ids).map((id) => db.get(table, id)).filter(Boolean)
		if (rows.length) tables[table] = rows
	})
	dirtyDeletions.forEach((ids, table) => {
		if (ids.size) deletions[table] = Array.from(ids)
	})
	return { tables, deletions }
}

function reapplyPendingLocalState(batch) {
	const tableNames = new Set([
		...Object.keys(batch.tables || {}),
		...Object.keys(batch.deletions || {})
	])
	tableNames.forEach((table) => {
		const rowsById = new Map(db.list(table).map((row) => [row._id, row]))
		;(batch.deletions[table] || []).forEach((id) => rowsById.delete(id))
		;(batch.tables[table] || []).forEach((row) => {
			if (row && row._id) rowsById.set(row._id, row)
		})
		db.setAll(table, Array.from(rowsById.values()), true)
	})
}

function scheduleFlush() {
	if (timer) clearTimeout(timer)
	timer = setTimeout(() => {
		timer = null
		flushDirtyTables()
	}, 500)
}

export function markDirty(table, mutation = null) {
	if (!enabled || !table) return
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
	persistPendingChanges()
	scheduleFlush()
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
	} catch (e) {
		activeBatch = null
		restorePendingChanges(batch)
		persistPendingChanges()
		console.warn('SQMS sync failed:', e && e.message ? e.message : e)
	} finally {
		flushPromise = null
		if (hasPendingChanges()) scheduleFlush()
	}
}

export function flushDirtyTables() {
	if (flushPromise) return flushPromise
	if (!hasPendingChanges()) return Promise.resolve()
	flushPromise = flushPendingChanges()
	return flushPromise
}

export async function bootstrapRemoteSync() {
	hydratePendingChanges()
	const pendingLocalState = capturePendingLocalState()
	try {
		const data = await syncFromRemote()
		reapplyPendingLocalState(pendingLocalState)
		enableRemoteSync(true)
		const remoteCount = TABLES.reduce((count, table) => {
			return count + (Array.isArray(data[table]) ? data[table].length : 0)
		}, 0)
		if (remoteCount > 0 && data.__preservedTables && Object.keys(data.__preservedTables).length) {
			await pushTables(data.__preservedTables)
		}
		if (hasPendingChanges()) await flushDirtyTables()
		return true
	} catch (e) {
		console.warn('SQMS remote unavailable, using local data:', e && e.message ? e.message : e)
		enableRemoteSync(true)
		persistPendingChanges()
		if (hasPendingChanges()) scheduleFlush()
		return false
	}
}
