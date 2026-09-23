const assert = require('node:assert/strict')
const { execSync } = require('node:child_process')
const { createRequire } = require('node:module')
const path = require('node:path')
const os = require('node:os')

const globalRequire = createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/')
const { chromium } = (() => {
	try { return require('playwright') } catch (_) { return globalRequire('playwright') }
})()

async function main() {
	const browser = await chromium.launch({ headless: true })
	const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
	const page = await context.newPage()
	const errors = []
	page.on('pageerror', (error) => errors.push(error.message))
	page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
	page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`))

	const now = Date.now()
	const data = {
		employees: [{ _id: 'admin', role: 'admin', name: '管理员', phone: '13000000000', password: 'test' }],
		customers: [{ _id: 'c', approved: true, name: '测试客户' }],
		products: [{ _id: 'p', name: '测试商品', unitSmall: '个', unitMedium: '包', unitLarge: '箱', mediumToSmall: 12, largeToMedium: 12, purchasePrice: 10, suggestPrice: 20 }],
		suppliers: [{ _id: 's', name: '测试供货商' }],
		quoteOrders: [{ _id: 'q', createTime: now - 1000, dealStatus: 'pending', customerName: '测试客户', employeeId: 'other', employeeName: '员工乙' }],
		quoteItems: [{ _id: 'qi', orderId: 'q', customerId: 'c', employeeId: 'other', status: 'pending', productId: 'p', price: 30, costPrice: 10, qty: 1 }],
		purchaseOrders: [{ _id: 'po', createTime: now - 86400000, status: 'pre', supplierId: 's', supplierName: '测试供货商', employeeId: 'other', employeeName: '员工乙', freight: 0 }],
		purchaseItems: [{ _id: 'pi', purchaseOrderId: 'po', productId: 'p', productName: '测试商品', qty: 1 }],
		purchaseRequests: [{ _id: 'pr', createTime: now - 86400000, status: 'pending', employeeId: 'other', employeeName: '员工乙', customerId: 'c', customerName: '测试客户' }],
		purchaseRequestItems: [{ _id: 'pri', requestId: 'pr', status: 'pending', productId: 'p', productName: '测试商品', supplierId: 's', supplierName: '测试供货商', customerId: 'c', customerName: '测试客户', qty: 1, purchasePrice: 10, salePrice: 20 }]
	}
	await page.route('**/sqms/**', async (route) => {
		const url = route.request().url()
		const payload = url.includes('/auth/login')
			? { code: 200, session: { role: 'admin', id: 'admin', name: '管理员' }, user: data.employees[0] }
			: url.includes('/sync/pull')
				? { code: 200, data: { ...data, serverTime: Date.now() } }
				: { code: 200, data: {} }
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
	})

	await page.goto('http://127.0.0.1:5173/#/pages/login/login', { waitUntil: 'domcontentloaded' })
	await page.getByText('我已阅读并同意').click()
	await page.locator('input[type=number]').fill('13000000000')
	await page.locator('input[type=password]').fill('test')
	await page.getByText('登录', { exact: true }).click()
	await page.waitForTimeout(800)
	await page.goto('http://127.0.0.1:5173/#/pages/purchase/request', { waitUntil: 'domcontentloaded' })
	await page.getByText('全部员工采购汇总').waitFor()
	await page.getByText('员工乙', { exact: false }).first().waitFor()
	assert.match(await page.locator('body').innerText(), /测试客户/)
	await page.screenshot({ path: path.join(os.tmpdir(), 'sqms-purchase-request-mobile.png'), fullPage: true })

	await page.goto('http://127.0.0.1:5173/#/pages/purchase/list', { waitUntil: 'domcontentloaded' })
	await page.getByText('查看所有员工的采购订单').waitFor()
	assert.match(await page.locator('body').innerText(), /测试供货商/)

	await page.goto('http://127.0.0.1:5173/#/pages/quote/list', { waitUntil: 'domcontentloaded' })
	await page.getByText('测试客户').first().waitFor()
	assert.match(await page.locator('body').innerText(), /30\.00/)
	assert.deepEqual(errors, [])
	await browser.close()
	console.log('H5 purchase and quote checks passed')
}

main().catch((error) => { console.error(error); process.exit(1) })
