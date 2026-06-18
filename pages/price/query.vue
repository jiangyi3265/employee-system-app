<template>
	<view class="page">
		<global-stats />

		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">价格查询</text>
				<text class="inline-action" @click="reset">重置</text>
			</view>
			<view class="field">
				<text class="field-label">商品</text>
				<view class="field-input picker-text" @click="openProductPicker">
					<text :class="product ? '' : 't-muted'">{{ product ? product.name : '选择商品' }}</text>
				</view>
			</view>
			<view class="field">
				<text class="field-label">客户</text>
				<view class="field-input picker-text" @click="openCustomerPicker">
					<text :class="customerId ? '' : 't-muted'">{{ customer ? customer.name : '全部客户' }}</text>
				</view>
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
			<view class="empty-lite" v-if="!competitorRows.length">暂无同行报价</view>
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
					<text class="chip-sub" v-if="row.customerName">{{ row.customerName }}</text>
					<text class="chip-date">{{ fmt(row.time) }}</text>
				</view>
			</view>
			<view class="summary-box mt-m" v-if="selectedCompetitorRows.length">
				<text class="t-muted">已选 {{ selectedCompetitorRows.length }} 家，三方最低参考</text>
				<text class="t-price t-lg">{{ money(selectedCompetitorMin) }}</text>
			</view>
			<text class="t-muted mt-s" v-else>勾选客户实际询价的同行后，系统只用已选范围计算最低参考价。</text>
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
			<text class="t-title mb-m">{{ dealTitle }}</text>
			<view class="price-row" v-for="row in dealDisplayRows" :key="row.key">
				<view class="col flex1">
					<text class="t-bold" style="font-size:27rpx;">{{ row.name }}</text>
					<text class="t-muted mt-s">{{ row.sub || '-' }} · {{ fmt(row.time) }}</text>
				</view>
				<text class="t-price">{{ money(row.price) }}</text>
			</view>
			<view class="empty-lite" v-if="!dealDisplayRows.length">暂无成交记录</view>
		</view>

		<view class="card" v-if="product">
			<text class="t-title mb-m">{{ quoteTitle }}</text>
			<view class="price-row" v-for="row in quoteDisplayRows" :key="row.key">
				<view class="col flex1">
					<text class="t-bold" style="font-size:27rpx;">{{ row.name }}</text>
					<text class="t-muted mt-s">{{ row.sub || '-' }} · {{ fmt(row.time) }}</text>
				</view>
				<text class="t-price">{{ money(row.price) }}</text>
			</view>
			<view class="empty-lite" v-if="!quoteDisplayRows.length">暂无报价记录</view>
		</view>

		<view class="card" v-if="product">
			<text class="t-title mb-m">同行历史报价（每家最近一条）</text>
			<view class="price-row" v-for="row in competitorRows" :key="row.key">
				<view class="col flex1">
					<text class="t-bold" style="font-size:27rpx;">{{ row.name }}</text>
					<text class="t-muted mt-s">{{ row.sub || '-' }} · {{ fmt(row.time) }}</text>
				</view>
				<text class="t-price">{{ money(row.price) }}</text>
			</view>
			<view class="empty-lite" v-if="!competitorRows.length">暂无同行报价</view>
		</view>

		<view class="card" v-if="product">
			<text class="t-title mb-m">历史采购价（所有供货商/所有价格）</text>
			<view class="price-row" v-for="row in purchaseRows" :key="row.key">
				<view class="col flex1">
					<text class="t-bold" style="font-size:27rpx;">{{ row.supplierName }}</text>
					<text class="t-muted mt-s">数量 {{ row.qty || '-' }} · {{ fmt(row.time) }}</text>
				</view>
				<view class="col price-col">
					<text class="t-price">{{ money(row.purchasePrice) }}</text>
					<text class="t-muted mt-s">成本 {{ money(row.costPrice) }}</text>
				</view>
			</view>
			<view class="empty-lite" v-if="!purchaseRows.length">暂无采购记录</view>
		</view>

		<view class="modal-mask" v-if="showProductPicker" @click="showProductPicker = false">
			<view class="modal-body" @click.stop>
				<text class="t-title mb-m">选择商品</text>
				<input class="input-box modal-search mb-s" v-model="productKw" placeholder="输入商品名称 / 规格 / 品牌筛选" @input="loadProducts" />
				<text class="t-muted mb-s">共 {{ productTotal }} 个商品，当前显示 {{ productRows.length }} 个</text>
				<view class="picker-item" v-for="p in productRows" :key="p._id" @click="selectProduct(p)">
					<view class="col flex1">
						<text class="t-bold">{{ p.name }}</text>
						<text class="t-muted mt-s">{{ p.spec || '-' }} · {{ p.brand || '-' }}</text>
					</view>
					<text class="t-price">{{ money(p.suggestPrice) }}</text>
				</view>
				<view class="empty" v-if="!productRows.length">{{ productKw ? '没有匹配的商品' : '暂无商品' }}</view>
			</view>
		</view>

		<view class="modal-mask" v-if="showCustomerPicker" @click="showCustomerPicker = false">
			<view class="modal-body" @click.stop>
				<text class="t-title mb-m">选择客户</text>
				<input class="input-box modal-search mb-s" v-model="customerKw" placeholder="输入客户名称 / 公司 / 手机筛选" @input="loadCustomers" />
				<text class="t-muted mb-s">共 {{ customerTotal }} 个客户，当前显示 {{ customerRows.length }} 个</text>
				<view class="picker-item" @click="selectCustomer(null)">
					<text class="t-bold">全部客户</text>
				</view>
				<view class="picker-item" v-for="c in customerRows" :key="c._id" @click="selectCustomer(c)">
					<view class="col flex1">
						<text class="t-bold">{{ c.name }}</text>
						<text class="t-muted mt-s">{{ c.company || c.phone || '-' }}</text>
					</view>
				</view>
				<view class="empty" v-if="!customerRows.length && customerKw">没有匹配的客户</view>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtDate, fmtMoney, toast } from '@/utils/format.js'
import { calcPrices, isQuotableQuoteItem, recommendQuote } from '@/utils/pricing.js'

export default {
	data() {
		return {
			session: {},
			productId: '',
			customerId: '',
			productKw: '',
			customerKw: '',
			productRows: [],
			customerRows: [],
			productTotal: 0,
			customerTotal: 0,
			showProductPicker: false,
			showCustomerPicker: false,
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
		dealRows() {
			return this.latestQuoteRows('done', this.customerId)
		},
		globalDealRows() {
			return this.latestQuoteRows('done', '')
		},
		quoteRows() {
			return this.latestQuoteRows('quote', this.customerId)
		},
		dealDisplayRows() {
			if (!this.customerId) return this.dealRows
			return this.dealRows.length ? this.dealRows : this.globalDealRows
		},
		quoteDisplayRows() {
			if (!this.customerId) return this.quoteRows
			const globalRows = this.latestQuoteRows('quote', '')
			return this.quoteRows.length ? this.quoteRows : globalRows
		},
		dealTitle() {
			if (!this.customerId) return '历史成交价（每客户最近一条）'
			return this.dealRows.length ? '该客户历史成交价' : '该客户暂无成交价，显示全客户最近成交价'
		},
		quoteTitle() {
			if (!this.customerId) return '历史报价（每客户最近一条）'
			return this.quoteRows.length ? '该客户历史报价' : '该客户暂无报价，显示全客户最近报价'
		},
		competitorRows() {
			if (!this.productId) return []
			let rows = db.list(T.COMP_QUOTE, { productId: this.productId })
				.map((row) => this.enrichCompetitor(row))
			if (this.customerId) {
				rows = rows.filter((row) => !row.customerId || row.customerId === this.customerId)
			}
			rows = rows.sort((a, b) => {
				const ap = this.customerId && a.customerId === this.customerId ? 1 : 0
				const bp = this.customerId && b.customerId === this.customerId ? 1 : 0
				if (ap !== bp) return bp - ap
				return b.time - a.time
			})
			return this.latestBy(rows, (row) => row.key)
		},
		purchaseRows() {
			if (!this.productId) return []
			return db.list(T.PURCHASE_ITEM, { productId: this.productId }, 'createTime', true).map((row) => {
				const purchasePrice = Number(row.purchasePrice) || 0
				const freight = Number(row.freightShare) || 0
				const supplierName = row.supplierName || this.nameOf(T.SUPPLIER, row.supplierId) || '未知供货商'
				const time = Number(row.updateTime || row.createTime) || 0
				return {
					...row,
					key: row._id,
					supplierName,
					purchasePrice,
					costPrice: calcPrices(purchasePrice, null, freight).costPrice,
					time
				}
			}).sort((a, b) => b.time - a.time)
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
		openProductPicker() {
			this.loadProducts()
			this.showProductPicker = true
		},
		loadProducts() {
			const kw = this.productKw.trim().toLowerCase()
			let list = this.products
			this.productTotal = list.length
			if (kw) {
				list = list.filter((p) => {
					const text = [
						p.name,
						p.spec,
						p.brand,
						p.category,
						p.attr1,
						p.attr2
					].filter(Boolean).join(' ').toLowerCase()
					return text.indexOf(kw) >= 0
				})
			}
			this.productRows = list.slice(0, kw ? 80 : 30)
		},
		selectProduct(item) {
			this.productId = item ? item._id : ''
			this.selectedCompetitorKeys = []
			this.showProductPicker = false
		},
		openCustomerPicker() {
			this.customerKw = ''
			this.loadCustomers()
			this.showCustomerPicker = true
		},
		loadCustomers() {
			const kw = this.customerKw.trim().toLowerCase()
			let list = this.customers
			this.customerTotal = list.length
			if (kw) {
				list = list.filter((c) => {
					const text = [
						c.name,
						c.company,
						c.phone,
						c.contact,
						c.address,
						c.grade
					].filter(Boolean).join(' ').toLowerCase()
					return text.indexOf(kw) >= 0
				})
			}
			this.customerRows = list.slice(0, kw ? 80 : 30)
		},
		selectCustomer(item) {
			this.customerId = item ? item._id : ''
			this.showCustomerPicker = false
		},
		reset() {
			this.productId = ''
			this.customerId = ''
			this.productKw = ''
			this.customerKw = ''
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
				.filter(isQuotableQuoteItem)
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
			const name = row.competitorName || row.supplierName || this.nameOf(T.COMPETITOR, row.competitorId) || this.nameOf(T.SUPPLIER, row.supplierId) || '未知同行'
			const key = row.competitorId || row.supplierId || name
			const customerId = row.sourceCustomerId || row.customerId || ''
			const customerName = row.sourceCustomerName || row.customerName || this.nameOf(T.CUSTOMER, customerId)
			const sourceLabel = row.source === 'manualCustomerSupplierQuote' ? '客户提供·已匹配' : '同行'
			return {
				...row,
				key,
				name,
				customerId,
				customerName,
				sub: [sourceLabel, customerName].filter(Boolean).join(' · '),
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
.picker-text { min-height: 58rpx; line-height: 1.4; white-space: normal; word-break: break-all; }
.price-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10rpx; background: #f8fafc; border-radius: 14rpx; padding: 14rpx; }
.price-num { display: block; margin-top: 6rpx; color: #111827; font-size: 24rpx; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.competitor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx; }
.competitor-chip { min-height: 126rpx; border: 1rpx solid #dbe4f0; background: #f8fafc; border-radius: 14rpx; padding: 14rpx; display: flex; flex-direction: column; justify-content: center; gap: 4rpx; }
.competitor-chip.on { border-color: #2563eb; background: #eff6ff; }
.chip-name { color: #111827; font-size: 25rpx; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip-price { color: #ef4444; font-size: 28rpx; font-weight: 800; }
.chip-sub { color: #6b7280; font-size: 22rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip-date { color: #98a2b3; font-size: 21rpx; }
.summary-box { border: 1rpx solid #bfdbfe; background: #eff6ff; border-radius: 14rpx; padding: 16rpx; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 16rpx; }
.price-row { display: flex; flex-direction: row; align-items: center; gap: 18rpx; padding: 18rpx 0; border-bottom: 1rpx dashed #edf1f6; }
.price-row:last-child { border-bottom: none; }
.empty-lite { padding: 24rpx 0; color: #98a2b3; font-size: 26rpx; text-align: center; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.42); z-index: 999; display: flex; align-items: flex-end; }
.modal-body { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 40rpx; max-height: 72vh; overflow-y: auto; }
.modal-search { height: 84rpx; min-height: 84rpx; line-height: normal; padding: 0 24rpx; }
.picker-item { display: flex; flex-direction: row; align-items: center; gap: 18rpx; padding: 24rpx 0; border-bottom: 1rpx solid #f0f1f4; font-size: 30rpx; }
@media screen and (max-width: 420px) {
	.price-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.competitor-grid { grid-template-columns: 1fr; }
}
</style>
