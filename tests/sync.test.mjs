import assert from 'node:assert/strict'
import test from 'node:test'

const storage = new Map()
const pulls = []
const pushes = []
const events = []

globalThis.uni = {
	getStorageSync(key) { return storage.get(key) },
	setStorageSync(key, value) { storage.set(key, value) },
	removeStorageSync(key) { storage.delete(key) },
	$emit(name) { events.push(name) },
	request(options) {
		if (options.url.endsWith('/sqms/sync/pull')) {
			pulls.push(options)
			return
		}
		if (options.url.endsWith('/sqms/sync/push')) {
			pushes.push(options.data)
			options.success({ statusCode: 200, data: { code: 200 } })
			return
		}
		throw new Error(`Unexpected request: ${options.url}`)
	}
}

const { db } = await import('../store/db.js')
const { T } = await import('../store/schema.js')
const { refreshRemoteSync } = await import('../store/sync.js')

function answerPull(data) {
	const request = pulls.shift()
	assert.ok(request, 'expected a pending pull')
	request.success({ statusCode: 200, data: { code: 200, data: { ...data, serverTime: 123 } } })
}

test('refresh deduplicates requests and fills quote and purchase caches', async () => {
	const first = refreshRemoteSync()
	const second = refreshRemoteSync()
	assert.strictEqual(first, second)
	assert.equal(pulls.length, 1)
	answerPull({
		[T.EMPLOYEE]: [{ _id: 'admin', role: 'admin' }],
		[T.QUOTE_ORDER]: [{ _id: 'quote', employeeId: 'worker' }],
		[T.QUOTE_ITEM]: [{ _id: 'line', orderId: 'quote', price: 193.95, qty: 1 }],
		[T.PURCHASE_ORDER]: [{ _id: 'purchase', employeeId: 'worker' }]
	})
	assert.equal(await first, true)
	assert.equal(db.count(T.QUOTE_ORDER), 1)
	assert.equal(db.get(T.QUOTE_ITEM, 'line').price, 193.95)
	assert.equal(db.count(T.PURCHASE_ORDER), 1)
	assert.ok(events.includes('sqms:synced'))
})

test('a local edit made during pull survives and is uploaded', async () => {
	const refresh = refreshRemoteSync()
	db.insert(T.QUOTE_ITEM, { _id: 'new-line', orderId: 'quote', price: 55, qty: 1 })
	answerPull({
		[T.EMPLOYEE]: [{ _id: 'admin', role: 'admin' }],
		[T.QUOTE_ORDER]: [{ _id: 'quote', employeeId: 'worker' }],
		[T.QUOTE_ITEM]: [{ _id: 'line', orderId: 'quote', price: 193.95, qty: 1 }]
	})
	assert.equal(await refresh, true)
	assert.equal(db.get(T.QUOTE_ITEM, 'new-line').price, 55)
	assert.ok(pushes.some((payload) => (payload.tables.quoteItems || []).some((row) => row._id === 'new-line')))
})

test('an empty server response does not erase local records', async () => {
	const refresh = refreshRemoteSync()
	answerPull({})
	assert.equal(await refresh, false)
	assert.equal(db.count(T.QUOTE_ORDER), 1)
	assert.equal(db.get(T.QUOTE_ITEM, 'new-line').price, 55)
})
