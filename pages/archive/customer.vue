<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">客户档案</text>
			<text class="sub-hero-desc">集中管理客户资料、审核状态和公私盘归属</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ all.length }}</text><text class="metric-label">客户数</text></view>
				<view class="metric-pill"><text class="metric-num">{{ pendingCount }}</text><text class="metric-label">待审核</text></view>
				<view class="metric-pill"><text class="metric-num">{{ privateCount }}</text><text class="metric-label">私盘</text></view>
			</view>
		</view>
		<view class="toolbar">
			<input class="toolbar-search" v-model="kw" placeholder="搜索客户名称 / 公司 / 手机号" @input="load" />
		</view>
		<view class="sub-empty" v-if="!list.length">暂无客户，点击右下角新增客户</view>
		<view class="list-card cust" v-for="c in list" :key="c._id" @click="go(c._id)">
			<view class="row-between">
				<view class="col flex1">
					<view class="row gap-s">
						<text class="t-title" style="font-size:30rpx;">{{ c.name }}</text>
						<text class="tag" :class="gradeTag(c.grade)">{{ c.grade }}级</text>
						<text class="tag tag-blue" v-if="c.pool === 'private'">私盘</text>
						<text class="tag tag-gray" v-else>公盘</text>
					</view>
					<text class="t-sub mt-s">{{ c.phone }} · {{ c.company || '无公司' }}</text>
				</view>
				<text class="tag" :class="c.approved ? 'tag-green' : 'tag-orange'">{{ c.approved ? '已审核' : '待审核' }}</text>
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
		pendingCount() { return this.all.filter((c) => !c.approved).length },
		privateCount() { return this.all.filter((c) => c.pool === 'private').length }
	},
	onShow() { this.load() },
	methods: {
		gradeTag(g) { return { A: 'tag-red', B: 'tag-orange', C: 'tag-blue' }[g] || 'tag-gray' },
		load() {
			this.all = db.list(T.CUSTOMER, null, 'createTime', true)
			let list = this.all
			const kw = this.kw.trim()
			if (kw) list = list.filter((c) => (c.name + c.phone + (c.company || '')).indexOf(kw) >= 0)
			this.list = list
		},
		go(id) { uni.navigateTo({ url: '/pages/archive/customer-detail?id=' + id }) },
		add() { uni.navigateTo({ url: '/pages/archive/edit?type=customer' }) }
	}
}
</script>

<style lang="scss" scoped>
.cust:active { transform: scale(0.995); }
</style>
