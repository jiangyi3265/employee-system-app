/**
 * 登录 / 会话管理
 */
import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'

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

/**
 * 模拟微信一键登录：取第一个对应角色账号（仅演示）
 */
export function loginWechat(role) {
	const table = role === ROLE.CUSTOMER ? T.CUSTOMER : T.EMPLOYEE
	let user
	if (role === ROLE.CUSTOMER) {
		user = db.find(T.CUSTOMER, { approved: true })
	} else {
		user = db.find(T.EMPLOYEE, {})
	}
	if (!user) return { ok: false, msg: '暂无可用演示账号' }
	const session = { role: user.role || role, id: user._id, name: user.name }
	setSession(session)
	return { ok: true, session, user }
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
