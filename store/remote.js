const PRODUCTION_BASE_URL = 'https://www.wsh1798.cn'
const h5Origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''
const DEFAULT_BASE_URL = h5Origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(h5Origin)
	? h5Origin
	: PRODUCTION_BASE_URL

export const API_BASE_KEY = 'sqms_api_base'

function normalizeBaseUrl(url) {
	return String(url || '').trim().replace(/\/+$/, '')
}

function isLocalDebugBase(url) {
	return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(url)
}

function isHttpsBase(url) {
	return /^https:\/\//i.test(url)
}

export function getApiBase() {
	const saved = normalizeBaseUrl(uni.getStorageSync(API_BASE_KEY))
	if (saved && !isLocalDebugBase(saved) && isHttpsBase(saved)) return saved
	if (saved) uni.removeStorageSync(API_BASE_KEY)
	return DEFAULT_BASE_URL
}

export function setApiBase(url) {
	const next = normalizeBaseUrl(url)
	uni.setStorageSync(API_BASE_KEY, next && (isLocalDebugBase(next) || isHttpsBase(next)) ? next : DEFAULT_BASE_URL)
}

export function apiRequest(path, options = {}) {
	return new Promise((resolve, reject) => {
		uni.request({
			url: getApiBase() + path,
			method: options.method || 'GET',
			data: options.data || undefined,
			header: {
				'Content-Type': 'application/json',
				...(options.header || {})
			},
			success: (res) => {
				const data = res.data || {}
				if (res.statusCode >= 200 && res.statusCode < 300 && (data.code == null || data.code === 200)) {
					resolve(data)
				} else {
					reject(new Error(data.msg || `请求失败 ${res.statusCode}`))
				}
			},
			fail: reject
		})
	})
}

export function pullAll() {
	return apiRequest('/sqms/sync/pull')
}

export function pushTables(tables) {
	return apiRequest('/sqms/sync/push', {
		method: 'POST',
		data: { tables }
	})
}

export function loginRemote(role, phone, password) {
	return apiRequest('/sqms/auth/login', {
		method: 'POST',
		data: { role, phone, password }
	})
}

export function loginWechatRemote(role, code, phone = '', password = '') {
	return apiRequest('/sqms/auth/login/wechat', {
		method: 'POST',
		data: { role, code, phone, password }
	})
}

export function registerRemote(data) {
	return apiRequest('/sqms/auth/register', {
		method: 'POST',
		data
	})
}
