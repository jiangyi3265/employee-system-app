<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">同行档案</text>
			<text class="sub-hero-desc">管理同行竞争对手及其实时报价记录，提供智能定价对比依据</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ all.length }}</text><text class="metric-label">同行数</text></view>
				<view class="metric-pill"><text class="metric-num">{{ quoteCount }}</text><text class="metric-label">已录报价</text></view>
			</view>
		</view>

		<view class="toolbar">
			<input class="toolbar-search" v-model="kw" placeholder="搜索同行名称 / 联系人 / 手机号" @input="load" />
		</view>

		<view class="sub-empty" v-if="!list.length">暂无匹配同行，点击右下角新增</view>

		<view class="list-card comp" v-for="c in list" :key="c._id" @click="go(c._id)">
			<view class="row-between">
				<view class="col flex1">
					<text class="t-title" style="font-size:30rpx;">{{ c.name }}</text>
					<text class="t-sub mt-s">联系人：{{ c.contact || '-' }} · 手机：{{ c.phone || '-' }}</text>
					<text class="meta-line">累计报价：{{ getCompQuotesCount(c._id) }} 次</text>
				</view>
				<text class="inline-action">编辑</text>
			</view>
		</view>
		<view class="fab" @click="add">+</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'

export default {
	data() { return { list: [], all: [], kw: '' } },
	computed: {
		quoteCount() {
			return db.list(T.COMP_QUOTE).length
		}
	},
	onShow() { this.load() },
	methods: {
		getCompQuotesCount(id) {
			return db.list(T.COMP_QUOTE, { competitorId: id }).length
		},
		load() {
			this.all = db.list(T.COMPETITOR, null, 'createTime', true)
			let list = this.all
			const kw = this.kw.trim()
			if (kw) list = list.filter((c) => (c.name + (c.contact || '') + (c.phone || '')).indexOf(kw) >= 0)
			this.list = list
		},
		go(id) { uni.navigateTo({ url: '/pages/archive/edit?type=competitor&id=' + id }) },
		add() { uni.navigateTo({ url: '/pages/archive/edit?type=competitor' }) }
	}
}
</script>

<style lang="scss" scoped>
.comp:active { transform: scale(0.995); }
</style>
