<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<view class="row-between">
				<view class="col flex1">
					<text class="t-title">{{ customer.name }}</text>
					<text class="t-sub mt-s">{{ customer.phone }} · {{ customer.company || '无公司' }}</text>
					<view class="row gap-s mt-s wrap">
						<text class="tag" :class="gradeTag">{{ customer.grade }}级</text>
						<text class="tag tag-blue">{{ poolLabel }}</text>
						<text class="tag tag-orange">{{ quoteGapLabel }}</text>
						<text class="tag tag-green">{{ dealGapLabel }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="card">
			<text class="t-title mb-m">普通跟进</text>
			<view class="follow-box">
				<textarea class="input-box follow-input" v-model="followText" placeholder="输入客户跟进内容" />
				<button class="btn btn-sm mt-s" @click="submitCustomerFollow">添加跟进</button>
			</view>
			<view class="empty" v-if="!follows.length">暂无未关联跟进记录</view>
			<view class="follow-item" v-for="f in follows" :key="f._id" @click="goRelated(f)">
				<view class="row-between">
					<view class="row gap-s">
						<text class="t-bold" style="font-size:28rpx;">{{ actor(f) }}</text>
						<text class="tag tag-blue" v-if="f.relatedOrderId">订单提示</text>
					</view>
					<text class="t-muted">{{ fmt(f.createTime) }}</text>
				</view>
				<text class="t-sub mt-s">{{ f.content }}</text>
				<text class="inline-action mt-s" v-if="f.relatedOrderId">查看对应订单</text>
			</view>
		</view>

		<view class="card">
			<text class="t-title mb-m">订单跟进</text>
			<view class="empty" v-if="!timelines.length">暂无报价单</view>
			<view class="order-box" v-for="row in timelines" :key="row.order._id">
				<view class="order-head" @click="goOrder(row.order._id)">
					<view class="row-between">
						<view class="col flex1">
							<text class="t-bold" style="font-size:28rpx;">{{ row.order.employeeName }} 的报价单</text>
							<text class="t-muted mt-s">{{ fmt(row.order.createTime) }} · {{ row.order.dealStatus === 'pending' ? '订单' : '成交' }}{{ money(orderFinance(row.order._id).amount) }} · 利润率{{ orderFinance(row.order._id).profitRate }}%</text>
						</view>
						<text class="tag" :class="dealTag(row.order.dealStatus)">{{ dealLabel(row.order.dealStatus) }}</text>
					</view>
				</view>
				<view class="order-follow" v-for="f in row.follows" :key="f._id" @click="goOrder(row.order._id)">
					<view class="row-between">
						<text class="t-bold" style="font-size:26rpx;">{{ actor(f) }}</text>
						<text class="t-muted">{{ fmt(f.createTime) }}</text>
					</view>
					<text class="t-sub mt-s">{{ f.content }}</text>
				</view>
				<text class="t-muted mt-s" v-if="!row.follows.length">暂无此报价单跟进，点击报价单进入添加</text>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, DEAL_STATUS_LABEL, POOL_LABEL } from '@/store/schema.js'
import { fmtDate, fmtMoney, toast } from '@/utils/format.js'
import { orderFinance as calcOrderFinance } from '@/utils/stats.js'
import { addFollowLog, customerOrderTimeline, followActor, unlinkedCustomerFollows } from '@/utils/follow.js'
import { getSession } from '@/utils/auth.js'
import { isEffectiveQuoteItem } from '@/utils/pricing.js'

export default {
	data() {
		return {
			id: '',
			customer: {},
			follows: [],
			timelines: [],
			followText: '',
			session: {}
		}
	},
	computed: {
		gradeTag() { return { A: 'tag-red', B: 'tag-orange', C: 'tag-blue' }[this.customer.grade] || 'tag-gray' },
		poolLabel() { return POOL_LABEL[this.customer.pool] || '' },
		quoteGapLabel() {
			const times = this.timelines.map((row) => row.order.createTime || 0).filter(Boolean)
			if (!times.length) return '未报价'
			return '距上次报价' + this.daysSince(Math.max(...times)) + '天'
		},
		dealGapLabel() {
			const done = db.list(T.QUOTE_ITEM, { customerId: this.id, status: 'done' }, 'updateTime', true).filter(isEffectiveQuoteItem)
			if (!done.length) return '未成交'
			return '距上次成交' + this.daysSince(done[0].updateTime || done[0].createTime) + '天'
		}
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		if (q && q.id) {
			this.id = q.id
			this.load()
		}
	},
	onShow() { if (this.id) this.load() },
	methods: {
		fmt(t) { return fmtDate(t, true) },
		money(n) { return fmtMoney(n) },
		actor(f) { return followActor(f) },
		dealLabel(s) { return DEAL_STATUS_LABEL[s] || '未知' },
		dealTag(s) { return { pending: 'tag-orange', partial: 'tag-blue', done: 'tag-green' }[s] || 'tag-gray' },
		daysSince(ts) {
			if (!ts) return '-'
			return Math.max(0, Math.floor((Date.now() - ts) / (24 * 3600 * 1000)))
		},
		load() {
			this.customer = db.get(T.CUSTOMER, this.id) || {}
			this.follows = unlinkedCustomerFollows(this.id)
			this.timelines = customerOrderTimeline(this.id, this.session)
		},
		orderFinance(orderId) {
			return calcOrderFinance(orderId)
		},
		submitCustomerFollow() {
			const content = this.followText.trim()
			if (!content) return toast('请输入跟进内容')
			addFollowLog({
				customerId: this.id,
				customerName: this.customer.name,
				employeeId: this.session.id,
				employeeName: this.session.name,
				way: '跟进',
				source: 'customer',
				content
			})
			this.followText = ''
			this.load()
			toast('已添加跟进', 'success')
		},
		goOrder(id) {
			uni.navigateTo({ url: '/pages/quote/detail?id=' + id })
		},
		goRelated(f) {
			if (f.relatedOrderId) this.goOrder(f.relatedOrderId)
		}
	}
}
</script>

<style lang="scss" scoped>
.follow-box { background: #f8fafc; border: 1rpx solid #edf1f6; border-radius: 16rpx; padding: 18rpx; margin-bottom: 20rpx; }
.follow-input { min-height: 130rpx; }
.follow-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.follow-item:last-child { border-bottom: none; }
.order-box { padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.order-box:last-child { border-bottom: none; }
.order-head { background: #f8fafc; border-radius: 14rpx; padding: 18rpx; border: 1rpx solid #edf1f6; }
.order-follow { margin-left: 20rpx; padding: 18rpx 0 18rpx 20rpx; border-left: 4rpx solid #e0edff; border-bottom: 1rpx dashed #e5e7eb; }
.order-follow:last-child { border-bottom: none; }
</style>
