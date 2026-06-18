/**
 * 登录 / 会话管理
 */
import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'
import { loginWechatRemote, bindWechatRemote, unbindWechatRemote } from '@/store/remote.js'

const SESSION_KEY = 'sqms_session'

/** 当前登录用户 { role, id, name } */
export function getSession() {
	const s = uni.getStorageSync(SESSION_KEY)
	if (!s) return null
	try {
		return typeof s === 'string' ? JSON.parse(s) : s
	} catch (e) {
		return null
	}
}

export function setSession(session) {
	uni.setStorageSync(SESSION_KEY, session)
}

export function clearSession() {
	uni.removeStorageSync(SESSION_KEY)
}

export function isLogin() {
	return !!getSession()
}

export function currentUser() {
	const s = getSession()
	if (!s) return null
	const table = s.role === ROLE.CUSTOMER ? T.CUSTOMER : T.EMPLOYEE
	return db.get(table, s.id)
}

/**
 * 员工/管理员登录：手机号 + 密码
 */
export function loginEmployee(phone, password) {
	const emp = db.find(T.EMPLOYEE, { phone })
	if (!emp) return { ok: false, msg: '该手机号未注册为员工' }
	if (emp.password !== password) return { ok: false, msg: '密码错误' }
	if (emp.disabled) return { ok: false, msg: '账号已停用' }
	const session = { role: emp.role || ROLE.EMPLOYEE, id: emp._id, name: emp.name }
	setSession(session)
	return { ok: true, session, user: emp }
}

/**
 * 客户登录：手机号 + 密码，需审核通过
 */
export function loginCustomer(phone, password) {
	const c = db.find(T.CUSTOMER, { phone })
	if (!c) return { ok: false, msg: '该手机号未注册' }
	if (c.password !== password) return { ok: false, msg: '密码错误' }
	if (!c.approved) return { ok: false, msg: '账号待管理员审核通过' }
	const session = { role: ROLE.CUSTOMER, id: c._id, name: c.name }
	setSession(session)
	return { ok: true, session, user: c }
}

function requestWechatLoginCode() {
	return new Promise((resolve, reject) => {
		if (typeof uni === 'undefined' || typeof uni.login !== 'function') {
			reject(new Error('请在微信小程序中使用微信登录'))
			return
		}
		uni.login({
			provider: 'weixin',
			success: (res) => {
				if (res && res.code) {
					resolve(res.code)
				} else {
					reject(new Error('微信未返回登录 code'))
				}
			},
			fail: (err) => {
				reject(new Error((err && err.errMsg) || '微信登录授权失败'))
			}
		})
	})
}

function cacheRemoteUser(role, user, password = '') {
	if (!user || !user._id) return null
	const table = role === ROLE.CUSTOMER ? T.CUSTOMER : T.EMPLOYEE
	const current = db.get(table, user._id)
	const next = { ...(current || {}), ...user }
	if (current && current.password) {
		next.password = current.password
	} else if (password) {
		next.password = password
	}
	const list = db.list(table)
	const idx = list.findIndex((item) => item._id === user._id)
	if (idx === -1) {
		list.push(next)
	} else {
		list[idx] = next
	}
	db.setAll(table, list, true)
	return next
}

/**
 * 微信小程序一键登录：客户首次自动注册，员工首次需手机号 + 密码绑定。
 */
export async function loginWechat(role) {
	try {
		const code = await requestWechatLoginCode()
		const data = await loginWechatRemote(role, code)
		const session = data.session
		if (!session || !session.id) {
			return { ok: false, msg: '服务器未返回登录会话' }
		}
		setSession(session)
		const cachedUser = cacheRemoteUser(session.role || role, data.user)
		return { ok: true, session, user: cachedUser || data.user }
	} catch (e) {
		return { ok: false, msg: (e && e.message) || '微信登录失败' }
	}
}

/**
 * 登录后主动绑定微信：校验手机号 + 密码，后端做"一个微信全局只绑一个账号"的唯一校验。
 */
export async function bindWechat(role, phone, password) {
	try {
		const code = await requestWechatLoginCode()
		const data = await bindWechatRemote(role, phone, password, code)
		if (data.session && data.session.id) setSession(data.session)
		const cachedUser = cacheRemoteUser((data.session && data.session.role) || role, data.user, password)
		return { ok: true, user: cachedUser || data.user }
	} catch (e) {
		return { ok: false, msg: (e && e.message) || '微信绑定失败' }
	}
}

/**
 * 解绑微信：校验手机号 + 密码后，清除服务端及本地缓存的微信绑定字段。
 */
export async function unbindWechat(role, phone, password) {
	try {
		const data = await unbindWechatRemote(role, phone, password)
		// 同步清掉本地缓存里的微信字段
		const table = role === ROLE.CUSTOMER ? T.CUSTOMER : T.EMPLOYEE
		const session = getSession()
		if (session && session.id) {
			const list = db.list(table)
			const idx = list.findIndex((r) => r._id === session.id)
			if (idx !== -1) {
				const clean = { ...list[idx] }
				delete clean.wechatOpenid
				delete clean.wechatUnionid
				delete clean.wechatBindTime
				clean.updateTime = Date.now()
				list[idx] = clean
				db.setAll(table, list, true)
			}
		}
		return { ok: true, data }
	} catch (e) {
		return { ok: false, msg: (e && e.message) || '解绑失败' }
	}
}

/** 客户注册（待审核） */
export function registerCustomer(data) {
	if (db.find(T.CUSTOMER, { phone: data.phone })) {
		return { ok: false, msg: '该手机号已注册' }
	}
	const c = db.insert(T.CUSTOMER, {
		name: data.name,
		phone: data.phone,
		password: data.password,
		company: data.company || '',
		grade: 'C',
		pool: 'public',
		ownerId: '',
		approved: false
	})
	return { ok: true, user: c }
}

export function isAdmin() {
	const s = getSession()
	return s && s.role === ROLE.ADMIN
}
export function isEmployee() {
	const s = getSession()
	return s && (s.role === ROLE.EMPLOYEE || s.role === ROLE.ADMIN)
}
export function isCustomer() {
	const s = getSession()
	return s && s.role === ROLE.CUSTOMER
}
