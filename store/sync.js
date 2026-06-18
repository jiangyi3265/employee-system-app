import { db, setWriteListener } from './db.js'
import { T } from './schema.js'
import { pullAll, pushTables } from './remote.js'

const TABLES = Object.values(T)
const LAST_PULL_KEY = 'sqms_last_pull_time'
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
const dirtyTables = new Set()

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

export function markDirty(table) {
	if (!enabled || !table) return
	dirtyTables.add(table)
	if (timer) clearTimeout(timer)
	timer = setTimeout(flushDirtyTables, 500)
}

export async function flushDirtyTables() {
	if (!dirtyTables.size) return
	const tables = {}
	dirtyTables.forEach((table) => {
		tables[table] = stripWechatFields(table, db.list(table))
	})
	dirtyTables.clear()
	try {
		await pushTables(tables)
	} catch (e) {
		Object.keys(tables).forEach((table) => dirtyTables.add(table))
		console.warn('SQMS sync failed:', e && e.message ? e.message : e)
	}
}

export async function bootstrapRemoteSync() {
	try {
		const data = await syncFromRemote()
		enableRemoteSync(true)
		const remoteCount = TABLES.reduce((count, table) => {
			return count + (Array.isArray(data[table]) ? data[table].length : 0)
		}, 0)
		if (remoteCount === 0) {
			return true
		} else if (data.__preservedTables && Object.keys(data.__preservedTables).length) {
			await pushTables(data.__preservedTables)
		}
		return true
	} catch (e) {
		console.warn('SQMS remote unavailable, using local data:', e && e.message ? e.message : e)
		enableRemoteSync(false)
		return false
	}
}
