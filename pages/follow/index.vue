<template>
	<view class="page">
		<global-stats />
		<view class="search-bar">
			<input class="search-input" v-model="kw" placeholder="搜索客户 / 员工" @input="load" />
		</view>
		<view class="tabs">
			<view class="tab-item" :class="{ on: tab === 'warning' }" @click="tab = 'warning'; load()">预警</view>
			<view class="tab-item" :class="{ on: tab === 'all' }" @click="tab = 'all'; load()">全部</view>
			<view class="tab-item" :class="{ on: tab === 'quoted' }" @click="tab = 'quoted'; load()">已报价</view>
			<view class="tab-item" :class="{ on: tab === 'unquoted' }" @click="tab = 'unquoted'; load()">未报价</view>
			<view class="tab-item" :class="{ on: tab === 'dealt' }" @click="tab = 'dealt'; load()">已成交</view>
		</view>

		<view class="empty" v-if="!list.length">暂无跟进数据</view>

		<view class="card" v-for="f in list" :key="f.customer._id" @click="go(f.customer._id)">
			<view class="row-between">
				<view class="col flex1">
					<view class="row gap-s">
						<text class="t-title" style="font-size:30rpx;">{{ f.customer.name }}</text>
						<text class="tag" :class="catTag(f.category)">{{ f.categoryLabel }}</text>
					</view>
					<view class="row gap-s mt-s wrap">
						<text class="tag tag-orange">{{ quoteGap(f) }}</text>
						<text class="tag tag-green">{{ dealGap(f) }}</text>
					</view>
					<text class="t-sub mt-s">{{ f.customer.phone }} · {{ f.customer.company || '无公司' }}</text>
					<text class="t-muted mt-s" v-if="f.employeeName">最近报价员工：{{ f.employeeName }}</text>
				</view>
				<view class="col" style="align-items:flex-end;">
					<text class="t-danger t-bold" v-if="f.warning">{{ f.days }}天未跟进</text>
					<text class="t-success" v-else>已跟进</text>
					<text class="t-muted mt-s">报价{{ f.orderCount }}次 · 跟进{{ f.followCount }}次</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getSession } from '@/utils/auth.js'
import { ROLE } from '@/store/schema.js'
import { followList } from '@/utils/stats.js'

export default {
	data() { return { list: [], tab: 'warning', kw: '', session: {} } },
	onShow() {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.load()
	},
	methods: {
		catTag(c) { return { unquoted: 'tag-gray', quotedUndeal: 'tag-orange', dealt: 'tag-green' }[c] || 'tag-gray' },
		quoteGap(f) { return f.lastQuoteDays == null ? '未报价' : `距上次报价${f.lastQuoteDays}天` },
		dealGap(f) { return f.lastDealDays == null ? '未成交' : `距上次成交${f.lastDealDays}天` },
		load() {
			const empId = this.session.role === ROLE.EMPLOYEE ? this.session.id : ''
			let list = followList(empId)
			if (this.tab === 'warning') list = list.filter((f) => f.warning)
			else if (this.tab === 'dealt') list = list.filter((f) => f.category === 'dealt')
			else if (this.tab === 'quoted') list = list.filter((f) => f.category === 'quotedUndeal')
			else if (this.tab === 'unquoted') list = list.filter((f) => f.category === 'unquoted' && f.customerDays <= 10)
			const kw = this.kw.trim()
			if (kw) {
				list = list.filter((f) => {
					const text = [
						f.customer.name,
						f.customer.phone,
						f.customer.company,
						f.employeeName
					].filter(Boolean).join(' ')
					return text.indexOf(kw) >= 0
				})
			}
			this.list = list
		},
		go(id) { uni.navigateTo({ url: '/pages/follow/customer?id=' + id }) }
	}
}
</script>

<style lang="scss" scoped>
.search-bar { padding: 20rpx 24rpx 0; background: #fff; }
.search-input { height: 78rpx; min-height: 78rpx; line-height: normal; background: #f3f4f6; border-radius: 999rpx; padding: 0 32rpx; font-size: 28rpx; }
.tabs { display: flex; background: #fff; padding: 20rpx 24rpx; gap: 16rpx; flex-wrap: wrap; }
.tab-item { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 26rpx; color: #6b7280; background: #f3f4f6; }
.tab-item.on { background: #2563eb; color: #fff; }
</style>
