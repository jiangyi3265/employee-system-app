<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">供应商档案</text>
			<text class="sub-hero-desc">记录产品供应商和联系方式，方便采购时快速查找对接</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ all.length }}</text><text class="metric-label">合作商</text></view>
				<view class="metric-pill"><text class="metric-num">{{ activeWithProducts }}</text><text class="metric-label">关联产品</text></view>
			</view>
		</view>

		<view class="toolbar">
			<input class="toolbar-search" v-model="kw" placeholder="搜索供应商名称 / 联系人 / 手机号" @input="load" />
		</view>

		<view class="sub-empty" v-if="!list.length">暂无匹配供应商，点击右下角新增</view>

		<view class="list-card sup" v-for="s in list" :key="s._id" @click="go(s._id)">
			<view class="row-between">
				<view class="col flex1">
					<text class="t-title" style="font-size:30rpx;">{{ s.name }}</text>
					<text class="t-sub mt-s">联系人：{{ s.contact || '-' }} · 手机：{{ s.phone || '-' }}</text>
					<text class="meta-line">地址：{{ s.address || '-' }}</text>
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
		activeWithProducts() {
			const products = db.list(T.PRODUCT)
			const sups = products.map((p) => p.supplierId).filter(Boolean)
			return new Set(sups).size
		}
	},
	onShow() { this.load() },
	methods: {
		load() {
			this.all = db.list(T.SUPPLIER, null, 'createTime', true)
			let list = this.all
			const kw = this.kw.trim()
			if (kw) list = list.filter((s) => (s.name + (s.contact || '') + (s.phone || '')).indexOf(kw) >= 0)
			this.list = list
		},
		go(id) { uni.navigateTo({ url: '/pages/archive/edit?type=supplier&id=' + id }) },
		add() { uni.navigateTo({ url: '/pages/archive/edit?type=supplier' }) }
	}
}
</script>

<style lang="scss" scoped>
.sup:active { transform: scale(0.995); }
</style>
