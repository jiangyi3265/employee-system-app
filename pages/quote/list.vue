<template>
	<view class="page">
		<global-stats />
		<view class="search-bar">
			<input class="search-input" v-model="kw" placeholder="搜索客户 / 员工" @input="load" />
		</view>

		<view class="tabs">
			<view class="tab-item" :class="{ on: tab === '' }" @click="tab = ''; load()">全部</view>
			<view class="tab-item" :class="{ on: tab === 'pending' }" @click="tab = 'pending'; load()">未成交</view>
			<view class="tab-item" :class="{ on: tab === 'partial' }" @click="tab = 'partial'; load()">部分成交</view>
			<view class="tab-item" :class="{ on: tab === 'done' }" @click="tab = 'done'; load()">已成交</view>
		</view>

		<view class="empty" v-if="!list.length">暂无报价单</view>

		<view class="card order" v-for="o in list" :key="o._id" @click="go(o._id)">
			<view class="row-between">
				<text class="t-title" style="font-size:30rpx;">{{ o.customerName }}</text>
				<text class="tag" :class="dealTag(o.dealStatus)">{{ dealLabel(o.dealStatus) }}</text>
			</view>
			<view class="row-between mt-s">
				<text class="t-sub">报价员工：{{ o.employeeName }}</text>
				<text class="t-muted">{{ fmt(o.createTime) }}</text>
			</view>
			<view class="finance-grid mt-s">
				<view><text class="t-muted">{{ amountLabel(o) }}</text><text class="finance-num">{{ money(finance(o).amount) }}</text></view>
				<view><text class="t-muted">成本</text><text class="finance-num">{{ money(finance(o).cost) }}</text></view>
				<view><text class="t-muted">利润</text><text class="finance-num" :class="finance(o).profit < 0 ? 't-danger' : 't-success'">{{ money(finance(o).profit) }}</text></view>
				<view><text class="t-muted">利润率</text><text class="finance-num" :class="profitClass(o)">{{ profitLabel(o) }}</text></view>
			</view>
		</view>

		<view class="fab" @click="add">+</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, DEAL_STATUS, DEAL_STATUS_LABEL, ROLE } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtDate, fmtMoney } from '@/utils/format.js'
import { orderFinance } from '@/utils/stats.js'

export default {
	data() { return { list: [], kw: '', tab: '', session: {} } },
	onShow() {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.load()
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		money(n) { return fmtMoney(n) },
		dealLabel(s) { return DEAL_STATUS_LABEL[s] || '未知' },
		dealTag(s) { return { pending: 'tag-orange', partial: 'tag-blue', done: 'tag-green' }[s] || 'tag-gray' },
		finance(o) {
			return orderFinance(o._id, o.dealStatus !== DEAL_STATUS.PENDING)
		},
		amountLabel(o) {
			return o.dealStatus === DEAL_STATUS.PENDING ? '订单' : '成交'
		},
		profitLabel(o) {
			return this.finance(o).profitRate + '%'
		},
		profitClass(o) {
			const rate = this.finance(o).profitRate
			return rate < 10 ? 't-danger t-bold' : 't-success t-bold'
		},
		load() {
			let list = db.list(T.QUOTE_ORDER, null, 'createTime', true)
			if (this.session.role === ROLE.EMPLOYEE) {
				list = list.filter((o) => o.employeeId === this.session.id)
			}
			if (this.tab) list = list.filter((o) => o.dealStatus === this.tab)
			const kw = this.kw.trim()
			if (kw) {
				list = list.filter((o) => {
					const text = [o.customerName, o.employeeName].filter(Boolean).join(' ')
					return text.indexOf(kw) >= 0
				})
			}
			this.list = list
		},
		go(id) { uni.navigateTo({ url: '/pages/quote/detail?id=' + id }) },
		add() { uni.navigateTo({ url: '/pages/quote/detail' }) }
	}
}
</script>

<style lang="scss" scoped>
.search-bar { padding: 20rpx 24rpx; background: #fff; }
.search-input { height: 78rpx; min-height: 78rpx; line-height: normal; background: #f3f4f6; border-radius: 999rpx; padding: 0 32rpx; font-size: 28rpx; }
.tabs { display: flex; background: #fff; padding: 0 24rpx 20rpx; gap: 16rpx; flex-wrap: wrap; }
.tab-item { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 26rpx; color: #6b7280; background: #f3f4f6; }
.tab-item.on { background: #2563eb; color: #fff; }
.order { margin: 16rpx 24rpx; }
.finance-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx; background: #f8fafc; border-radius: 12rpx; padding: 14rpx; }
.finance-num { display: block; font-size: 25rpx; font-weight: 700; margin-top: 4rpx; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
