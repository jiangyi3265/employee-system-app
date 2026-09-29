/**
 * 本地存储数据层 (data layer)
 * 本地缓存支持分块，业务修改通过同步队列写入服务端。
 */

import { readStoredValue, writeStoredValue } from './storage.js'

const PREFIX = 'sqms_' // sales quotation management system
let writeListener = null
const tableCache = new Map()

function copy(value) {
	return value == null ? value : JSON.parse(JSON.stringify(value))
}

function readTable(table) {
	if (tableCache.has(table)) return tableCache.get(table)
	const raw = readStoredValue(PREFIX + table)
	if (!raw) return []
	try {
		const rows = typeof raw === 'string' ? JSON.parse(raw) : raw
		if (!Array.isArray(rows)) throw new Error('invalid table')
		tableCache.set(table, rows)
		return rows
	} catch (e) {
		return []
	}
}

function writeTable(table, list, silent = false, mutation = null) {
	writeStoredValue(PREFIX + table, list)
	tableCache.set(table, copy(list))
	if (!silent && typeof writeListener === 'function') writeListener(table, mutation)
}

function genId(prefix) {
	return (prefix || 'id') + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
}

/** 简单的字段匹配过滤 */
function match(record, filter) {
	if (!filter) return true
	return Object.keys(filter).every((k) => {
		const v = filter[k]
		if (typeof v === 'function') return v(record[k], record)
		return record[k] === v
	})
}

export const db = {
	/** 读取整张表（可选过滤 + 排序） */
	list(table, filter, sortBy, desc = false) {
		let list = readTable(table).filter((r) => match(r, filter))
		if (sortBy) {
			list = list.slice().sort((a, b) => {
				const x = a[sortBy]
				const y = b[sortBy]
				if (x === y) return 0
				return (x > y ? 1 : -1) * (desc ? -1 : 1)
			})
		}
		return copy(list)
	},

	/** 按 id 获取单条 */
	get(table, id) {
		return copy(readTable(table).find((r) => r._id === id) || null)
	},

	/** 自定义查找第一条 */
	find(table, filter) {
		return copy(readTable(table).find((r) => match(r, filter)) || null)
	},

	/** 统计数量 */
	count(table, filter) {
		return readTable(table).filter((r) => match(r, filter)).length
	},

	/** 新增一条，自动生成 _id 与时间戳 */
	insert(table, record) {
		const list = readTable(table).slice()
		const now = Date.now()
		const item = {
			_id: record._id || genId(table),
			createTime: record.createTime || now,
			updateTime: now,
			...record
		}
		// 确保 _id 不被覆盖丢失
		if (!item._id) item._id = genId(table)
		list.push(item)
		writeTable(table, list, false, { upsertIds: [item._id], deletedIds: [] })
		return item
	},

	/** 批量新增 */
	insertMany(table, records) {
		return records.map((r) => this.insert(table, r))
	},

	/** 按 id 更新（合并 patch） */
	update(table, id, patch) {
		const list = readTable(table).slice()
		const idx = list.findIndex((r) => r._id === id)
		if (idx === -1) return null
		list[idx] = { ...list[idx], ...patch, _id: id, updateTime: Date.now() }
		writeTable(table, list, false, { upsertIds: [id], deletedIds: [] })
		return list[idx]
	},

	/** 按 id 删除 */
	remove(table, id) {
		const list = readTable(table)
		const next = list.filter((r) => r._id !== id)
		const removed = list.length !== next.length
		if (removed) writeTable(table, next, false, { upsertIds: [], deletedIds: [id] })
		return removed
	},

	/** 按条件删除 */
	removeWhere(table, filter) {
		const list = readTable(table)
		const removedIds = list.filter((r) => match(r, filter)).map((r) => r._id).filter(Boolean)
		if (!removedIds.length) return 0
		const removedSet = new Set(removedIds)
		const next = list.filter((r) => !removedSet.has(r._id))
		writeTable(table, next, false, { upsertIds: [], deletedIds: removedIds })
		return removedIds.length
	},

	/** 覆盖整张表 */
	setAll(table, list, silent = false) {
		const next = Array.isArray(list) ? list : []
		if (silent) {
			writeTable(table, next, true)
			return
		}
		const previous = readTable(table)
		const nextIds = new Set(next.map((r) => r && r._id).filter(Boolean))
		const deletedIds = previous.map((r) => r && r._id).filter((id) => id && !nextIds.has(id))
		writeTable(table, next, false, {
			upsertIds: Array.from(nextIds),
			deletedIds
		})
	},

	genId
}

export { genId, PREFIX }

export function setWriteListener(listener) {
	writeListener = listener
}
