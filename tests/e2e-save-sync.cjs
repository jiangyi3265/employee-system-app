const assert = require('node:assert/strict')
const { execSync } = require('node:child_process')
const { createRequire } = require('node:module')
const path = require('node:path')
const os = require('node:os')
const globalRequire = createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/')
const { chromium } = (() => { try { return require('playwright') } catch (_) { return globalRequire('playwright') } })()
const base = 'http://127.0.0.1:5173/'

async function main() {
	const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] })
	const now = Date.now()
	const tables = ['employees', 'customers', 'suppliers', 'competitors', 'products', 'quoteOrders', 'quoteItems', 'competitorQuotes', 'follows', 'purchaseOrders', 'purchaseItems', 'purchaseRequests', 'purchaseRequestItems', 'requestOrders', 'requestItems', 'suggestions', 'messages', 'settings']
	const data = Object.fromEntries(tables.map((table) => [table, []]))
	data.employees = [
		{ _id: 'worker', role: 'employee', name: '员工甲', phone: '13000000001', password: 'test', disabled: false },
		{ _id: 'admin', role: 'admin', name: '管理员', phone: '13000000000', password: 'test', disabled: false }
	]
	data.customers = [{ _id: 'c', approved: true, name: '同步测试客户' }]
	data.suppliers = [{ _id: 's', name: '同步测试供应商' }]
	data.products = [1, 2, 3].map((i) => ({ _id: `p${i}`, name: `同步商品${i}`, spec: '标准', unitSmall: '个', purchasePrice: 10, costPrice: 10, minPrice: 12, suggestPrice: 10 + i * 10 }))
	data.quoteOrders = [{ _id: 'q', customerId: 'c', customerName: '同步测试客户', employeeId: 'worker', employeeName: '员工甲', dealStatus: 'pending', createTime: now }]
	data.quoteItems = [{ _id: 'qi', orderId: 'q', productId: 'p1', productName: '同步商品1', customerId: 'c', employeeId: 'worker', status: 'pending', price: 20, costPrice: 10, qty: 1, unit: '个' }]
	data.quoteItems.push(...Array.from({ length: 2896 }, (_, i) => ({ _id: `history-${i}`, orderId: 'history', productName: '历史报价明细'.repeat(30), price: 5, qty: 1 })))
	data.follows = Array.from({ length: 5108 }, (_, i) => ({ _id: `follow-${i}`, orderId: 'history', content: '历史跟进记录'.repeat(30), createTime: now - 86400000 }))
	let failPush = false
	let holdPush = null
	const pageErrors = []
	let latestPage
	async function openAccount(phone) {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
		// Phone-password login is mocked; the unrelated external identity SDK is not under test.
		await context.route('https://cn-shanghai-aliyun-cloudauth.oss-cn-shanghai.aliyuncs.com/**', (route) => route.fulfill({ status: 200, body: '', contentType: 'text/javascript' }))
		await context.addInitScript(() => {
			const original = Storage.prototype.setItem
			Storage.prototype.setItem = function(key, value) {
				if (new TextEncoder().encode(value).length > 1024 * 1024) throw new Error('mini-program single-key limit exceeded')
				return original.call(this, key, value)
			}
		})
		await context.route('**/sqms/**', async (route) => {
			const url = route.request().url()
			let result
			if (url.endsWith('/auth/login')) {
				const user = data.employees.find((r) => r.phone === route.request().postDataJSON().phone)
				result = { code: 200, session: { id: user._id, role: user.role, name: user.name }, user }
			} else if (url.endsWith('/sync/pull')) {
				result = { code: 200, data: { ...structuredClone(data), serverTime: Date.now() } }
			} else if (url.endsWith('/sync/push')) {
				if (holdPush) await holdPush
				if (failPush) result = { code: 500, msg: '测试连接中断，请重试' }
				else {
					const payload = route.request().postDataJSON()
					for (const [table, rows] of Object.entries(payload.tables || {})) {
						const records = new Map(data[table].map((r) => [r._id, r]))
						rows.forEach((r) => records.set(r._id, r))
						data[table] = [...records.values()]
					}
					for (const [table, ids] of Object.entries(payload.deletions || {})) data[table] = data[table].filter((r) => !ids.includes(r._id))
					result = { code: 200, serverTime: Date.now() }
				}
			} else throw new Error(`Unexpected API request: ${url}`)
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) })
		})
		const page = await context.newPage()
		latestPage = page
		page.on('pageerror', (e) => pageErrors.push(e.message))
		page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()) })
		page.on('requestfailed', (r) => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) pageErrors.push(`${r.url()}: ${r.failure()?.errorText}`) })
		await page.goto(base + '#/pages/login/login', { waitUntil: 'domcontentloaded' })
		await page.getByText('我已阅读并同意').click()
		await page.locator('input[type=number]').fill(phone)
		await page.locator('input[type=password]').fill('test')
		await page.getByText('登录', { exact: true }).click()
		await page.waitForURL(base + '#/', { waitUntil: 'domcontentloaded' })
		console.log('Logged in:', userLabel(phone))
		return page
	}
	function userLabel(phone) { return phone.endsWith('1') ? 'worker' : 'admin' }
	try {
		const worker = await openAccount('13000000001')
		await worker.goto(base + '#/pages/quote/detail?id=q')
		await worker.getByText('正在同步报价明细…').waitFor({ state: 'hidden' })
		await worker.locator('.item-row input').first().fill('3')
		let release
		holdPush = new Promise((resolve) => { release = resolve })
		await worker.getByText('保存报价单', { exact: true }).click()
		await worker.getByText('正在保存到服务器…', { exact: true }).waitFor()
		assert.equal(data.quoteItems.find((r) => r._id === 'qi').qty, 1)
		holdPush = null
		release()
		await worker.getByText('已保存到服务器', { exact: true }).waitFor()
		assert.equal(data.quoteItems.find((r) => r._id === 'qi').qty, 3)
		console.log('Save waits for server acknowledgement: passed')
		for (const name of ['同步商品2', '同步商品3']) {
			await worker.getByText('+ 添加产品', { exact: true }).click()
			await worker.locator('input').first().fill(name)
			await worker.getByText('查看详情/智能报价', { exact: true }).click()
			await worker.getByText('选用此产品', { exact: true }).click()
			await worker.getByText('保存报价单', { exact: true }).waitFor()
		}
		await worker.getByText('保存报价单', { exact: true }).click()
		await worker.getByText('已保存到服务器', { exact: true }).waitFor()
		assert.equal(data.quoteItems.filter((r) => r.orderId === 'q').length, 3)

		failPush = true
		await worker.locator('.item-row input').first().fill('7')
		await worker.getByText('保存报价单', { exact: true }).click()
		await worker.getByText('保存尚未完成，请勿清理缓存', { exact: false }).waitFor()
		assert.equal(data.quoteItems.find((r) => r._id === 'qi').qty, 3)
		await worker.reload()
		await worker.getByText('正在同步报价明细…').waitFor({ state: 'hidden' })
		assert.equal(await worker.locator('.item-row input').first().inputValue(), '7')
		failPush = false
		await worker.getByText('保存报价单', { exact: true }).click()
		await worker.getByText('已保存到服务器', { exact: true }).waitFor()
		assert.equal(data.quoteItems.find((r) => r._id === 'qi').qty, 7)

		await worker.goto(base + '#/pages/purchase/detail')
		await worker.getByText('点击选择供应商', { exact: true }).click()
		await worker.locator('.picker-item').filter({ hasText: '同步测试供应商' }).click()
		for (const name of ['同步商品1', '同步商品2']) {
			await worker.getByText('+ 添加产品', { exact: true }).click()
			await worker.locator('.picker-item').filter({ hasText: name }).click()
		}
		await worker.locator('.item-row input').first().fill('2')
		await worker.getByText('保存采购单', { exact: true }).click()
		await worker.getByText('采购单已保存到服务器', { exact: true }).waitFor()
		const purchase = data.purchaseOrders[0]
		assert.equal(data.purchaseItems.filter((r) => r.purchaseOrderId === purchase._id).length, 2)
		assert.equal(data.purchaseItems.find((r) => r.productId === 'p1').qty, 2)
		console.log('Consecutive quotes, offline retry and linked purchase items: passed')

		await worker.goto(base + '#/pages/purchase/request')
		for (const qty of [4, 5]) {
			await worker.getByText('清空', { exact: true }).click()
			await worker.getByText('选择需求客户', { exact: true }).click()
			await worker.locator('.picker-item').filter({ hasText: '同步测试客户' }).click()
			await worker.getByText('可不选择', { exact: true }).click()
			await worker.locator('.picker-item').filter({ hasText: '同步测试供应商' }).click()
			for (const name of (qty === 4 ? ['同步商品1', '同步商品2'] : ['同步商品1'])) {
				await worker.getByText('+ 添加商品', { exact: true }).click()
				await worker.locator('.picker-item').filter({ hasText: name }).click()
			}
			await worker.locator('.request-item input').first().fill(String(qty))
			await worker.getByText('保存采购申请', { exact: true }).click()
			await worker.getByText('采购申请已保存到服务器', { exact: true }).waitFor()
			await worker.getByText('采购申请已保存到服务器', { exact: true }).waitFor({ state: 'hidden' })
		}
		assert.equal(data.purchaseRequests.length, 2)
		assert.equal(data.purchaseRequestItems.length, 3)

		const admin = await openAccount('13000000000')
		await admin.goto(base + '#/pages/quote/detail?id=q')
		await admin.locator('.item-row').first().waitFor()
		await admin.getByText('正在同步报价明细…').waitFor({ state: 'hidden' })
		assert.equal(await admin.locator('.item-row').count(), 3)
		assert.equal(await admin.locator('.item-row input').first().inputValue(), '7')
		await admin.screenshot({ path: path.join(os.tmpdir(), 'sqms-cross-account-quote.png'), fullPage: true })
		await admin.goto(base + '#/pages/purchase/detail?id=' + purchase._id)
		await admin.locator('.item-row').first().waitFor()
		await admin.getByText('正在同步采购明细…').waitFor({ state: 'hidden' })
		assert.equal(await admin.locator('.item-row').count(), 2)
		assert.equal(await admin.locator('.item-row input').first().inputValue(), '2')
		await admin.screenshot({ path: path.join(os.tmpdir(), 'sqms-cross-account-purchase.png'), fullPage: true })
		await admin.goto(base + '#/pages/purchase/request')
		await admin.getByText('全部员工采购汇总', { exact: true }).waitFor()
		await admin.getByText('正在更新服务器数据…').waitFor({ state: 'hidden' })
		assert.equal(await admin.locator('.summary-card').count(), 2)
		assert.equal(await admin.locator('.summary-item').count(), 3)
		await admin.screenshot({ path: path.join(os.tmpdir(), 'sqms-cross-account-requests.png'), fullPage: true })
		await admin.getByText('生成预采购单', { exact: true }).click()
		await admin.getByText('保存预采购单', { exact: true }).waitFor()
		const pre = data.purchaseOrders.find((row) => row.status === 'pre')
		assert.ok(pre)
		const merged = data.purchaseItems.filter((row) => row.purchaseOrderId === pre._id)
		assert.equal(merged.length, 2)
		assert.equal(merged.find((row) => row.productId === 'p1').qty, 9)
		assert.equal(merged.find((row) => row.productId === 'p1').sourcePurchaseRequestItemIds.length, 2)
		assert.deepEqual(pageErrors, [])
		console.log('PASS: large caches, save acknowledgement, consecutive quote entry, offline reload/retry, purchase parent links, independent admin login, all-employee requests and merged pre-purchases')
	} catch (error) {
		if (latestPage) {
			console.error('UI:', await latestPage.locator('body').innerText())
			console.error('Browser errors:', pageErrors)
			await latestPage.screenshot({ path: path.join(os.tmpdir(), 'sqms-save-test-failure.png'), fullPage: true })
		}
		throw error
	} finally { await browser.close() }
}
main().catch((error) => { console.error(error); process.exit(1) })
