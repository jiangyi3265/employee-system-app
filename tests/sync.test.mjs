import assert from 'node:assert/strict'
import test from 'node:test'

const storage = new Map()
const pulls = []
const pushes = []
const events = []
let pushHandler = null

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
			if (pushHandler) return pushHandler(options)
			options.success({ statusCode: 200, data: { code: 200 } })
			return
		}
		throw new Error(`Unexpected request: ${options.url}`)
	}
}

const { db } = await import('../store/db.js')
const { T } = await import('../store/schema.js')
const { refreshRemoteSync, saveRemoteChanges, flushDirtyTables } = await import('../store/sync.js')

async function tick() {
	await new Promise((resolve) => setImmediate(resolve))
}

function answerPull(data) {
	const request = pulls.shift()
	assert.ok(request, 'expected a pending pull')
	request.success({ statusCode: 200, data: { code: 200, data: { ...data, serverTime: 123 } } })
}

test('refresh deduplicates requests and fills quote and purchase caches', async () => {
	const first = refreshRemoteSync()
	const second = refreshRemoteSync()
	assert.strictEqual(first, second)
	await tick()
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
	await tick()
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
	await tick()
	answerPull({})
	assert.equal(await refresh, false)
	assert.equal(db.count(T.QUOTE_ORDER), 1)
	assert.equal(db.get(T.QUOTE_ITEM, 'new-line').price, 55)
})

test('save waits for acknowledgement and uploads edits made during an earlier push', async () => {
	const requests = []
	pushHandler = (request) => requests.push(request)
	db.insert(T.QUOTE_ITEM, { _id: 'continuous-1', orderId: 'quote', price: 10, qty: 1 })
	let saved = false
	const saving = saveRemoteChanges().then(() => { saved = true })
	await tick()
	assert.equal(saved, false)
	db.insert(T.QUOTE_ITEM, { _id: 'continuous-2', orderId: 'quote', price: 20, qty: 2 })
	requests.shift().success({ statusCode: 200, data: { code: 200 } })
	await tick()
	assert.equal(saved, false)
	assert.equal(requests[0].data.tables.quoteItems[0]._id, 'continuous-2')
	requests.shift().success({ statusCode: 200, data: { code: 200 } })
	await saving
	assert.equal(saved, true)
	pushHandler = null
})

test('failed save retains pending data for retry and never reports success', async () => {
	pushHandler = (request) => request.fail({ errMsg: 'offline' })
	db.insert(T.PURCHASE_ITEM, { _id: 'offline-purchase', purchaseOrderId: 'purchase', qty: 3 })
	await assert.rejects(saveRemoteChanges(), /offline/)
	assert.equal(db.get(T.PURCHASE_ITEM, 'offline-purchase').qty, 3)
	assert.ok(storage.get('sqms_pending_sync').upserts.purchaseItems.includes('offline-purchase'))
	pushHandler = null
	await saveRemoteChanges()
	assert.equal(storage.has('sqms_pending_sync'), false)
})

test('a delayed pull cannot erase an edit whose push completes during the refresh', async () => {
	const refresh = refreshRemoteSync()
	await tick()
	db.insert(T.QUOTE_ITEM, { _id: 'racing-edit', orderId: 'quote', price: 77, qty: 1 })
	const start = pushes.length
	const flush = flushDirtyTables()
	await tick()
	assert.equal(pushes.length, start, 'push waits until the older pull is applied')
	answerPull({ [T.QUOTE_ORDER]: [{ _id: 'quote' }], [T.QUOTE_ITEM]: [] })
	assert.equal(await refresh, true)
	assert.equal(await flush, true)
	assert.equal(db.get(T.QUOTE_ITEM, 'racing-edit').price, 77)
})

test('uploads finish even when the subsequent cache download fails', async () => {
	db.insert(T.PURCHASE_ITEM, { _id: 'save-before-pull', qty: 8 })
	const refresh = refreshRemoteSync()
	await tick()
	assert.ok(pushes.some((p) => p.tables.purchaseItems?.some((r) => r._id === 'save-before-pull')))
	pulls.shift().fail({ errMsg: 'download failed' })
	assert.equal(await refresh, false)
	assert.equal(storage.has('sqms_pending_sync'), false)
})
