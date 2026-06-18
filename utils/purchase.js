import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'

export const PURCHASE_REQUEST_STATUS = {
	PENDING: 'pending',
	PRE: 'pre',
	CONVERTED: 'converted'
}

export const PURCHASE_REQUEST_STATUS_LABEL = {
	pending: '待采购处理',
	pre: '已生成预采购',
	converted: '已生成采购单'
}

export function isPurchaseManager(session) {
	if (!session) return false
	if (session.role === ROLE.ADMIN) return true
	if (session.role !== ROLE.EMPLOYEE) return false
	const employee = db.get(T.EMPLOYEE, session.id) || {}
	const text = [employee.position, employee.remark, employee.name, session.name].filter(Boolean).join(' ')
	return text.indexOf('采购') >= 0
}

export function startOfToday() {
	const d = new Date()
	d.setHours(0, 0, 0, 0)
	return d.getTime()
}

export function requestStatusLabel(status) {
	return PURCHASE_REQUEST_STATUS_LABEL[status] || '未知'
}

export function refreshPurchaseRequestStatus(requestId) {
	const items = db.list(T.PURCHASE_REQUEST_ITEM, { requestId })
	if (!items.length) return null
	const converted = items.filter((it) => it.status === PURCHASE_REQUEST_STATUS.CONVERTED).length
	const pre = items.filter((it) => it.status === PURCHASE_REQUEST_STATUS.PRE).length
	let status = PURCHASE_REQUEST_STATUS.PENDING
	if (converted === items.length) status = PURCHASE_REQUEST_STATUS.CONVERTED
	else if (converted || pre) status = PURCHASE_REQUEST_STATUS.PRE
	return db.update(T.PURCHASE_REQUEST, requestId, { status })
}
