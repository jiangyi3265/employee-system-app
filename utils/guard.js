import { getSession } from '@/utils/auth.js'
import { ROLE } from '@/store/schema.js'

const PUBLIC_ROUTES = new Set([
	'pages/login/login',
	'pages/login/register'
])

const COMMON_ROUTES = new Set([
	'pages/index/index',
	'pages/mine/mine',
	'pages/message/list',
	'pages/message/chat',
	'pages/customer/contact'
])

const CUSTOMER_ROUTES = new Set([
	'pages/customer/products',
	'pages/customer/product-detail',
	'pages/customer/cart',
	'pages/customer/request-detail',
	'pages/customer/orders',
	'pages/customer/suggest'
])

const STAFF_ROUTES = new Set([
	'pages/product/list',
	'pages/product/detail',
	'pages/product/settings',
	'pages/price/query',
	'pages/quote/list',
	'pages/quote/detail',
	'pages/quote/select',
	'pages/quote/export',
	'pages/follow/index',
	'pages/follow/customer',
	'pages/follow/add',
	'pages/purchase/list',
	'pages/purchase/detail',
	'pages/archive/customer',
	'pages/archive/customer-detail',
	'pages/archive/supplier',
	'pages/archive/competitor',
	'pages/archive/competitor-quote-edit',
	'pages/archive/edit',
	'pages/admin/requests',
	'pages/admin/request-detail'
])

const ADMIN_ROUTES = new Set([
	'pages/archive/employee',
	'pages/admin/suggestions',
	'pages/admin/stats'
])

let redirecting = false

function normalizeRoute(route) {
	return (route || '').replace(/^\//, '')
}

export function canAccess(route, session) {
	const path = normalizeRoute(route)
	if (PUBLIC_ROUTES.has(path)) return true
	if (!session) return false
	if (COMMON_ROUTES.has(path)) return true
	if (session.role === ROLE.CUSTOMER) return CUSTOMER_ROUTES.has(path)
	if (session.role === ROLE.ADMIN) return STAFF_ROUTES.has(path) || ADMIN_ROUTES.has(path)
	if (session.role === ROLE.EMPLOYEE) return STAFF_ROUTES.has(path)
	return false
}

export function guardCurrentPage() {
	const pages = getCurrentPages()
	const page = pages[pages.length - 1]
	const route = normalizeRoute(page && page.route)
	if (!route || redirecting) return true
	const session = getSession()
	if (canAccess(route, session)) return true

	redirecting = true
	if (!session) {
		uni.redirectTo({ url: '/pages/login/login' })
	} else {
		uni.showToast({ title: '无权访问该页面', icon: 'none' })
		uni.switchTab({ url: '/pages/index/index' })
	}
	setTimeout(() => { redirecting = false }, 350)
	return false
}
