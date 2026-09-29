import assert from 'node:assert/strict'
import test from 'node:test'

const storage = new Map()
let writesBeforeFailure = Infinity
globalThis.uni = {
	getStorageSync(key) { return structuredClone(storage.get(key)) },
	setStorageSync(key, value) {
		if (--writesBeforeFailure < 0) throw new Error('simulated storage full')
		if (Buffer.byteLength(JSON.stringify(value)) > 1024 * 1024) throw new Error('exceed 1MB limit')
		storage.set(key, structuredClone(value))
	},
	removeStorageSync(key) { storage.delete(key) }
}
const { db } = await import('../store/db.js')

test('large quote and follow tables survive the mini-program 1MB per-key limit', () => {
	const quotes = Array.from({ length: 2900 }, (_, i) => ({ _id: `q${i}`, orderId: 'order', name: '报价商品'.repeat(45), price: 20, qty: 2 }))
	const follows = Array.from({ length: 5108 }, (_, i) => ({ _id: `f${i}`, text: '客户跟进'.repeat(45) }))
	assert.throws(() => uni.setStorageSync('legacy', quotes), /1MB/)
	db.setAll('quoteItems', quotes, true)
	db.setAll('follows', follows, true)
	assert.deepEqual(db.list('quoteItems'), quotes)
	assert.deepEqual(db.list('follows'), follows)
	db.insert('quoteItems', { _id: 'new', orderId: 'order', price: 35, qty: 4 })
	assert.equal(db.count('quoteItems'), 2901)
	assert.equal(db.get('quoteItems', 'new').price, 35)
})

test('a partial cache write retains the previous snapshot and cleans incomplete chunks', () => {
	const beforeKeys = [...storage.keys()].sort()
	const before = db.list('quoteItems')
	writesBeforeFailure = 1
	assert.throws(() => db.setAll('quoteItems', before.concat({ _id: 'not-committed' }), true), /原有记录已保留/)
	writesBeforeFailure = Infinity
	assert.deepEqual(db.list('quoteItems'), before)
	assert.deepEqual([...storage.keys()].sort(), beforeKeys)
})

test('old single-key caches migrate on write without dropping unsynced rows', () => {
	uni.setStorageSync('sqms_purchaseItems', [{ _id: 'old', qty: 1 }])
	db.insert('purchaseItems', { _id: 'new', qty: 2 })
	assert.deepEqual(db.list('purchaseItems').map((r) => r._id), ['old', 'new'])
})
