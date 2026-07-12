<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">商品展厅</text>
			<text class="sub-hero-desc">浏览平台精选商品，可一键加入清单并向我们申请专属特惠报价</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ all.length }}</text><text class="metric-label">精选商品</text></view>
				<view class="metric-pill"><text class="metric-num">{{ brandCount }}</text><text class="metric-label">合作品牌</text></view>
				<view class="metric-pill" @click="goCart"><text class="metric-num t-price">{{ cartCount }}</text><text class="metric-label">待申清单 ➔</text></view>
			</view>
		</view>

		<view class="toolbar">
			<input class="toolbar-search" v-model="kw" placeholder="输入商品名称 / 规格 / 品牌进行搜索" @input="load" />
			<view class="active-filter-row" v-if="kw">
				<text class="active-filter">筛选：{{ kw }}</text>
				<text class="clear-filter" @click="clearFilter">清除</text>
			</view>
		</view>

		<view class="sub-empty" v-if="!list.length">暂无匹配商品</view>

		<view class="list-card prod" v-for="p in list" :key="p._id" @click="go(p._id)">
			<view class="row-between">
				<view class="col flex1">
					<text class="t-title" style="font-size:30rpx;">{{ p.name }}</text>
					<text class="t-sub mt-s">规格：{{ p.spec }} · 品牌：{{ p.brand || '-' }}</text>
					<view class="row gap-s mt-s wrap" v-if="p.category || p.brand || p.attr1 || p.attr2">
						<text class="tag tag-orange tag-tap" v-if="p.category" @click.stop="filterTag(p.category)">{{ p.category }}</text>
						<text class="tag tag-blue tag-tap" v-if="p.brand" @click.stop="filterTag(p.brand)">{{ p.brand }}</text>
						<text class="tag tag-gray tag-tap" v-if="p.attr1" @click.stop="filterTag(p.attr1)">{{ p.attr1 }}</text>
						<text class="tag tag-gray tag-tap" v-if="p.attr2" @click.stop="filterTag(p.attr2)">{{ p.attr2 }}</text>
					</view>
				</view>
				<view class="col" style="align-items:flex-end;">
					<text class="t-price t-lg">{{ money(p.suggestPrice) }}</text>
					<text class="t-muted mt-s" style="font-size:22rpx;">零售价: {{ money(p.retailPrice) }}</text>
					<text class="inline-action mt-s">查看详情</text>
					<button class="share-pill" open-type="share" :data-id="p._id" @click.stop>转发</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { fmtMoney } from '@/utils/format.js'
import { enableShareMenu, productShare } from '@/utils/share.js'

export default {
	data() { return { list: [], all: [], kw: '', cartCount: 0 } },
	computed: {
		brandCount() {
			const brands = this.all.map((p) => p.brand).filter(Boolean)
			return new Set(brands).size
		}
	},
	onShow() {
		enableShareMenu()
		this.load()
		const cart = uni.getStorageSync('sqms_cart') || []
		this.cartCount = cart.length
	},
	onShareAppMessage(res) {
		const id = res && res.target && res.target.dataset ? res.target.dataset.id : ''
		const product = id ? db.get(T.PRODUCT, id) : null
		return productShare(product, '/pages/customer/products')
	},
	methods: {
		money(n) { return fmtMoney(n) },
		load() {
			this.all = db.list(T.PRODUCT, null, 'updateTime', true)
			let list = this.all
			const kw = this.kw.trim().toLowerCase()
			if (kw) list = list.filter((p) => [p.name, p.spec, p.brand, p.category, p.attr1, p.attr2].filter(Boolean).join(' ').toLowerCase().indexOf(kw) >= 0)
			this.list = list
		},
		filterTag(value) {
			const text = String(value || '').trim()
			if (!text) return
			this.kw = text
			this.load()
		},
		clearFilter() {
			this.kw = ''
			this.load()
		},
		go(id) { uni.navigateTo({ url: '/pages/customer/product-detail?id=' + id }) },
		goCart() { uni.navigateTo({ url: '/pages/customer/cart' }) }
	}
}
</script>

<style lang="scss" scoped>
.prod:active { transform: scale(0.995); }
.active-filter-row { display: flex; flex-direction: row; align-items: center; gap: 14rpx; margin-top: 14rpx; }
.active-filter { max-width: 520rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 8rpx 16rpx; border-radius: 999rpx; background: #eef2ff; color: #2563eb; font-size: 24rpx; font-weight: 600; }
.clear-filter { color: #6b7280; font-size: 24rpx; padding: 8rpx 10rpx; }
.tag-tap:active { opacity: 0.72; }
.share-pill { margin: 12rpx 0 0; min-width: 112rpx; height: 54rpx; line-height: 54rpx; padding: 0 18rpx; border-radius: 999rpx; background: #edf3ff; color: #2563eb; font-size: 24rpx; box-shadow: none; }
.share-pill::after { border: none; }
</style>
