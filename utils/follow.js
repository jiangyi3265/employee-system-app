import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'

function getName(table, id) {
	const rec = id ? db.get(table, id) : null
	return rec ? rec.name : ''
}

function orderLabel(order) {
	if (!order) return '报价单'
	const time = order.createTime ? new Date(order.createTime).toLocaleDateString() : ''
	return [order.customerName, time].filter(Boolean).join(' · ') || '报价单'
}

export function followActor(follow) {
	if (!follow) return ''
	if (follow.actorRole === 'system' || follow.way === '系统') return '系统'
	return follow.employeeName || getName(T.EMPLOYEE, follow.employeeId) || '员工'
}

export function addFollowLog(payload = {}) {
	const order = payload.orderId ? db.get(T.QUOTE_ORDER, payload.orderId) : null
	const customerId = payload.customerId || (order && order.customerId) || ''
	if (!customerId) return null
	const customer = db.get(T.CUSTOMER, customerId)
	const employeeId = payload.employeeId || (order && order.employeeId) || ''
	const employeeName = payload.employeeName || getName(T.EMPLOYEE, employeeId)
	const way = payload.way || (payload.actorRole === 'system' ? '系统' : '跟进')
	const actorRole = payload.actorRole || (way === '系统' ? 'system' : 'employee')

	return db.insert(T.FOLLOW, {
		customerId,
		customerName: payload.customerName || (customer && customer.name) || (order && order.customerName) || '',
		employeeId,
		employeeName,
		orderId: payload.orderId || '',
		way,
		actorRole,
		source: payload.source || (payload.orderId ? 'quote' : 'customer'),
		privateOrder: !!payload.orderId,
		relatedOrderId: payload.relatedOrderId || '',
		content: (payload.content || '').trim()
	})
}

export function addOrderFollow(payload = {}) {
	const order = payload.orderId ? db.get(T.QUOTE_ORDER, payload.orderId) : null
	if (!order || !payload.content) return null
	const orderFollow = addFollowLog({
		...payload,
		customerId: order.customerId,
		customerName: order.customerName,
		employeeId: payload.employeeId || order.employeeId,
		employeeName: payload.employeeName || order.employeeName,
		source: 'quote'
	})
	addFollowLog({
		customerId: order.customerId,
		customerName: order.customerName,
		employeeId: payload.employeeId || order.employeeId,
		employeeName: payload.employeeName || order.employeeName,
		way: '系统',
		actorRole: 'system',
		source: 'quote-tip',
		relatedOrderId: order._id,
		content: `订单跟进（${orderLabel(order)}）：${payload.content}`
	})
	return orderFollow
}

export function addOrderSystemFollow(orderId, content, actor = {}) {
	const order = db.get(T.QUOTE_ORDER, orderId)
	if (!order || !content) return null
	return addOrderFollow({
		employeeId: actor.id || order.employeeId,
		employeeName: actor.name || order.employeeName,
		orderId,
		way: '系统',
		actorRole: 'system',
		source: 'quote',
		content
	})
}

export function orderFollows(orderId, session = null) {
	const order = db.get(T.QUOTE_ORDER, orderId)
	let list = db.list(T.FOLLOW, { orderId }, 'createTime', true)
	if (!session || !order) return list
	if (session.role === ROLE.ADMIN) return list
	if (session.role === ROLE.CUSTOMER) return list.filter((f) => f.customerId === session.id)
	if (session.role === ROLE.EMPLOYEE) {
		return list.filter((f) => order.employeeId === session.id || f.employeeId === session.id || f.actorRole === 'system')
	}
	return list
}

export function unlinkedCustomerFollows(customerId) {
	return db.list(T.FOLLOW, { customerId }, 'createTime', true).filter((f) => !f.orderId)
}

export function customerOrderTimeline(customerId, session = null) {
	let orders = db.list(T.QUOTE_ORDER, { customerId }, 'createTime', true)
	if (session && session.role === ROLE.EMPLOYEE) {
		orders = orders.filter((o) => o.employeeId === session.id)
	}
	return orders.map((order) => ({
		order,
		follows: orderFollows(order._id, session)
	}))
}
