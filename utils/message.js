/**
 * 站内信 / 通知
 * message: { toType:'employee'|'user', toId, toRole, toName, fromId, fromName, title, content, type, refId, threadId, read, createTime }
 */
import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'

/** 发送给所有员工与管理员（广播） */
export function notifyEmployees(title, content, type = 'notice', refId = '', opts = {}) {
	return db.insert(T.MESSAGE, {
		toType: 'employee',
		toId: '',
		title,
		content,
		type,
		refId,
		fromId: opts.fromId || '',
		fromName: opts.fromName || '',
		fromRole: opts.fromRole || '',
		threadId: opts.threadId || '',
		read: false
	})
}

/** 发送给指定用户 */
export function sendToUser(toId, title, content, opts = {}) {
	return db.insert(T.MESSAGE, {
		toType: 'user', toId, title, content,
		type: opts.type || 'notice', refId: opts.refId || '',
		fromId: opts.fromId || '', fromName: opts.fromName || '',
		threadId: opts.threadId || '', read: false
	})
}

/** 当前用户可见的消息 */
export function inboxFor(session) {
	if (!session) return []
	const all = db.list(T.MESSAGE, null, 'createTime', true)
	if (session.role === ROLE.CUSTOMER) {
		return all.filter((m) => m.toType === 'user' && m.toId === session.id)
	}
	// 员工/管理员：广播 + 指定给自己的
	return all.filter((m) => m.toType === 'employee' || (m.toType === 'user' && m.toId === session.id))
}

export function unreadCount(session) {
	return inboxFor(session).filter((m) => !m.read).length
}

export function markRead(id) {
	db.update(T.MESSAGE, id, { read: true })
}

/** 简单两方会话线程 */
export function threadMessages(threadId) {
	return db.list(T.MESSAGE, { threadId }, 'createTime', false)
}

export function manualThreadId(fromId, toId) {
	return 'manual_' + [fromId, toId].filter(Boolean).sort().join('_')
}

export function postGroupMessage(fromSession, target, content) {
	const group = target && target.group
	if (!group) return []
	const rows = group === 'customers'
		? db.list(T.CUSTOMER, { approved: true }, 'name').map((c) => ({ id: c._id, role: ROLE.CUSTOMER, name: c.name }))
		: db.list(T.EMPLOYEE, null, 'name').filter((e) => !e.disabled && e._id !== fromSession.id).map((e) => ({
			id: e._id,
			role: e.role || ROLE.EMPLOYEE,
			name: e.name
		}))
	return rows.filter((row) => row.id && row.id !== fromSession.id).map((row) => db.insert(T.MESSAGE, {
		toType: 'user',
		toId: row.id,
		toRole: row.role,
		toName: row.name,
		threadId: manualThreadId(fromSession.id, row.id),
		content,
		title: target.title || '站内信',
		type: 'chat',
		fromId: fromSession.id,
		fromName: fromSession.name,
		fromRole: fromSession.role,
		groupType: group,
		groupName: target.name || '',
		read: false
	}))
}

export function postThread(threadId, fromSession, toId, content) {
	const target = typeof toId === 'object' ? toId : { id: toId }
	return db.insert(T.MESSAGE, {
		toType: target.toType || 'user',
		toId: target.id || '',
		toRole: target.role || '',
		toName: target.name || '',
		threadId,
		content,
		title: '站内信', type: 'chat',
		fromId: fromSession.id, fromName: fromSession.name,
		fromRole: fromSession.role, read: false
	})
}
