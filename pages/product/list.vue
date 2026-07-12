<template>
	<view class="page">
		<global-stats />
		<view class="search-bar">
			<input class="search-input" v-model="kw" placeholder="搜索产品名称 / 规格 / 品牌" @input="load" />
			<view class="active-filter-row" v-if="kw">
				<text class="active-filter">筛选：{{ kw }}</text>
				<text class="clear-filter" @click="clearFilter">清除</text>
			</view>
		</view>

		<view class="empty" v-if="!list.length">暂无产品，点击右下角添加</view>

		<view class="card prod" v-for="p in list" :key="p._id" @click="go(p)">
			<view class="row-between">
				<view class="col flex1">
					<text class="t-title">{{ p.name }}</text>
					<view class="row gap-s mt-s wrap">
						<text class="tag tag-orange tag-tap" v-if="p.category" @click.stop="filterTag(p.category)">{{ p.category }}</text>
						<text class="tag tag-gray tag-tap" @click.stop="filterTag(p.spec)">{{ p.spec }}</text>
						<text class="tag tag-blue tag-tap" v-if="p.brand" @click.stop="filterTag(p.brand)">{{ p.brand }}</text>
						<text class="tag tag-gray tag-tap" v-if="p.attr1" @click.stop="filterTag(p.attr1)">{{ p.attr1 }}</text>
					</view>
				</view>
				<view class="col" style="align-items:flex-end;">
					<text class="t-price t-lg">{{ money(p.retailPrice) }}</text>
					<text class="t-muted" style="font-size:22rpx;">默认零售价</text>
					<button class="share-pill" open-type="share" :data-id="p._id" @click.stop>转发</button>
				</view>
			</view>
			<view class="divider"></view>
			<view class="row-between price-row">
				<text class="t-muted">零售 {{ money(p.retailPrice) }}</text>
				<text class="t-muted">建议 {{ money(p.suggestPrice) }}</text>
				<text class="t-muted">最低 {{ money(p.minPrice) }}</text>
			</view>
		</view>

		<view class="fab" @click="add">+</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { fmtMoney } from '@/utils/format.js'
import { enableShareMenu, productShare } from '@/utils/share.js'

export default {
	data() { return { list: [], kw: '' } },
	onShow() {
		enableShareMenu()
		this.load()
	},
	onShareAppMessage(res) {
		const id = res && res.target && res.target.dataset ? res.target.dataset.id : ''
		const product = id ? db.get(T.PRODUCT, id) : null
		return productShare(product, '/pages/customer/products')
	},
	methods: {
		money(n) { return fmtMoney(n) },
		load() {
			let list = db.list(T.PRODUCT, null, 'updateTime', true)
			const kw = this.kw.trim().toLowerCase()
			if (kw) {
				list = list.filter((p) => [p.name, p.spec, p.brand, p.category, p.attr1, p.attr2].filter(Boolean).join(' ').toLowerCase().indexOf(kw) >= 0)
			}
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
		go(p) { uni.navigateTo({ url: '/pages/product/detail?id=' + p._id }) },
		add() { uni.navigateTo({ url: '/pages/product/detail' }) }
	}
}
</script>

<style lang="scss" scoped>
.search-bar { padding: 20rpx 24rpx; background: #fff; }
.search-input { width: 100%; height: 78rpx; line-height: 78rpx; background: #f3f4f6; border-radius: 999rpx; padding: 0 32rpx; font-size: 28rpx; box-sizing: border-box; }
.active-filter-row { display: flex; flex-direction: row; align-items: center; gap: 14rpx; margin-top: 14rpx; }
.active-filter { max-width: 520rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 8rpx 16rpx; border-radius: 999rpx; background: #eef2ff; color: #2563eb; font-size: 24rpx; font-weight: 600; }
.clear-filter { color: #6b7280; font-size: 24rpx; padding: 8rpx 10rpx; }
.prod { margin: 16rpx 24rpx; }
.price-row { padding-top: 4rpx; }
.tag-tap:active { opacity: 0.72; }
.share-pill { margin: 12rpx 0 0; min-width: 112rpx; height: 54rpx; line-height: 54rpx; padding: 0 18rpx; border-radius: 999rpx; background: #edf3ff; color: #2563eb; font-size: 24rpx; box-shadow: none; }
.share-pill::after { border: none; }
</style>
