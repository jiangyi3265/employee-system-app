<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<text class="t-title mb-m">价格参数设置</text>
			<text class="t-sub mb-m">按百分比填写，5 表示 5%，120 表示 120%。保存时后台自动除以 100。</text>

			<view class="field">
				<text class="field-label">税率 m%</text>
				<input class="field-input" type="text" v-model="form.taxRate" placeholder="如 5" />
			</view>
			<view class="field">
				<text class="field-label">配送费率 N%</text>
				<input class="field-input" type="text" v-model="form.deliveryRate" placeholder="如 2" />
			</view>
			<view class="field">
				<text class="field-label">分摊运费率 O%</text>
				<input class="field-input" type="text" v-model="form.freightRate" placeholder="如 3" />
			</view>
			<view class="field">
				<text class="field-label">最低价 H%</text>
				<input class="field-input" type="text" v-model="form.minRatio" placeholder="如 105" />
			</view>
			<view class="field">
				<text class="field-label">零售价 I%</text>
				<input class="field-input" type="text" v-model="form.retailRatio" placeholder="如 135" />
			</view>
			<view class="field">
				<text class="field-label">建议价 J%</text>
				<input class="field-input" type="text" v-model="form.suggestRatio" placeholder="如 120" />
			</view>
		</view>

		<view class="card">
			<text class="t-title mb-m">默认单位换算模板</text>
			<view class="field">
				<text class="field-label">小单位</text>
				<input class="field-input" v-model="units.small" />
			</view>
			<view class="field">
				<text class="field-label">中单位</text>
				<input class="field-input" v-model="units.medium" />
			</view>
			<view class="field">
				<text class="field-label">大单位</text>
				<input class="field-input" v-model="units.large" />
			</view>
			<view class="field">
				<text class="field-label">1中=?小</text>
				<input class="field-input" type="number" v-model.number="units.mediumToSmall" />
			</view>
			<view class="field">
				<text class="field-label">1大=?中</text>
				<input class="field-input" type="number" v-model.number="units.largeToMedium" />
			</view>
		</view>

		<view style="margin: 30rpx 24rpx;">
			<button class="btn btn-block" @click="save">保存设置</button>
			<button class="btn btn-ghost btn-block mt-m" @click="syncAllProducts">同步更新所有产品价格</button>
		</view>
	</view>
</template>

<script>
import { calcPrices, getSettings, saveSettings } from '@/utils/pricing.js'
import { db } from '@/store/db.js'
import { T, DEFAULT_SETTINGS, DEFAULT_UNITS, ROLE } from '@/store/schema.js'
import { toast } from '@/utils/format.js'
import { getSession } from '@/utils/auth.js'

export default {
	data() {
		return {
			form: {},
			units: { ...DEFAULT_UNITS }
		}
	},
	onLoad() {
		const session = getSession()
		if (!session || session.role !== ROLE.ADMIN) {
			toast('无权访问价格设置')
			setTimeout(() => uni.navigateBack(), 300)
			return
		}
		const settings = getSettings()
		this.form = this.toPercentForm({ ...DEFAULT_SETTINGS, ...settings })
		const u = db.find(T.SETTINGS, { key: 'units' })
		if (u && u.value) this.units = { ...DEFAULT_UNITS, ...u.value }
	},
	methods: {
		toPercentForm(settings) {
			const form = {}
			Object.keys(DEFAULT_SETTINGS).forEach((key) => {
				form[key] = this.percentText(settings[key])
			})
			return form
		},
		percentText(value) {
			const n = (Number(value) || 0) * 100
			return Number.isInteger(n) ? String(n) : String(Math.round(n * 10000) / 10000)
		},
		parsePercent(value, fallback) {
			const text = String(value == null ? '' : value).replace(/%/g, '').trim()
			const n = Number(text)
			if (Number.isNaN(n)) return fallback
			return n / 100
		},
		buildSettings() {
			const current = getSettings()
			const next = {}
			Object.keys(DEFAULT_SETTINGS).forEach((key) => {
				next[key] = this.parsePercent(this.form[key], current[key] == null ? DEFAULT_SETTINGS[key] : current[key])
			})
			return next
		},
		save() {
			const settings = this.buildSettings()
			saveSettings(settings)
			const exist = db.find(T.SETTINGS, { key: 'units' })
			if (exist) db.update(T.SETTINGS, exist._id, { value: { ...this.units } })
			else db.insert(T.SETTINGS, { key: 'units', value: { ...this.units } })
			toast('已保存', 'success')
		},
		syncAllProducts() {
			const settings = this.buildSettings()
			saveSettings(settings)
			const products = db.list(T.PRODUCT)
			products.forEach((p) => {
				db.update(T.PRODUCT, p._id, calcPrices(p.purchasePrice, settings))
			})
			toast(`已同步 ${products.length} 个产品价格`, 'success')
		}
	}
}
</script>
