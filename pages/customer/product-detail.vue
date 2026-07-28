<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<text class="t-title t-lg">{{ product.name }}</text>
			<text class="t-sub mt-s">{{ product.spec }} · {{ product.brand || '-' }}</text>
			<view class="row gap-s mt-m wrap">
				<text class="tag tag-orange" v-if="product.category">{{ product.category }}</text>
				<text class="tag tag-gray" v-if="product.attr1">{{ product.attr1 }}</text>
				<text class="tag tag-blue" v-if="product.attr2">{{ product.attr2 }}</text>
			</view>
		</view>

		<view class="card">
			<text class="t-title mb-m">基础信息</text>
			<view class="field"><text class="field-label">产品规格</text><text class="field-input">{{ product.spec || '-' }}</text></view>
			<view class="field"><text class="field-label">品牌</text><text class="field-input">{{ product.brand || '-' }}</text></view>
			<view class="field"><text class="field-label">分类标签</text><text class="field-input">{{ product.category || '-' }}</text></view>
			<view class="field"><text class="field-label">辅助属性</text><text class="field-input">{{ attrText }}</text></view>
			<view class="field"><text class="field-label">换算关系</text><text class="field-input">{{ unitText }}</text></view>
		</view>

		<view class="card">
			<text class="t-title mb-m">价格信息</text>
			<view class="field"><text class="field-label">建议销售价</text><text class="field-input t-price t-lg">{{ money(unitPrice('suggestPrice')) }}</text></view>
			<view class="field"><text class="field-label">零售价</text><text class="field-input">{{ money(unitPrice('retailPrice')) }}</text></view>
			<view class="field">
				<text class="field-label">单位</text>
				<picker class="field-input" :range="unitOptions" range-key="label" @change="pickUnit"><text>{{ selectedUnit }}</text></picker>
			</view>
		</view>

		<view style="margin: 30rpx 24rpx;">
			<button class="btn btn-ghost btn-block" open-type="share">转发商品</button>
			<button class="btn btn-block" @click="addToCart">加入申请报价</button>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { fmtMoney, toast } from '@/utils/format.js'
import { enableShareMenu, productShare } from '@/utils/share.js'
import { defaultUnit, fromBaseUnitPrice, productUnitOptions, unitFactor } from '@/utils/units.js'

export default {
	data() { return { id: '', product: {}, selectedUnit: '个' } },
	computed: {
		attrText() {
			return [this.product.attr1, this.product.attr2].filter(Boolean).join(' / ') || '-'
		},
		unitText() {
			const small = this.product.unitSmall || '个'
			const medium = this.product.unitMedium || '包'
			const large = this.product.unitLarge || '箱'
			const m2s = Number(this.product.mediumToSmall) || 0
			const l2m = Number(this.product.largeToMedium) || 0
			return `1${large}=${l2m}${medium}=${l2m * m2s}${small}`
		},
		unitOptions() {
			return productUnitOptions(this.product)
		}
	},
	onLoad(q) {
		enableShareMenu()
		if (q && q.id) {
			this.id = q.id
			this.product = db.get(T.PRODUCT, q.id) || {}
			this.selectedUnit = defaultUnit(this.product)
		}
	},
	onShareAppMessage() {
		return productShare(this.product, '/pages/customer/products')
	},
	methods: {
		money(n) { return fmtMoney(n) },
		unitPrice(field) { return fromBaseUnitPrice(this.product[field], this.product, this.selectedUnit) },
		pickUnit(e) {
			const option = this.unitOptions[Number(e.detail.value)]
			if (option) this.selectedUnit = option.value
		},
		addToCart() {
			const cart = uni.getStorageSync('sqms_cart') || []
			if (cart.find((c) => c._id === this.id)) return toast('已在报价清单中')
			cart.push({
				_id: this.id,
				name: this.product.name,
				spec: this.product.spec,
				suggestPrice: this.unitPrice('suggestPrice'),
				retailPrice: this.unitPrice('retailPrice'),
				unit: this.selectedUnit,
				unitFactor: unitFactor(this.product, this.selectedUnit),
				qty: 1,
				customerExpect: Number(this.unitPrice('suggestPrice')) || '',
				supplierQuotes: []
			})
			uni.setStorageSync('sqms_cart', cart)
			toast('已加入报价清单', 'success')
		}
	}
}
</script>

<style lang="scss" scoped>
.field-input { white-space: normal; word-break: break-all; line-height: 1.5; }
.btn-ghost { margin-bottom: 18rpx; box-shadow: none; background: #edf3ff; }
</style>
