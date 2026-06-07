/**
 * 本地存储数据层 (data layer)
 * 基于 uni.storage 的通用 CRUD 封装。
 * 所有数据访问都通过此层，后期可平滑替换为 uniCloud / 自建后端。
 */

const PREFIX = 'sqms_' // sales quotation management system
let writeListener = null

function readTable(table) {
	const raw = uni.getStorageSync(PREFIX + table)
	if (!raw) return []
	try {
		return typeof raw === 'string' ? JSON.parse(raw) : raw
	} catch (e) {
		return []
	}
}

function writeTable(table, list, silent = false) {
	uni.setStorageSync(PREFIX + table, list)
	if (!silent && typeof writeListener === 'function') writeListener(table)
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
		return list
	},

	/** 按 id 获取单条 */
	get(table, id) {
		return readTable(table).find((r) => r._id === id) || null
	},

	/** 自定义查找第一条 */
	find(table, filter) {
		return readTable(table).find((r) => match(r, filter)) || null
	},

	/** 统计数量 */
	count(table, filter) {
		return readTable(table).filter((r) => match(r, filter)).length
	},

	/** 新增一条，自动生成 _id 与时间戳 */
	insert(table, record) {
		const list = readTable(table)
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
		writeTable(table, list)
		return item
	},

	/** 批量新增 */
	insertMany(table, records) {
		return records.map((r) => this.insert(table, r))
	},

	/** 按 id 更新（合并 patch） */
	update(table, id, patch) {
		const list = readTable(table)
		const idx = list.findIndex((r) => r._id === id)
		if (idx === -1) return null
		list[idx] = { ...list[idx], ...patch, _id: id, updateTime: Date.now() }
		writeTable(table, list)
		return list[idx]
	},

	/** 按 id 删除 */
	remove(table, id) {
		const list = readTable(table)
		const next = list.filter((r) => r._id !== id)
		writeTable(table, next)
		return list.length !== next.length
	},

	/** 按条件删除 */
	removeWhere(table, filter) {
		const list = readTable(table)
		const next = list.filter((r) => !match(r, filter))
		writeTable(table, next)
		return list.length - next.length
	},

	/** 覆盖整张表 */
	setAll(table, list, silent = false) {
		writeTable(table, list, silent)
	},

	genId
}

export { genId, PREFIX }

export function setWriteListener(listener) {
	writeListener = listener
}
