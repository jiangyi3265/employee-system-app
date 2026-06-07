const DEFAULT_BASE_URL = typeof window !== 'undefined' && window.location?.origin
	? window.location.origin
	: 'http://localhost:8080'

export const API_BASE_KEY = 'sqms_api_base'

export function getApiBase() {
	return uni.getStorageSync(API_BASE_KEY) || DEFAULT_BASE_URL
}

export function setApiBase(url) {
	uni.setStorageSync(API_BASE_KEY, url || DEFAULT_BASE_URL)
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

export function registerRemote(data) {
	return apiRequest('/sqms/auth/register', {
		method: 'POST',
		data
	})
}
