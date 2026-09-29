// Manual read-only check: production records stay in memory and are never sent back.
import assert from 'node:assert/strict'
const storage = new Map()
let peakBytes = 0
globalThis.uni = {
	getStorageSync: (key) => structuredClone(storage.get(key)),
	setStorageSync(key, value) {
		const size = Buffer.byteLength(JSON.stringify(value))
		assert.ok(size < 1024 * 1024, 'each storage entry must fit under 1 MB')
		const total = [...storage.entries()].reduce((sum, [k, v]) => sum + (k === key ? 0 : Buffer.byteLength(JSON.stringify(v))), size)
		assert.ok(total < 10 * 1024 * 1024, 'cache including staged chunks must fit under 10 MB')
		peakBytes = Math.max(peakBytes, total)
		storage.set(key, structuredClone(value))
	},
	removeStorageSync: (key) => storage.delete(key)
}
const response = await fetch('https://www.wsh1798.cn/sqms/sync/pull')
assert.equal(response.status, 200)
const payload = await response.json()
assert.equal(payload.code, 200)
const { db } = await import('../store/db.js')
const tables = Object.entries(payload.data).filter(([, rows]) => Array.isArray(rows))
for (let pass = 0; pass < 2; pass++) {
	for (const [table, rows] of tables) db.setAll(table, rows, true)
}
const { db: reopened } = await import('../store/db.js?reopened')
for (const [table, rows] of tables) assert.deepEqual(reopened.list(table), rows)
console.log(JSON.stringify({ tables: tables.length, quotes: db.count('quoteOrders'), quoteItems: db.count('quoteItems'), follows: db.count('follows'), peakBytes, passed: true }))
