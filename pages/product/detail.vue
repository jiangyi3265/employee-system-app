<template>
	<view class="page">
		<global-stats />
		<!-- 基础信息 -->
		<view class="card">
			<text class="t-title mb-m">基础信息</text>
			<view class="field"><text class="field-label">产品名称*</text><input class="field-input" v-model="form.name" placeholder="不可重复" /></view>
			<view class="field"><text class="field-label">规格*</text><input class="field-input" v-model="form.spec" placeholder="必填" /></view>
			<view class="field"><text class="field-label">品牌</text><input class="field-input" v-model="form.brand" placeholder="选填" /></view>
			<view class="field"><text class="field-label">分类标签</text><input class="field-input" v-model="form.category" placeholder="用于筛选，如：断路器" /></view>
			<view class="field"><text class="field-label">辅助属性1</text><input class="field-input" v-model="form.attr1" placeholder="一级属性，如：微型断路器" /></view>
			<view class="field"><text class="field-label">辅助属性2</text><input class="field-input" v-model="form.attr2" placeholder="二级属性，如：1P" /></view>
		</view>

		<!-- 多单位换算 -->
		<view class="card">
			<text class="t-title mb-m">多单位换算</text>
			<view class="unit-grid">
				<view class="unit-box"><text class="unit-label">小单位</text><input class="unit-ipt" v-model="form.unitSmall" /></view>
				<view class="unit-box"><text class="unit-label">中单位</text><input class="unit-ipt" v-model="form.unitMedium" /></view>
				<view class="unit-box"><text class="unit-label">大单位</text><input class="unit-ipt" v-model="form.unitLarge" /></view>
			</view>
			<view class="convert-row"><text class="convert-label">1{{ form.unitMedium }} =</text><input class="convert-input" type="number" v-model.number="form.mediumToSmall" /><text class="convert-unit">{{ form.unitSmall }}</text></view>
			<view class="convert-row"><text class="convert-label">1{{ form.unitLarge }} =</text><input class="convert-input" type="number" v-model.number="form.largeToMedium" /><text class="convert-unit">{{ form.unitMedium }}</text></view>
			<view class="conv">换算：1{{ form.unitLarge }} = {{ form.largeToMedium }}{{ form.unitMedium }} = {{ totalSmall }}{{ form.unitSmall }}</view>
		</view>

		<!-- 价格 -->
		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">价格</text>
				<text class="t-primary" @click="recalc">按采购价重算</text>
			</view>
			<view class="field"><text class="field-label">采购价*</text><input class="field-input" type="digit" v-model.number="form.purchasePrice" @blur="recalc" placeholder="手动录入" /></view>
			<view class="field"><text class="field-label">成本价</text><input class="field-input" type="digit" v-model.number="form.costPrice" /></view>
			<view class="field"><text class="field-label">最低销售价</text><input class="field-input" type="digit" v-model.number="form.minPrice" /></view>
			<view class="field"><text class="field-label">建议销售价</text><input class="field-input" type="digit" v-model.number="form.suggestPrice" /></view>
			<view class="field"><text class="field-label">零售价</text><input class="field-input" type="digit" v-model.number="form.retailPrice" /></view>
			<text class="t-muted mt-s">说明：采购价手动录入，其余价格按全局参数自动生成，生成后可手动修改。</text>
		</view>

		<view class="card" v-if="id">
			<view class="row-between mb-m">
				<text class="t-title">价格历史</text>
				<view class="row gap-s">
					<picker mode="date" @change="historyStart = $event.detail.value; loadHistory()">
						<view class="filter-chip">{{ historyStart || '开始日期' }}</view>
					</picker>
					<picker mode="date" @change="historyEnd = $event.detail.value; loadHistory()">
						<view class="filter-chip">{{ historyEnd || '结束日期' }}</view>
					</picker>
				</view>
			</view>
			<view class="history-section">
				<text class="t-bold">最近成交价</text>
				<view class="history-row" v-for="it in recentDeals" :key="it._id">
					<text class="t-sub flex1">{{ it.customerName || customerName(it.customerId) }} · {{ it.employeeName || employeeName(it.employeeId) }}</text>
					<text class="t-price">{{ money(it.price) }}</text>
					<text class="t-muted">{{ fmt(it.updateTime || it.createTime) }}</text>
				</view>
				<text class="t-muted mt-s" v-if="!recentDeals.length">暂无有效成交价</text>
			</view>
			<view class="divider"></view>
			<view class="history-section">
				<text class="t-bold">最近报价</text>
				<view class="history-row" v-for="it in recentQuotes" :key="it._id">
					<text class="t-sub flex1">{{ it.customerName || customerName(it.customerId) }} · {{ it.employeeName || employeeName(it.employeeId) }}</text>
					<text class="t-price">{{ money(it.price) }}</text>
					<text class="t-muted">{{ fmt(it.updateTime || it.createTime) }}</text>
				</view>
				<text class="t-muted mt-s" v-if="!recentQuotes.length">暂无有效报价</text>
			</view>
			<view class="divider"></view>
			<view class="history-section">
				<text class="t-bold">同行报价</text>
				<view class="comp-row" v-for="q in compQuotes" :key="q._id">
					<text class="t-sub flex1">{{ q.competitorName || '-' }}</text>
					<input class="mini-ipt" type="digit" v-model.number="q.price" @blur="saveCompQuote(q)" />
					<text class="t-muted">{{ fmt(q.createTime) }}</text>
					<text class="t-danger text-action" @click="removeCompQuote(q)">删除</text>
				</view>
				<view class="row gap-s mt-m">
					<picker :range="competitors" :range-key="'name'" @change="pickCompetitor">
						<view class="input-box compact"><text :class="selCompName ? '' : 't-muted'">{{ selCompName || '选择同行' }}</text></view>
					</picker>
					<input class="input-box compact price-input" type="digit" v-model.number="compInputPrice" placeholder="报价" />
					<button class="btn btn-sm" @click="addCompQuote">录入</button>
				</view>
			</view>
		</view>

		<view style="margin: 30rpx 24rpx;">
			<button class="btn btn-block" @click="save">保存</button>
			<button class="btn btn-danger btn-block mt-m" v-if="id" @click="remove">删除产品</button>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { calcPrices, getSettings, isEffectiveQuoteItem } from '@/utils/pricing.js'
import { toast, confirmDialog, fmtMoney, fmtDate } from '@/utils/format.js'

export default {
	data() {
		return {
			id: '',
			form: {
				name: '', spec: '', brand: '', category: '', attr1: '', attr2: '',
				unitSmall: '个', unitMedium: '包', unitLarge: '箱',
				mediumToSmall: 12, largeToMedium: 12,
				purchasePrice: 0, costPrice: 0, minPrice: 0, suggestPrice: 0, retailPrice: 0
			},
			recentDeals: [],
			recentQuotes: [],
			compQuotes: [],
			competitors: [],
			selCompId: '',
			selCompName: '',
			compInputPrice: '',
			historyStart: '',
			historyEnd: ''
		}
	},
	computed: {
		totalSmall() { return (Number(this.form.largeToMedium) || 0) * (Number(this.form.mediumToSmall) || 0) }
	},
	onLoad(q) {
		if (q && q.id) {
			this.id = q.id
			const p = db.get(T.PRODUCT, q.id)
			if (p) this.form = { ...this.form, ...p }
			this.loadHistory()
			uni.setNavigationBarTitle({ title: '编辑产品' })
		} else {
			uni.setNavigationBarTitle({ title: '新增产品' })
		}
		this.competitors = db.list(T.COMPETITOR, null, 'name')
	},
	methods: {
		money(n) { return fmtMoney(n) },
		fmt(t) { return fmtDate(t) },
		dateStart(date) {
			if (!date) return 0
			const d = new Date(date.replace(/-/g, '/'))
			d.setHours(0, 0, 0, 0)
			return d.getTime()
		},
		dateEnd(date) {
			if (!date) return Infinity
			const d = new Date(date.replace(/-/g, '/'))
			d.setHours(23, 59, 59, 999)
			return d.getTime()
		},
		inRange(ts) {
			const t = ts || 0
			return t >= this.dateStart(this.historyStart) && t <= this.dateEnd(this.historyEnd)
		},
		customerName(id) {
			const c = db.get(T.CUSTOMER, id)
			return c ? c.name : '-'
		},
		employeeName(id) {
			const e = db.get(T.EMPLOYEE, id)
			return e ? e.name : '-'
		},
		loadHistory() {
			if (!this.id) return
			this.recentDeals = db.list(T.QUOTE_ITEM, { productId: this.id, status: 'done' }, 'updateTime', true)
				.filter(isEffectiveQuoteItem)
				.filter((it) => this.inRange(it.updateTime || it.createTime))
				.slice(0, 3)
			this.recentQuotes = db.list(T.QUOTE_ITEM, { productId: this.id }, 'updateTime', true)
				.filter((it) => it.status !== 'done')
				.filter(isEffectiveQuoteItem)
				.filter((it) => this.inRange(it.updateTime || it.createTime))
				.slice(0, 3)
			this.compQuotes = db.list(T.COMP_QUOTE, { productId: this.id }, 'createTime', true).slice(0, 3)
		},
		recalc() {
			const prices = calcPrices(this.form.purchasePrice, getSettings())
			this.form.costPrice = prices.costPrice
			this.form.minPrice = prices.minPrice
			this.form.suggestPrice = prices.suggestPrice
			this.form.retailPrice = prices.retailPrice
		},
		save() {
			const f = this.form
			if (!f.name.trim()) return toast('请输入产品名称')
			if (!f.spec.trim()) return toast('规格不能为空')
			// 产品名称按需求保持唯一；同类不同规格请把规格/属性写入名称，避免客户选择时重名。
			const dup = db.list(T.PRODUCT).find((p) => p.name === f.name.trim() && p._id !== this.id)
			if (dup) return toast('产品名称不可重复')
			const data = { ...f, name: f.name.trim(), spec: f.spec.trim() }
			if (this.id) db.update(T.PRODUCT, this.id, data)
			else db.insert(T.PRODUCT, data)
			toast('已保存', 'success')
			setTimeout(() => uni.navigateBack(), 300)
		},
		pickCompetitor(e) {
			const c = this.competitors[e.detail.value]
			if (c) { this.selCompId = c._id; this.selCompName = c.name }
		},
		addCompQuote() {
			if (!this.id) return
			if (!this.selCompId) return toast('请选择同行')
			const price = Number(this.compInputPrice) || 0
			if (price <= 0) return toast('请输入有效报价')
			db.insert(T.COMP_QUOTE, {
				productId: this.id,
				competitorId: this.selCompId,
				competitorName: this.selCompName,
				price
			})
			this.selCompId = ''
			this.selCompName = ''
			this.compInputPrice = ''
			this.loadHistory()
			toast('已录入同行报价', 'success')
		},
		saveCompQuote(q) {
			db.update(T.COMP_QUOTE, q._id, { price: Number(q.price) || 0 })
			toast('同行报价已更新', 'success')
			this.loadHistory()
		},
		async removeCompQuote(q) {
			if (await confirmDialog('确定删除该同行报价？')) {
				db.remove(T.COMP_QUOTE, q._id)
				this.loadHistory()
			}
		},
		async remove() {
			if (await confirmDialog('确定删除该产品？')) {
				db.remove(T.PRODUCT, this.id)
				toast('已删除', 'success')
				setTimeout(() => uni.navigateBack(), 300)
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.unit-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14rpx; }
.unit-box { min-height: 112rpx; display: flex; flex-direction: column; justify-content: center; gap: 10rpx; background: #f8fafc; border: 1rpx solid #e8edf5; border-radius: 14rpx; padding: 14rpx 12rpx; }
.unit-label { color: #6b7280; font-size: 23rpx; text-align: center; line-height: 1.2; }
.unit-ipt { min-height: 48rpx; line-height: 48rpx; background: #fff; border-radius: 10rpx; padding: 0 10rpx; text-align: center; font-size: 26rpx; }
.convert-row { display: flex; flex-direction: row; align-items: center; min-height: 82rpx; margin-top: 16rpx; background: #f8fafc; border: 1rpx solid #e8edf5; border-radius: 14rpx; padding: 0 18rpx; }
.convert-label { width: 150rpx; color: #374151; font-size: 27rpx; font-weight: 600; }
.convert-input { flex: 1; min-height: 54rpx; line-height: 54rpx; background: #fff; border-radius: 10rpx; padding: 0 16rpx; text-align: center; font-size: 27rpx; }
.convert-unit { width: 120rpx; color: #6b7280; font-size: 26rpx; text-align: right; }
.conv { margin-top: 20rpx; background: #eff6ff; color: #2563eb; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; line-height: 1.5; word-break: break-all; }
.filter-chip { background: #f3f6fb; border: 1rpx solid #e8edf5; border-radius: 999rpx; padding: 10rpx 16rpx; font-size: 23rpx; color: #4b5563; }
.history-section { padding: 8rpx 0; }
.history-row, .comp-row { display: flex; flex-direction: row; align-items: center; gap: 12rpx; padding: 14rpx 0; border-bottom: 1rpx dashed #edf1f6; }
.history-row:last-child, .comp-row:last-child { border-bottom: none; }
.mini-ipt { width: 130rpx; background: #f7f8fa; border-radius: 8rpx; padding: 8rpx 12rpx; font-size: 26rpx; text-align: center; }
.compact { padding: 12rpx 16rpx; font-size: 25rpx; min-width: 160rpx; }
.price-input { width: 150rpx; min-width: 0; }
.text-action { font-size: 24rpx; padding: 8rpx; }
</style>
