<template>
	<view class="global-stats" v-if="visible">
		<view class="stat-chip" @click="goQuote">
			<text class="stat-num">{{ stats.quoteCount }}</text>
			<text class="stat-label">报价单总数</text>
		</view>
		<view class="stat-chip" @click="goCustomers">
			<text class="stat-num">{{ stats.customerCount }}</text>
			<text class="stat-label">客户数</text>
		</view>
		<view class="stat-chip" @click="goDeal">
			<text class="stat-num price">{{ money(stats.dealAmount) }}</text>
			<text class="stat-label">成交金额</text>
		</view>
		<view class="stat-chip" @click="goPending">
			<text class="stat-num" :class="{ warn: stats.pendingRequest }">{{ stats.pendingRequest }}</text>
			<text class="stat-label">待审核申请</text>
		</view>
	</view>
</template>

<script>
import { getSession } from '@/utils/auth.js'
import { db } from '@/store/db.js'
import { T, ROLE, DEAL_STATUS } from '@/store/schema.js'
import { adminDashboard, employeeDashboard } from '@/utils/stats.js'
import { fmtMoney } from '@/utils/format.js'
import { isEffectiveQuoteItem, isQuotableQuoteItem } from '@/utils/pricing.js'

export default {
	data() {
		return {
			session: null,
			stats: { quoteCount: 0, customerCount: 0, dealAmount: 0, pendingRequest: 0 }
		}
	},
	computed: {
		visible() {
			return !!this.session
		}
	},
	mounted() {
		this.load()
	},
	methods: {
		money(n) { return fmtMoney(n) },
		load() {
			const session = getSession()
			this.session = session
			if (!session) return
			if (session.role === ROLE.ADMIN) {
				this.stats = adminDashboard()
			} else if (session.role === ROLE.EMPLOYEE) {
				const stat = employeeDashboard(session.id)
				const visibleCustomers = db.list(T.CUSTOMER, { approved: true }).filter((c) => c.ownerId === session.id || !c.ownerId)
				this.stats = {
					quoteCount: stat.quoteCount,
					customerCount: visibleCustomers.length,
					dealAmount: stat.dealAmount,
					pendingRequest: db.count(T.REQUEST_ORDER, { status: 'submitted' }) + (stat.pendingQuoteReview || 0)
				}
			} else {
				const orders = db.list(T.QUOTE_ORDER, { customerId: session.id })
				const visibleOrders = orders
					.filter((o) => o.dealStatus === DEAL_STATUS.PENDING || o.dealStatus === DEAL_STATUS.DONE)
					.filter((o) => db.list(T.QUOTE_ITEM, { orderId: o._id }).some(isQuotableQuoteItem))
				const doneItems = db.list(T.QUOTE_ITEM, { customerId: session.id, status: 'done' }).filter(isEffectiveQuoteItem)
				this.stats = {
					quoteCount: visibleOrders.length,
					customerCount: 1,
					dealAmount: doneItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0),
					pendingRequest: db.count(T.REQUEST_ORDER, { customerId: session.id, status: 'submitted' })
				}
			}
		},
		go(url, tab = false) {
			if (tab) uni.switchTab({ url })
			else uni.navigateTo({ url })
		},
		goQuote() {
			if (this.session.role === ROLE.CUSTOMER) this.go('/pages/customer/orders')
			else this.go('/pages/quote/list')
		},
		goCustomers() {
			if (this.session.role === ROLE.CUSTOMER) this.go('/pages/customer/products')
			else this.go('/pages/archive/customer')
		},
		goDeal() {
			if (this.session.role === ROLE.ADMIN) this.go('/pages/admin/stats')
			else if (this.session.role === ROLE.CUSTOMER) this.go('/pages/customer/orders')
			else this.go('/pages/quote/list')
		},
		goPending() {
			if (this.session.role === ROLE.CUSTOMER) this.go('/pages/customer/cart')
			else this.go('/pages/admin/requests')
		}
	}
}
</script>

<style lang="scss" scoped>
.global-stats {
	display: flex;
	flex-direction: row;
	gap: 10rpx;
	padding: 14rpx 18rpx;
	background: #ffffff;
	border-bottom: 1rpx solid #edf1f6;
}
.stat-chip {
	flex: 1;
	min-width: 0;
	background: #f8fafc;
	border: 1rpx solid #e8edf5;
	border-radius: 12rpx;
	padding: 12rpx 8rpx;
	text-align: center;
}
.stat-num {
	display: block;
	color: #111827;
	font-size: 25rpx;
	font-weight: 800;
	line-height: 1.2;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.stat-num.price {
	color: #ef4444;
	font-size: 23rpx;
}
.stat-num.warn { color: #ef4444; }
.stat-label {
	display: block;
	color: #667085;
	font-size: 20rpx;
	margin-top: 4rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
