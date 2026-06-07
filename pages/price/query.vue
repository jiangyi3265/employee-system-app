<template>
	<view class="page">
		<global-stats />

		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">价格查询</text>
				<text class="inline-action" @click="reset">重置</text>
			</view>
			<input class="input-box search-ipt" v-model="productKw" placeholder="搜索商品名称 / 规格" />
			<view class="field">
				<text class="field-label">商品</text>
				<picker :range="productOptions" :range-key="'label'" @change="pickProduct">
					<view class="field-input picker-text">
						<text :class="product ? '' : 't-muted'">{{ product ? product.name : '选择商品' }}</text>
					</view>
				</picker>
			</view>
			<view class="field">
				<text class="field-label">客户</text>
				<picker :range="customerOptions" :range-key="'label'" @change="pickCustomer">
					<view class="field-input picker-text">
						<text :class="customerId ? '' : 't-muted'">{{ customer ? customer.name : '全部客户' }}</text>
					</view>
				</picker>
			</view>
			<text class="t-muted mt-s">不选择客户时，展示该商品每个客户最近一条报价/成交记录。</text>
		</view>

		<view class="card" v-if="product">
			<view class="row-between">
				<view class="col flex1">
					<text class="t-title" style="font-size:30rpx;">{{ product.name }}</text>
					<text class="t-sub mt-s">{{ product.spec }} · {{ product.brand || '-' }}</text>
				</view>
				<text class="t-price t-lg">{{ money(product.suggestPrice) }}</text>
			</view>
			<view class="price-grid mt-m">
				<view><text class="t-muted">成本价</text><text class="price-num">{{ money(product.costPrice) }}</text></view>
				<view><text class="t-muted">最低价</text><text class="price-num">{{ money(product.minPrice) }}</text></view>
				<view><text class="t-muted">建议价</text><text class="price-num">{{ money(product.suggestPrice) }}</text></view>
				<view><text class="t-muted">零售价</text><text class="price-num">{{ money(product.retailPrice) }}</text></view>
			</view>
		</view>

		<view class="card" v-if="product">
			<view class="row-between mb-m">
				<text class="t-title">客户比价商家</text>
				<text class="inline-action" @click="clearCompetitors">清空</text>
			</view>
			<view class="empty-lite" v-if="!competitorRows.length">暂无同行/供货商报价</view>
			<view class="competitor-grid" v-else>
				<view
					class="competitor-chip"
					:class="{ on: selectedCompetitorKeys.includes(row.key) }"
					v-for="row in competitorRows"
					:key="row.key"
					@click="toggleCompetitor(row)"
				>
					<text class="chip-name">{{ row.name }}</text>
					<text class="chip-price">{{ money(row.price) }}</text>
					<text class="chip-date">{{ fmt(row.time) }}</text>
				</view>
			</view>
			<view class="summary-box mt-m" v-if="selectedCompetitorRows.length">
				<text class="t-muted">已选 {{ selectedCompetitorRows.length }} 家，三方最低参考</text>
				<text class="t-price t-lg">{{ money(selectedCompetitorMin) }}</text>
			</view>
			<text class="t-muted mt-s" v-else>勾选客户实际询价的同行/供货商后，系统只用已选范围计算最低参考价。</text>
		</view>

		<view class="card" v-if="recommendation">
			<view class="row-between">
				<text class="t-title">最终报价参考</text>
				<text class="t-price t-lg">{{ money(recommendation.price) }}</text>
			</view>
			<text class="t-sub mt-s">依据：{{ recommendation.basis }} · 利润率 {{ recommendation.profitRate }}%</text>
			<text class="t-sub mt-s">历史成交优先：{{ historyBasisText }}</text>
			<text class="t-sub mt-s" v-if="selectedCompetitorMin">同行比较最低：{{ money(selectedCompetitorMin) }}</text>
			<text class="t-danger mt-s" v-if="recommendation.warning">{{ recommendation.warning }}</text>
			<button class="btn btn-ghost btn-block mt-m" @click="copyReference">复制报价参考</button>
		</view>

		<view class="card" v-if="product">
			<text class="t-title mb-m">{{ customerId ? '该客户历史成交价' : '历史成交价（每客户最近一条）' }}</text>
			<view class="price-row" v-for="row in dealRows" :key="row.key">
				<view class="col flex1">
					<text class="t-bold" style="font-size:27rpx;">{{ row.name }}</text>
					<text class="t-muted mt-s">{{ row.sub || '-' }} · {{ fmt(row.time) }}</text>
				</view>
				<text class="t-price">{{ money(row.price) }}</text>
			</view>
			<view class="empty-lite" v-if="!dealRows.length">暂无成交记录</view>
		</view>

		<view class="card" v-if="product">
			<text class="t-title mb-m">{{ customerId ? '该客户历史报价' : '历史报价（每客户最近一条）' }}</text>
			<view class="price-row" v-for="row in quoteRows" :key="row.key">
				<view class="col flex1">
					<text class="t-bold" style="font-size:27rpx;">{{ row.name }}</text>
					<text class="t-muted mt-s">{{ row.sub || '-' }} · {{ fmt(row.time) }}</text>
				</view>
				<text class="t-price">{{ money(row.price) }}</text>
			</view>
			<view class="empty-lite" v-if="!quoteRows.length">暂无报价记录</view>
		</view>

		<view class="card" v-if="product">
			<text class="t-title mb-m">同行/供货商历史报价（每家最近一条）</text>
			<view class="price-row" v-for="row in competitorRows" :key="row.key">
				<view class="col flex1">
					<text class="t-bold" style="font-size:27rpx;">{{ row.name }}</text>
					<text class="t-muted mt-s">{{ row.sub || '-' }} · {{ fmt(row.time) }}</text>
				</view>
				<text class="t-price">{{ money(row.price) }}</text>
			</view>
			<view class="empty-lite" v-if="!competitorRows.length">暂无同行/供货商报价</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtDate, fmtMoney, toast } from '@/utils/format.js'
import { isEffectiveQuoteItem, recommendQuote } from '@/utils/pricing.js'

export default {
	data() {
		return {
			session: {},
			productId: '',
			customerId: '',
			productKw: '',
			selectedCompetitorKeys: []
		}
	},
	computed: {
		products() {
			return db.list(T.PRODUCT, null, 'updateTime', true)
		},
		customers() {
			return db.list(T.CUSTOMER, { approved: true }, 'name')
		},
		product() {
			return this.productId ? db.get(T.PRODUCT, this.productId) : null
		},
		customer() {
			return this.customerId ? db.get(T.CUSTOMER, this.customerId) : null
		},
		productOptions() {
			const kw = this.productKw.trim()
			const rows = kw
				? this.products.filter((p) => `${p.name || ''}${p.spec || ''}${p.brand || ''}`.includes(kw))
				: this.products
			return rows.map((p) => ({ ...p, label: `${p.name} · ${p.spec || '-'}` }))
		},
		customerOptions() {
			return [{ _id: '', label: '全部客户' }].concat(this.customers.map((c) => ({ ...c, label: `${c.name} · ${c.company || c.phone || '-'}` })))
		},
		dealRows() {
			return this.latestQuoteRows('done', this.customerId)
		},
		globalDealRows() {
			return this.latestQuoteRows('done', '')
		},
		quoteRows() {
			return this.latestQuoteRows('quote', this.customerId)
		},
		competitorRows() {
			if (!this.productId) return []
			const rows = db.list(T.COMP_QUOTE, { productId: this.productId })
				.map((row) => this.enrichCompetitor(row))
				.sort((a, b) => b.time - a.time)
			return this.latestBy(rows, (row) => row.key)
		},
		selectedCompetitorRows() {
			return this.competitorRows.filter((row) => this.selectedCompetitorKeys.includes(row.key))
		},
		selectedCompetitorMin() {
			if (!this.selectedCompetitorRows.length) return null
			const prices = this.selectedCompetitorRows.map((row) => Number(row.price) || 0).filter((price) => price > 0)
			return prices.length ? Math.min(...prices) : null
		},
		historyDealRow() {
			if (this.customerId && this.dealRows.length) return this.dealRows[0]
			return this.globalDealRows.length ? this.globalDealRows[0] : null
		},
		historyBasisText() {
			if (!this.historyDealRow) return '暂无历史成交价'
			const prefix = this.customerId && this.dealRows.length ? '该客户' : '全客户'
			return `${prefix} ${this.historyDealRow.name} ${this.money(this.historyDealRow.price)}`
		},
		recommendation() {
			if (!this.product) return null
			return recommendQuote({
				suggestPrice: this.product.suggestPrice,
				minPrice: this.product.minPrice,
				costPrice: this.product.costPrice,
				recentDeal: this.historyDealRow ? Number(this.historyDealRow.price) : null,
				competitorMin: this.selectedCompetitorMin
			})
		}
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		if (s.role === ROLE.CUSTOMER) {
			toast('价格查询为内部功能')
			setTimeout(() => uni.navigateBack(), 300)
			return
		}
		this.session = s
		this.productId = (q && q.productId) || ''
		this.customerId = (q && q.customerId) || ''
	},
	methods: {
		money(n) { return fmtMoney(n) },
		fmt(t) { return fmtDate(t) },
		pickProduct(e) {
			const item = this.productOptions[e.detail.value]
			this.productId = item ? item._id : ''
			this.selectedCompetitorKeys = []
		},
		pickCustomer(e) {
			const item = this.customerOptions[e.detail.value]
			this.customerId = item ? item._id : ''
		},
		reset() {
			this.productId = ''
			this.customerId = ''
			this.productKw = ''
			this.selectedCompetitorKeys = []
		},
		clearCompetitors() {
			this.selectedCompetitorKeys = []
		},
		toggleCompetitor(row) {
			const index = this.selectedCompetitorKeys.indexOf(row.key)
			if (index >= 0) this.selectedCompetitorKeys.splice(index, 1)
			else this.selectedCompetitorKeys.push(row.key)
		},
		latestQuoteRows(type, customerId = '') {
			if (!this.productId) return []
			let rows = db.list(T.QUOTE_ITEM, { productId: this.productId }, 'updateTime', true)
				.filter(isEffectiveQuoteItem)
				.filter((row) => type === 'done' ? row.status === 'done' : row.status !== 'done')
			if (customerId) rows = rows.filter((row) => row.customerId === customerId)
			const mapped = rows.map((row) => this.enrichQuote(row)).sort((a, b) => b.time - a.time)
			return this.latestBy(mapped, (row) => row.customerId || row.name)
		},
		latestBy(rows, keyGetter) {
			const seen = {}
			const list = []
			rows.forEach((row) => {
				const key = keyGetter(row)
				if (!key || seen[key]) return
				seen[key] = true
				list.push(row)
			})
			return list
		},
		enrichQuote(row) {
			const customer = row.customerName || this.nameOf(T.CUSTOMER, row.customerId) || '未知客户'
			const employee = row.employeeName || this.nameOf(T.EMPLOYEE, row.employeeId) || '未知员工'
			const time = Number(row.updateTime || row.createTime) || 0
			return {
				...row,
				key: row._id,
				name: customer,
				customerId: row.customerId,
				sub: employee,
				price: Number(row.price) || 0,
				time
			}
		},
		enrichCompetitor(row) {
			const name = row.competitorName || row.supplierName || this.nameOf(T.COMPETITOR, row.competitorId) || this.nameOf(T.SUPPLIER, row.supplierId) || '未知供货商'
			const key = row.competitorId || row.supplierId || name
			return {
				...row,
				key,
				name,
				sub: row.source === 'customerSupplierQuote' ? '客户提供供货商报价' : '同行/供货商',
				price: Number(row.price) || 0,
				time: Number(row.createTime || row.updateTime) || 0
			}
		},
		nameOf(table, id) {
			const row = id ? db.get(table, id) : null
			return row ? row.name : ''
		},
		copyReference() {
			if (!this.recommendation || !this.product) return
			const names = this.selectedCompetitorRows.map((row) => `${row.name}:${this.money(row.price)}`).join('；') || '未选择'
			const text = [
				`商品：${this.product.name}`,
				`客户：${this.customer ? this.customer.name : '全部客户'}`,
				`三方询价：${names}`,
				`历史成交：${this.historyBasisText}`,
				`建议报价：${this.money(this.recommendation.price)}`,
				`依据：${this.recommendation.basis}`,
				this.recommendation.warning ? `提示：${this.recommendation.warning}` : ''
			].filter(Boolean).join('\n')
			uni.setClipboardData({ data: text, success: () => toast('报价参考已复制', 'success') })
		}
	}
}
</script>

<style lang="scss" scoped>
.search-ipt { margin-bottom: 10rpx; }
.picker-text { min-height: 58rpx; line-height: 1.4; white-space: normal; word-break: break-all; }
.price-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10rpx; background: #f8fafc; border-radius: 14rpx; padding: 14rpx; }
.price-num { display: block; margin-top: 6rpx; color: #111827; font-size: 24rpx; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.competitor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx; }
.competitor-chip { min-height: 110rpx; border: 1rpx solid #dbe4f0; background: #f8fafc; border-radius: 14rpx; padding: 14rpx; display: flex; flex-direction: column; justify-content: center; gap: 4rpx; }
.competitor-chip.on { border-color: #2563eb; background: #eff6ff; }
.chip-name { color: #111827; font-size: 25rpx; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip-price { color: #ef4444; font-size: 28rpx; font-weight: 800; }
.chip-date { color: #98a2b3; font-size: 21rpx; }
.summary-box { border: 1rpx solid #bfdbfe; background: #eff6ff; border-radius: 14rpx; padding: 16rpx; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 16rpx; }
.price-row { display: flex; flex-direction: row; align-items: center; gap: 18rpx; padding: 18rpx 0; border-bottom: 1rpx dashed #edf1f6; }
.price-row:last-child { border-bottom: none; }
.empty-lite { padding: 24rpx 0; color: #98a2b3; font-size: 26rpx; text-align: center; }
@media screen and (max-width: 420px) {
	.price-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.competitor-grid { grid-template-columns: 1fr; }
}
</style>
