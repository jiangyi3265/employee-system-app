import { fmtMoney } from './format.js'

export function enableShareMenu() {
	if (typeof uni === 'undefined' || typeof uni.showShareMenu !== 'function') return
	try {
		uni.showShareMenu({
			withShareTicket: true,
			menus: ['shareAppMessage']
		})
	} catch (e) {
		// 非微信端或低版本环境不支持时忽略，页面仍可正常使用。
	}
}

export function productShare(product, fallbackPath = '/pages/customer/products') {
	const item = product || {}
	const id = item._id || ''
	const price = Number(item.suggestPrice || item.retailPrice || 0)
	const titleParts = [item.name || '商品展厅']
	if (item.spec) titleParts.push(item.spec)
	if (price > 0) titleParts.push(fmtMoney(price))
	return {
		title: titleParts.join(' · '),
		path: id ? `/pages/customer/product-detail?id=${encodeURIComponent(id)}` : fallbackPath
	}
}
