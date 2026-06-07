/**
 * 通用工具函数
 */

/** 时间戳格式化 */
export function fmtDate(ts, withTime = false) {
	if (!ts) return ''
	const d = new Date(ts)
	const p = (n) => (n < 10 ? '0' + n : '' + n)
	const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
	if (!withTime) return date
	return `${date} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 金额格式化 */
export function fmtMoney(n) {
	const v = Number(n) || 0
	return '¥' + v.toFixed(2)
}

/** 距今天数 */
export function daysSince(ts) {
	if (!ts) return Infinity
	const diff = Date.now() - ts
	return Math.floor(diff / (24 * 3600 * 1000))
}

/** 今日 0 点时间戳 */
export function todayStart() {
	const d = new Date()
	d.setHours(0, 0, 0, 0)
	return d.getTime()
}

export function toast(title, icon = 'none') {
	uni.showToast({ title, icon })
}

export function confirmDialog(content, title = '提示', options = {}) {
	return new Promise((resolve) => {
		uni.showModal({
			title,
			content,
			...options,
			success: (res) => resolve(res.confirm),
			fail: () => resolve(false)
		})
	})
}

/** 跳转 */
export function go(url) {
	uni.navigateTo({ url })
}
export function redirect(url) {
	uni.redirectTo({ url })
}
export function switchTabTo(url) {
	uni.switchTab({ url })
}
export function back() {
	uni.navigateBack()
}

/** 数组求和 */
export function sumBy(list, key) {
	return (list || []).reduce((s, it) => s + (Number(typeof key === 'function' ? key(it) : it[key]) || 0), 0)
}
