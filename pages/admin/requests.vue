<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">报价申请审核</text>
			<text class="sub-hero-desc">处理和审核客户自助提交的报价需求，支持按产品一键智能推荐报价</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ pendingCount }}</text><text class="metric-label">待审核</text></view>
				<view class="metric-pill"><text class="metric-num">{{ approvedCount }}</text><text class="metric-label">已通过</text></view>
				<view class="metric-pill"><text class="metric-num">{{ totalCount }}</text><text class="metric-label">累计申请</text></view>
			</view>
		</view>

		<view class="tabs" style="margin-bottom: 8rpx;">
			<view class="tab-item" :class="{ on: tab === 'submitted' }" @click="tab = 'submitted'; load()">待审核</view>
			<view class="tab-item" :class="{ on: tab === 'approved' }" @click="tab = 'approved'; load()">已通过</view>
			<view class="tab-item" :class="{ on: tab === 'rejected' }" @click="tab = 'rejected'; load()">已驳回</view>
		</view>

		<view class="list-card req" v-if="tab === 'submitted' && lowPriceList.length">
			<view class="row-between">
				<text class="t-title" style="font-size:30rpx;">低价报价待审核</text>
				<text class="tag tag-red">{{ lowPriceList.length }}</text>
			</view>
			<view class="divider" style="margin: 16rpx 0;"></view>
			<view class="low-price-row" v-for="row in lowPriceList" :key="row.item._id" @click="goQuote(row.item.orderId)">
				<view class="row-between">
					<view class="col flex1">
						<text class="t-bold" style="font-size:27rpx;">{{ row.item.productName }}</text>
						<text class="t-sub mt-s">{{ row.order.customerName || '-' }} · {{ row.order.employeeName || '-' }}</text>
					</view>
					<view class="col" style="align-items:flex-end;">
						<text class="t-price">{{ money(row.item.price) }}</text>
						<text class="t-muted mt-s">最低 {{ money(row.item.minPriceSnapshot) }}</text>
					</view>
				</view>
				<text class="inline-action mt-s" @click.stop="goQuote(row.item.orderId)">进入报价单审核</text>
			</view>
		</view>

		<view class="sub-empty" v-if="!list.length && !(tab === 'submitted' && lowPriceList.length)">暂无相应审核申请</view>

		<view class="list-card req" v-for="r in list" :key="r._id" @click="go(r._id)">
			<view class="row-between">
				<view class="row gap-s">
					<view class="role-avatar">{{ r.customerName ? r.customerName[0] : '客' }}</view>
					<view class="col">
						<text class="t-title" style="font-size:30rpx;">客户：{{ r.customerName }}</text>
						<text class="t-muted" style="font-size:22rpx;margin-top:4rpx;">申请日期：{{ fmt(r.createTime) }}</text>
					</view>
				</view>
				<text class="tag" :class="requestStatusTag(r)">{{ requestStatusLabel(r) }}</text>
			</view>
			<view class="divider" style="margin: 16rpx 0;"></view>
			<view class="row-between">
				<text class="t-sub" style="font-size: 24rpx; color: #6b7280;">明细：{{ getItemsCount(r._id) }} 件商品待估价</text>
				<text class="inline-action" @click.stop="go(r._id)">{{ r.adminReviewStatus === 'pending' ? '管理员审核' : (r.status === 'submitted' ? '接单处理' : '查看详情') }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, REQUEST_STATUS_LABEL } from '@/store/schema.js'
import { fmtDate, fmtMoney } from '@/utils/format.js'

export default {
	data() { return { list: [], all: [], lowPriceList: [], tab: 'submitted' } },
	computed: {
		totalCount() { return this.all.length },
		pendingCount() { return this.all.filter((r) => r.status === 'submitted').length + this.lowPriceList.length },
		approvedCount() { return this.all.filter((r) => r.status === 'approved').length }
	},
	onShow() { this.load() },
	methods: {
		fmt(t) { return fmtDate(t, true) },
		money(n) { return fmtMoney(n) },
		statusLabel(s) { return REQUEST_STATUS_LABEL[s] || '未知' },
		statusTag(s) { return { submitted: 'tag-orange', approved: 'tag-green', rejected: 'tag-red' }[s] || 'tag-gray' },
		requestStatusLabel(r) {
			return r.adminReviewStatus === 'pending' ? '管理员待审' : this.statusLabel(r.status)
		},
		requestStatusTag(r) {
			return r.adminReviewStatus === 'pending' ? 'tag-red' : this.statusTag(r.status)
		},
		getItemsCount(orderId) { return db.list(T.REQUEST_ITEM, { requestOrderId: orderId }).length },
		load() {
			this.all = db.list(T.REQUEST_ORDER, null, 'createTime', true)
			this.lowPriceList = db.list(T.QUOTE_ITEM, { needsAdminReview: true }, 'updateTime', true).map((item) => ({
				item,
				order: db.get(T.QUOTE_ORDER, item.orderId) || {}
			}))
			this.list = this.all.filter((r) => r.status === this.tab)
		},
		go(id) { uni.navigateTo({ url: '/pages/admin/request-detail?id=' + id }) },
		goQuote(id) { if (id) uni.navigateTo({ url: '/pages/quote/detail?id=' + id }) }
	}
}
</script>

<style lang="scss" scoped>
.tabs { display: flex; background: #fff; padding: 20rpx 24rpx; gap: 16rpx; border-bottom: 1rpx solid #edf1f6; }
.tab-item { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 26rpx; color: #6b7280; background: #f3f4f6; }
.tab-item.on { background: #2563eb; color: #fff; font-weight: 600; }
.req:active { transform: scale(0.995); }
.role-avatar { width: 68rpx; height: 68rpx; border-radius: 50%; background: #fff7ed; color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 800; margin-right: 16rpx; }
.low-price-row { padding: 18rpx 0; border-bottom: 1rpx solid #edf1f6; }
.low-price-row:last-child { border-bottom: none; }
</style>
