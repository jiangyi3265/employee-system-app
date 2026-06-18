<template>
	<view class="page">
		<global-stats />
		<!-- 顶部欢迎 -->
		<view class="header">
			<view class="row-between">
				<view class="col">
					<text class="hello">你好，{{ session.name }}</text>
					<text class="role">{{ roleLabel }} · 销售报价管理</text>
				</view>
				<view class="avatar">{{ (session.name || '用')[0] }}</view>
			</view>
		</view>

		<!-- 统计区：管理员 -->
		<view class="stat-grid" v-if="isAdmin">
			<view class="stat-cell" @click="go('/pages/quote/list')"><view class="stat-inner"><text class="stat-num">{{ stat.quoteCount }}</text><text class="stat-label">报价单总数</text></view></view>
			<view class="stat-cell" @click="go('/pages/admin/stats')"><view class="stat-inner"><text class="stat-num t-price">{{ money(stat.dealAmount) }}</text><text class="stat-label">累计成交金额</text></view></view>
			<view class="stat-cell" @click="go('/pages/archive/customer')"><view class="stat-inner"><text class="stat-num">{{ stat.customerCount }}</text><text class="stat-label">客户数</text></view></view>
			<view class="stat-cell" @click="go('/pages/admin/requests')"><view class="stat-inner"><text class="stat-num" :class="{ 't-danger': stat.pendingRequest }">{{ stat.pendingRequest }}</text><text class="stat-label">待审核申请</text></view></view>
		</view>

		<!-- 统计区：员工 -->
		<view class="stat-grid" v-else-if="isEmployee">
			<view class="stat-cell" @click="go('/pages/quote/list')"><view class="stat-inner"><text class="stat-num">{{ stat.quoteCount }}</text><text class="stat-label">我的报价单</text></view></view>
			<view class="stat-cell" @click="go('/pages/quote/list')"><view class="stat-inner"><text class="stat-num t-success">{{ stat.dealCount }}</text><text class="stat-label">已成交单</text></view></view>
			<view class="stat-cell" @click="go('/pages/quote/list')"><view class="stat-inner"><text class="stat-num t-price">{{ money(stat.dealAmount) }}</text><text class="stat-label">成交金额</text></view></view>
			<view class="stat-cell" @click="go('/pages/follow/index')"><view class="stat-inner"><text class="stat-num" :class="{ 't-danger': stat.overdueFollow }">{{ stat.overdueFollow }}</text><text class="stat-label">超期未跟进</text></view></view>
		</view>

		<!-- 客户端：跟进/成交概览 -->
		<view class="stat-grid" v-else>
			<view class="stat-cell" @click="go('/pages/customer/orders')"><view class="stat-inner"><text class="stat-num">{{ custStat.orderCount }}</text><text class="stat-label">报价单</text></view></view>
			<view class="stat-cell" @click="go('/pages/customer/orders')"><view class="stat-inner"><text class="stat-num t-success">{{ custStat.dealCount }}</text><text class="stat-label">已成交</text></view></view>
		</view>

		<!-- 跟进预警提示（员工/管理员） -->
		<view class="card warn-card" v-if="isEmployee && stat.overdueFollow > 0" @click="go('/pages/follow/index')">
			<view class="row gap-s">
				<text class="warn-dot">!</text>
				<text class="t-danger t-bold">有 {{ stat.overdueFollow }} 个客户超期未跟进</text>
			</view>
			<text class="t-muted">点击查看跟进预警 ></text>
		</view>

		<!-- 功能区 -->
		<view class="card">
			<text class="t-title">{{ isCustomer ? '客户服务' : '常用功能' }}</text>
			<view class="grid mt-m">
				<view class="grid-item" v-for="(f, i) in functions" :key="i" @click="go(f.url)">
					<view class="grid-icon" :class="f.icon" :style="{ background: f.bg }">
						<view class="ui-icon"></view>
						<text class="grid-badge" v-if="f.badge">{{ f.badge }}</text>
					</view>
					<text class="grid-text">{{ f.name }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getSession, isAdmin, isCustomer } from '@/utils/auth.js'
import { ROLE, ROLE_LABEL, DEAL_STATUS } from '@/store/schema.js'
import { adminDashboard, employeeDashboard } from '@/utils/stats.js'
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { fmtMoney } from '@/utils/format.js'
import { isQuotableQuoteItem } from '@/utils/pricing.js'

export default {
	data() {
		return {
			session: {},
			stat: {},
			custStat: { orderCount: 0, dealCount: 0 }
		}
	},
	computed: {
		isAdmin() { return this.session.role === ROLE.ADMIN },
		isEmployee() { return this.session.role === ROLE.EMPLOYEE },
		isCustomer() { return this.session.role === ROLE.CUSTOMER },
		roleLabel() { return ROLE_LABEL[this.session.role] || '' },
		functions() {
			if (this.session.role === ROLE.CUSTOMER) {
				return [
					{ name: '商品浏览', icon: 'i-product', bg: '#e0edff', url: '/pages/customer/products' },
					{ name: '申请报价', icon: 'i-edit', bg: '#dcfce7', url: '/pages/customer/cart' },
					{ name: '我的报价', icon: 'i-quote', bg: '#fef3c7', url: '/pages/customer/orders' },
					{ name: '联系我们', icon: 'i-user', bg: '#e0edff', url: '/pages/customer/contact' },
					{ name: '投诉建议', icon: 'i-chat', bg: '#fee2e2', url: '/pages/customer/suggest' }
				]
			}
			const base = [
				{ name: '客户跟进', icon: 'i-phone', bg: '#e0edff', url: '/pages/follow/index' },
				{ name: '报价单', icon: 'i-quote', bg: '#dcfce7', url: '/pages/quote/list' },
				{ name: '价格查询', icon: 'i-search', bg: '#eef2ff', url: '/pages/price/query' },
				{ name: '产品信息', icon: 'i-product', bg: '#fef3c7', url: '/pages/product/list' },
				{ name: '采购申请', icon: 'i-edit', bg: '#e0f2fe', url: '/pages/purchase/request' },
				{ name: '采购管理', icon: 'i-truck', bg: '#ede9fe', url: '/pages/purchase/list' },
				{ name: '客户档案', icon: 'i-users', bg: '#e0edff', url: '/pages/archive/customer' },
				{ name: '供应商', icon: 'i-factory', bg: '#dcfce7', url: '/pages/archive/supplier' },
				{ name: '同行档案', icon: 'i-search', bg: '#fee2e2', url: '/pages/archive/competitor' },
				{ name: '申请审核', icon: 'i-check', bg: '#fef3c7', url: '/pages/admin/requests', badge: this.stat.pendingRequest }
			]
			if (this.session.role === ROLE.ADMIN) {
				base.push(
					{ name: '员工档案', icon: 'i-user', bg: '#ede9fe', url: '/pages/archive/employee' },
					{ name: '客户建议', icon: 'i-chat', bg: '#e0edff', url: '/pages/admin/suggestions', badge: this.stat.pendingSuggestion },
					{ name: '统计分析', icon: 'i-chart', bg: '#dcfce7', url: '/pages/admin/stats' }
				)
			}
			if (this.session.role === ROLE.ADMIN) {
				base.push({ name: '价格设置', icon: 'i-setting', bg: '#f3f4f6', url: '/pages/product/settings' })
			}
			return base
		}
	},
	onShow() {
		const s = getSession()
		if (!s) {
			uni.redirectTo({ url: '/pages/login/login' })
			return
		}
		this.session = s
		this.loadStats()
	},
	methods: {
		money(n) { return fmtMoney(n) },
		go(url) { uni.navigateTo({ url }) },
		loadStats() {
			if (this.session.role === ROLE.ADMIN) {
				this.stat = adminDashboard()
			} else if (this.session.role === ROLE.EMPLOYEE) {
				this.stat = employeeDashboard(this.session.id)
			} else {
				const orders = db.list(T.QUOTE_ORDER, { customerId: this.session.id })
				const visibleOrders = orders.filter((o) => db.list(T.QUOTE_ITEM, { orderId: o._id }).some(isQuotableQuoteItem))
				this.custStat = {
					orderCount: visibleOrders.length,
					dealCount: visibleOrders.filter((o) => o.dealStatus === DEAL_STATUS.DONE).length
				}
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.header { background: linear-gradient(135deg, #2563eb, #1e40af); padding: 60rpx 40rpx 80rpx; }
.hello { color: #fff; font-size: 40rpx; font-weight: 800; }
.role { color: rgba(255,255,255,0.8); font-size: 24rpx; margin-top: 8rpx; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: rgba(255,255,255,0.2); color: #fff; font-size: 40rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.stat-grid { margin: -56rpx 16rpx 0; }
.warn-card { display: flex; flex-direction: row; align-items: center; justify-content: space-between; background: #fff7ed; }
.warn-dot { width: 40rpx; height: 40rpx; border-radius: 50%; background: #ef4444; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.grid { display: flex; flex-wrap: wrap; }
.grid-item { width: 25%; display: flex; flex-direction: column; align-items: center; margin: 16rpx 0; }
.grid-icon { position: relative; width: 96rpx; height: 96rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1rpx 0 rgba(255,255,255,0.72), 0 10rpx 20rpx rgba(15, 23, 42, 0.06); }
.ui-icon, .ui-icon::before, .ui-icon::after { box-sizing: border-box; position: absolute; content: ""; }
.ui-icon { width: 42rpx; height: 42rpx; color: #2563eb; }
.i-product .ui-icon { border: 5rpx solid currentColor; border-radius: 12rpx; }
.i-product .ui-icon::before { width: 22rpx; height: 5rpx; background: currentColor; left: 5rpx; top: 11rpx; border-radius: 999rpx; box-shadow: 0 13rpx 0 currentColor; }
.i-edit .ui-icon { width: 42rpx; height: 30rpx; border: 5rpx solid currentColor; border-radius: 10rpx; transform: rotate(-8deg); }
.i-edit .ui-icon::after { width: 18rpx; height: 5rpx; background: currentColor; right: -10rpx; top: -8rpx; border-radius: 999rpx; transform: rotate(-45deg); }
.i-quote .ui-icon { width: 36rpx; height: 46rpx; border: 5rpx solid currentColor; border-radius: 10rpx; }
.i-quote .ui-icon::before { width: 18rpx; height: 5rpx; background: currentColor; left: 7rpx; top: 10rpx; border-radius: 999rpx; box-shadow: 0 12rpx 0 currentColor; }
.i-chat .ui-icon { width: 46rpx; height: 34rpx; border: 5rpx solid currentColor; border-radius: 16rpx; }
.i-chat .ui-icon::after { width: 14rpx; height: 14rpx; border-left: 5rpx solid currentColor; border-bottom: 5rpx solid currentColor; left: 8rpx; bottom: -10rpx; transform: rotate(-20deg); }
.i-phone .ui-icon { width: 34rpx; height: 48rpx; border: 5rpx solid currentColor; border-radius: 18rpx; transform: rotate(-22deg); }
.i-phone .ui-icon::before { width: 10rpx; height: 5rpx; background: currentColor; left: 7rpx; bottom: 5rpx; border-radius: 999rpx; }
.i-truck .ui-icon { width: 46rpx; height: 30rpx; border: 5rpx solid currentColor; border-radius: 8rpx; top: 24rpx; }
.i-truck .ui-icon::before { width: 18rpx; height: 20rpx; border: 5rpx solid currentColor; border-left: none; right: -18rpx; top: 4rpx; border-radius: 0 8rpx 8rpx 0; }
.i-truck .ui-icon::after { width: 9rpx; height: 9rpx; background: currentColor; border-radius: 50%; left: 5rpx; bottom: -12rpx; box-shadow: 36rpx 0 0 currentColor; }
.i-users .ui-icon { width: 24rpx; height: 24rpx; border: 5rpx solid currentColor; border-radius: 50%; top: 22rpx; }
.i-users .ui-icon::before { width: 42rpx; height: 20rpx; border: 5rpx solid currentColor; border-bottom: none; border-radius: 22rpx 22rpx 0 0; left: -9rpx; top: 25rpx; }
.i-users .ui-icon::after { width: 18rpx; height: 18rpx; border: 5rpx solid currentColor; border-radius: 50%; right: -22rpx; top: 1rpx; opacity: .72; }
.i-factory .ui-icon { width: 48rpx; height: 36rpx; border: 5rpx solid currentColor; border-top: none; bottom: 23rpx; }
.i-factory .ui-icon::before { width: 42rpx; height: 20rpx; border-left: 5rpx solid currentColor; border-bottom: 5rpx solid currentColor; left: 0; top: -14rpx; transform: skewY(-25deg); }
.i-search .ui-icon { width: 32rpx; height: 32rpx; border: 5rpx solid currentColor; border-radius: 50%; }
.i-search .ui-icon::after { width: 18rpx; height: 5rpx; background: currentColor; right: -13rpx; bottom: -7rpx; border-radius: 999rpx; transform: rotate(45deg); }
.i-check .ui-icon { width: 44rpx; height: 44rpx; border: 5rpx solid currentColor; border-radius: 50%; }
.i-check .ui-icon::after { width: 22rpx; height: 12rpx; border-left: 5rpx solid currentColor; border-bottom: 5rpx solid currentColor; left: 9rpx; top: 11rpx; transform: rotate(-45deg); }
.i-user .ui-icon { width: 28rpx; height: 28rpx; border: 5rpx solid currentColor; border-radius: 50%; top: 18rpx; }
.i-user .ui-icon::before { width: 48rpx; height: 24rpx; border: 5rpx solid currentColor; border-bottom: none; border-radius: 28rpx 28rpx 0 0; left: -10rpx; top: 31rpx; }
.i-chart .ui-icon { width: 46rpx; height: 40rpx; border-left: 5rpx solid currentColor; border-bottom: 5rpx solid currentColor; bottom: 25rpx; }
.i-chart .ui-icon::before { width: 7rpx; height: 18rpx; background: currentColor; left: 10rpx; bottom: 4rpx; border-radius: 999rpx; box-shadow: 13rpx -8rpx 0 currentColor, 26rpx -18rpx 0 currentColor; }
.i-setting .ui-icon { width: 42rpx; height: 42rpx; border: 5rpx solid currentColor; border-radius: 50%; }
.i-setting .ui-icon::before { width: 14rpx; height: 14rpx; border: 5rpx solid currentColor; border-radius: 50%; left: 9rpx; top: 9rpx; }
.i-setting .ui-icon::after { width: 54rpx; height: 5rpx; background: currentColor; left: -11rpx; top: 18rpx; border-radius: 999rpx; box-shadow: 0 0 0 currentColor; transform: rotate(45deg); }
.grid-badge { position: absolute; top: -8rpx; right: -8rpx; min-width: 32rpx; height: 32rpx; padding: 0 6rpx; border-radius: 999rpx; background: #ef4444; color: #fff; font-size: 20rpx; display: flex; align-items: center; justify-content: center; }
.grid-text { font-size: 24rpx; color: #374151; margin-top: 12rpx; }
</style>
