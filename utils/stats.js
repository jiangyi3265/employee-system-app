/**
 * 统计 / 跟进预警 计算
 */
import { db } from '@/store/db.js'
import { T, FOLLOW_WARN, DEAL_STATUS } from '@/store/schema.js'
import { daysSince, sumBy } from '@/utils/format.js'
import { isEffectiveQuoteItem, isQuotableQuoteItem, round2 } from '@/utils/pricing.js'

/**
 * 计算单个客户的跟进状态
 * 分类：已成交 / 已报价未成交 / 未报价
 * 预警：已报价未成交>=1天、未报价>=3天 给红色警告
 */
export function customerFollowStatus(customer) {
	const orders = db.list(T.QUOTE_ORDER, { customerId: customer._id })
	const follows = db.list(T.FOLLOW, { customerId: customer._id }, 'createTime', true)
	const lastFollowTime = follows.length ? follows[0].createTime : customer.createTime
	const days = daysSince(lastFollowTime)
	const lastQuoteTime = orders.length ? Math.max(...orders.map((o) => o.createTime || 0)) : 0
	const dealtItems = db.list(T.QUOTE_ITEM, { customerId: customer._id, status: 'done' }, 'updateTime', true).filter(isEffectiveQuoteItem)
	const lastDealTime = dealtItems.length ? dealtItems[0].updateTime || dealtItems[0].createTime : 0

	let category, threshold
	if (orders.length === 0) {
		category = 'unquoted'        // 未报价
		threshold = FOLLOW_WARN.UNQUOTED
	} else {
		const allDone = orders.every((o) => o.dealStatus === DEAL_STATUS.DONE)
		if (allDone) {
			category = 'dealt'         // 已成交
			threshold = FOLLOW_WARN.UNQUOTED
		} else {
			category = 'quotedUndeal'  // 已报价未成交
			threshold = FOLLOW_WARN.QUOTED_UNDEAL
		}
	}
	const warning = category !== 'dealt' && days >= threshold
	return {
		customer,
		category,
		categoryLabel: { unquoted: '未报价', quotedUndeal: '已报价未成交', dealt: '已成交' }[category],
		lastFollowTime,
		days,
		lastQuoteTime,
		lastDealTime,
		lastQuoteDays: lastQuoteTime ? daysSince(lastQuoteTime) : null,
		lastDealDays: lastDealTime ? daysSince(lastDealTime) : null,
		threshold,
		warning,
		orderCount: orders.length,
		followCount: follows.length
	}
}

/**
 * 跟进列表（可按员工过滤），按预警严重度倒序
 * @param {string} employeeId 仅看某员工负责的客户（私盘 ownerId 匹配；公盘对所有员工可见）
 */
export function followList(employeeId) {
	let customers = db.list(T.CUSTOMER, { approved: true })
	if (employeeId) {
		customers = customers.filter((c) => c.ownerId === employeeId || !c.ownerId)
	}
	const list = customers.map(customerFollowStatus)
	// 倒序：警告优先，再按未跟进天数
	list.sort((a, b) => {
		if (a.warning !== b.warning) return a.warning ? -1 : 1
		return b.days - a.days
	})
	return list
}

/** 员工跟进达成统计 */
export function employeeFollowStats(employeeId) {
	const list = followList(employeeId).filter((x) => x.category !== 'dealt')
	const total = list.length
	const overdue = list.filter((x) => x.warning).length
	const followed = total - overdue
	const quotedUndealOverdue = list.filter((x) => x.warning && x.category === 'quotedUndeal').length
	const unquotedOverdue = list.filter((x) => x.warning && x.category === 'unquoted').length
	return {
		total,
		followed,
		overdue,
		quotedUndealOverdue,
		unquotedOverdue,
		rate: total ? Math.round((followed / total) * 100) : 100
	}
}

/** 订单成交金额统计（整体金额 + 已成交部分金额） */
export function orderAmount(orderId) {
	const items = db.list(T.QUOTE_ITEM, { orderId }).filter(isQuotableQuoteItem)
	const total = sumBy(items, (it) => (Number(it.price) || 0) * (Number(it.qty) || 0))
	const dealt = sumBy(items.filter((it) => it.status === 'done'), (it) => (Number(it.price) || 0) * (Number(it.qty) || 0))
	return { total, dealt, itemCount: items.length }
}

export function orderFinance(orderId, dealOnly = false) {
	// 订单详情展示实际可报价的行。低价特批行可展示，但仍不会进入产品参考价与成交统计。
	let items = db.list(T.QUOTE_ITEM, { orderId }).filter(isQuotableQuoteItem)
	if (dealOnly) items = items.filter((it) => it.status === 'done')
	const amount = sumBy(items, (it) => (Number(it.price) || 0) * (Number(it.qty) || 0))
	const cost = sumBy(items, (it) => (Number(it.costPrice) || 0) * (Number(it.qty) || 0))
	const profit = round2(amount - cost)
	const profitRate = cost ? round2((profit / cost) * 100) : 0
	return {
		amount: round2(amount),
		cost: round2(cost),
		profit,
		profitRate,
		itemCount: items.length
	}
}

export function pendingSpecialPriceCount(employeeId = '') {
	let items = db.list(T.QUOTE_ITEM, { needsAdminReview: true })
	if (employeeId) items = items.filter((it) => it.employeeId === employeeId)
	return items.length
}

export function orderProfitRate(orderId, dealOnly = false) {
	return orderFinance(orderId, dealOnly).profitRate
}

/** 计算并更新订单成交状态（已成交/部分成交/未成交） */
export function refreshOrderDealStatus(orderId) {
	const items = db.list(T.QUOTE_ITEM, { orderId }).filter(isQuotableQuoteItem)
	if (!items.length) return
	const doneCount = items.filter((it) => it.status === 'done').length
	let status = DEAL_STATUS.PENDING
	if (doneCount === items.length) status = DEAL_STATUS.DONE
	else if (doneCount > 0) status = DEAL_STATUS.PARTIAL
	db.update(T.QUOTE_ORDER, orderId, { dealStatus: status })
	return status
}

/**
 * 自动判定客户归属：报价单最多的员工 => 私盘归属
 */
export function refreshCustomerOwner(customerId) {
	const orders = db.list(T.QUOTE_ORDER, { customerId })
	if (!orders.length) return
	const countByEmp = {}
	orders.forEach((o) => {
		if (!o.employeeId) return
		countByEmp[o.employeeId] = (countByEmp[o.employeeId] || 0) + 1
	})
	let topEmp = '', topCount = 0
	Object.keys(countByEmp).forEach((eid) => {
		if (countByEmp[eid] > topCount) { topCount = countByEmp[eid]; topEmp = eid }
	})
	if (topEmp) {
		db.update(T.CUSTOMER, customerId, { ownerId: topEmp, pool: 'private' })
	}
}

/** 员工工作台统计 */
export function employeeDashboard(employeeId) {
	const orders = db.list(T.QUOTE_ORDER, { employeeId })
	const dealtOrders = orders.filter((o) => o.dealStatus === DEAL_STATUS.DONE)
	const items = db.list(T.QUOTE_ITEM, { employeeId, status: 'done' }).filter(isEffectiveQuoteItem)
	const dealAmount = sumBy(items, (it) => (Number(it.price) || 0) * (Number(it.qty) || 0))
	const follow = employeeFollowStats(employeeId)
	return {
		quoteCount: orders.length,
		dealCount: dealtOrders.length,
		dealAmount,
		overdueFollow: follow.overdue,
		followRate: follow.rate,
		pendingQuoteReview: pendingSpecialPriceCount(employeeId)
	}
}

/** 管理员工作台统计 */
export function adminDashboard() {
	const orders = db.list(T.QUOTE_ORDER)
	const items = db.list(T.QUOTE_ITEM, { status: 'done' }).filter(isEffectiveQuoteItem)
	const dealAmount = sumBy(items, (it) => (Number(it.price) || 0) * (Number(it.qty) || 0))
	const pendingQuoteReview = pendingSpecialPriceCount()
	return {
		employeeCount: db.count(T.EMPLOYEE),
		customerCount: db.count(T.CUSTOMER, { approved: true }),
		pendingCustomer: db.count(T.CUSTOMER, { approved: false }),
		quoteCount: orders.length,
		dealAmount,
		pendingQuoteReview,
		pendingRequest: db.count(T.REQUEST_ORDER, { status: 'submitted' }) + pendingQuoteReview,
		pendingSuggestion: db.list(T.SUGGESTION, { reply: '' }).length
	}
}
