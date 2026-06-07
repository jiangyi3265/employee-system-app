<template>
	<view class="page">
		<global-stats />
		<view class="search-bar row gap-s">
			<input class="search-input" v-model="kw" placeholder="搜索产品名称 / 规格 / 品牌" @input="load" />
			<button class="btn btn-sm query-btn" @click="goPriceQuery()">价格查询</button>
		</view>
		<text class="t-muted product-count">共 {{ productTotal }} 个产品，当前显示 {{ list.length }} 个</text>
		<view class="empty" v-if="!list.length">{{ kw ? '没有匹配的产品' : '暂无产品' }}</view>
		<view class="card prod" v-for="p in list" :key="p._id">
			<view class="row-between">
				<view class="col flex1">
					<text class="t-title" style="font-size:28rpx;">{{ p.name }}</text>
					<text class="t-sub">{{ p.spec }} · {{ p.brand || '-' }}</text>
					<text class="t-muted mt-s">成本 {{ money(p.costPrice) }} · 采购 {{ money(p.purchasePrice) }}</text>
				</view>
				<text class="t-price">{{ money(p.suggestPrice) }}</text>
			</view>

			<!-- 展开详情 -->
			<view class="mt-s" v-if="expanded === p._id">
				<view class="divider"></view>
				<view class="row-between mt-s"><text class="t-sub">成本价</text><text class="t-sub">{{ money(p.costPrice) }}</text></view>
				<view class="row-between"><text class="t-sub">最低销售价</text><text class="t-sub">{{ money(p.minPrice) }}</text></view>
				<view class="row-between"><text class="t-sub">建议销售价</text><text class="t-sub">{{ money(p.suggestPrice) }}</text></view>
				<view class="row-between"><text class="t-sub">零售价</text><text class="t-sub">{{ money(p.retailPrice) }}</text></view>

				<!-- 采购 / 供货商价格趋势 -->
				<view class="purchase-box mt-s">
					<view class="row-between">
						<text class="t-bold" style="font-size:26rpx;">历史采购价（所有供货商/所有价格）</text>
						<text class="t-muted">当前成本 {{ money(p.costPrice) }}</text>
					</view>
					<view class="supplier-grid mt-s" v-if="supplierLatest.length">
						<view class="supplier-chip" :class="{ best: s.isBest }" v-for="s in supplierLatest" :key="s.supplierKey">
							<text class="supplier-name">{{ s.supplierName }}</text>
							<text class="supplier-price">{{ money(s.purchasePrice) }}</text>
							<text class="supplier-trend" :class="trendClass(s)">{{ trendText(s) }}</text>
						</view>
					</view>
					<view class="empty-mini" v-if="!purchaseRows.length">暂无采购记录</view>
					<view class="purchase-row" v-for="row in purchaseRows" :key="row._id">
						<view class="col flex1">
							<text class="t-sub">{{ row.supplierName }} · 数量 {{ row.qty || '-' }}</text>
							<text class="t-muted">{{ fmt(row.time) }}</text>
						</view>
						<view class="col purchase-price-col">
							<text class="t-price">{{ money(row.purchasePrice) }}</text>
							<text class="t-muted">成本 {{ money(row.costPrice) }}</text>
							<text :class="trendClass(row)">{{ trendText(row) }}</text>
						</view>
					</view>
				</view>

				<!-- 最近成交价 -->
				<view class="mt-s" v-if="recentDeals.length">
					<text class="t-bold" style="font-size:26rpx;">最近成交价</text>
					<view class="history-line" v-for="d in recentDeals" :key="d._id">
						<view class="col flex1">
							<text class="t-sub">{{ historyParty(d) }}</text>
							<text class="t-muted">{{ fmt(d.updateTime || d.createTime) }}</text>
						</view>
						<text class="t-price">{{ money(d.price) }}</text>
					</view>
				</view>

				<!-- 最近报价 -->
				<view class="mt-s" v-if="recentQuotes.length">
					<text class="t-bold" style="font-size:26rpx;">最近报价</text>
					<view class="history-line" v-for="q in recentQuotes" :key="q._id">
						<view class="col flex1">
							<text class="t-sub">{{ historyParty(q) }}</text>
							<text class="t-muted">{{ fmt(q.updateTime || q.createTime) }}</text>
						</view>
						<text class="t-price">{{ money(q.price) }}</text>
					</view>
				</view>

				<!-- 同行报价 -->
				<view class="mt-s" v-if="compQuotes.length">
					<text class="t-bold" style="font-size:26rpx;">同行报价（最低3条）</text>
					<view class="row-between" v-for="q in compQuotes" :key="q._id">
						<text class="t-sub">{{ q.competitorName }}：{{ money(q.price) }}</text>
						<text class="t-muted">{{ fmt(q.createTime) }}</text>
					</view>
				</view>

				<!-- 客户预期价 -->
				<view class="field mt-s">
					<text class="field-label" style="width:auto;margin-right:12rpx;">客户预期价</text>
					<input class="expect-input" type="digit" v-model.number="customerExpect" placeholder="选填" @blur="calcRecommend(p)" />
				</view>

				<!-- 系统推荐报价 -->
				<view class="rec-box mt-s" v-if="rec">
					<view class="row-between">
						<text class="t-bold t-primary">系统推荐报价</text>
						<text class="t-price t-lg">{{ money(rec.price) }}</text>
					</view>
					<text class="t-sub">依据：{{ rec.basis }}</text>
					<text class="t-sub">利润率：{{ rec.profitRate }}%</text>
					<text class="t-danger" v-if="rec.warning">{{ rec.warning }}</text>
				</view>

				<!-- 同行报价录入 -->
				<view class="mt-s">
					<text class="t-bold" style="font-size:26rpx;">录入同行报价</text>
					<view class="quote-entry mt-s">
						<picker :range="competitors" :range-key="'name'" @change="pickCompetitor">
							<view class="quote-entry-picker">
								<text :class="selCompName ? '' : 't-muted'">{{ selCompName || '选择同行' }}</text>
							</view>
						</picker>
						<input class="quote-entry-input" type="digit" v-model.number="compInputPrice" placeholder="报价" />
						<button class="btn btn-sm quote-entry-btn" @click="addCompQuote(p)">录入</button>
					</view>
				</view>

				<view style="margin-top:20rpx;">
					<button class="btn btn-block btn-sm" @click="pick(p)">选用此产品</button>
					<button class="btn btn-ghost btn-block btn-sm mt-s" @click="goPriceQuery(p)">比价参考</button>
				</view>
			</view>

			<view class="mt-s" v-else>
				<text class="t-primary" style="font-size:26rpx;" @click="expand(p)">查看详情/智能报价</text>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { fmtMoney, fmtDate, toast } from '@/utils/format.js'
import { recentDealPrices, competitorQuotes, recommendQuote, isQuotableQuoteItem, calcPrices, round2 } from '@/utils/pricing.js'

export default {
	data() {
		return {
			list: [], kw: '', productTotal: 0, orderId: '', focusedProductId: '', customerId: '', contextCustomerLabel: '',
			expanded: '',
			recentDeals: [], recentQuotes: [], compQuotes: [], purchaseRows: [], supplierLatest: [], rec: null, customerExpect: null,
			competitors: [], selCompId: '', selCompName: '', compInputPrice: ''
		}
	},
	onLoad(q) {
		this.orderId = (q && q.orderId) || ''
		this.focusedProductId = (q && q.productId) || ''
		this.customerId = (q && q.customerId) || ''
		this.contextCustomerLabel = q && q.customerName ? decodeURIComponent(q.customerName) : ''
		if (this.orderId && !this.customerId) {
			const order = db.get(T.QUOTE_ORDER, this.orderId)
			if (order) {
				this.customerId = order.customerId || ''
				this.contextCustomerLabel = order.customerName || ''
			}
		}
		this.competitors = db.list(T.COMPETITOR)
		this.load()
		if (this.focusedProductId) {
			const p = this.list.find((item) => item._id === this.focusedProductId) || db.get(T.PRODUCT, this.focusedProductId)
			if (p) this.expand(p)
		}
	},
	methods: {
		money(n) { return fmtMoney(n) },
		fmt(t) { return fmtDate(t) },
		historyParty(item) {
			const customer = item.customerName || this.customerName(item.customerId)
			const employee = item.employeeName || this.employeeName(item.employeeId)
			return [customer, employee].filter(Boolean).join(' · ') || '-'
		},
		customerName(id) {
			const c = db.get(T.CUSTOMER, id)
			return c ? c.name : ''
		},
		employeeName(id) {
			const e = db.get(T.EMPLOYEE, id)
			return e ? e.name : ''
		},
		contextCustomerId() {
			if (this.customerId) return this.customerId
			const pages = getCurrentPages()
			const prev = pages[pages.length - 2]
			const vm = prev && (prev.$vm || prev)
			return vm && vm.form ? vm.form.customerId : ''
		},
		contextCustomerName() {
			if (this.contextCustomerLabel) return this.contextCustomerLabel
			const id = this.contextCustomerId()
			const c = db.get(T.CUSTOMER, id)
			if (c) return c.name
			const pages = getCurrentPages()
			const prev = pages[pages.length - 2]
			const vm = prev && (prev.$vm || prev)
			return vm && vm.form ? vm.form.customerName : ''
		},
		load() {
			let list = db.list(T.PRODUCT, null, 'updateTime', true)
			this.productTotal = list.length
			const kw = this.kw.trim().toLowerCase()
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
			const shown = list.slice(0, kw ? 80 : 30)
			if (this.focusedProductId && !shown.some((p) => p._id === this.focusedProductId)) {
				const focused = db.get(T.PRODUCT, this.focusedProductId)
				if (focused) shown.unshift(focused)
			}
			this.list = shown
		},
		expand(p) {
			this.expanded = p._id
			this.customerExpect = null
			this.recentDeals = db.list(T.QUOTE_ITEM, { productId: p._id, status: 'done' }, 'updateTime', true).filter(isQuotableQuoteItem).slice(0, 3)
			this.recentQuotes = db.list(T.QUOTE_ITEM, { productId: p._id }, 'updateTime', true)
				.filter((it) => it.status !== 'done')
				.filter(isQuotableQuoteItem)
				.slice(0, 3)
			this.compQuotes = competitorQuotes(p._id)
			this.loadPurchaseRefs(p._id)
			this.calcRecommend(p)
		},
		supplierName(id) {
			const s = id ? db.get(T.SUPPLIER, id) : null
			return s ? s.name : ''
		},
		loadPurchaseRefs(productId) {
			const rows = db.list(T.PURCHASE_ITEM, { productId }, 'createTime', true).map((row) => {
				const purchasePrice = Number(row.purchasePrice) || 0
				const freight = Number(row.freightShare) || 0
				const supplierName = row.supplierName || this.supplierName(row.supplierId) || '未知供货商'
				return {
					...row,
					purchasePrice,
					costPrice: calcPrices(purchasePrice, null, freight).costPrice,
					time: Number(row.updateTime || row.createTime) || 0,
					supplierName,
					supplierKey: row.supplierId || supplierName
				}
			}).sort((a, b) => b.time - a.time)
			const groups = {}
			rows.forEach((row) => {
				const key = row.supplierKey || row._id
				if (!groups[key]) groups[key] = []
				groups[key].push(row)
			})
			Object.values(groups).forEach((group) => {
				group.sort((a, b) => b.time - a.time)
				group.forEach((row, index) => {
					const prev = group[index + 1]
					row.prevPurchasePrice = prev ? prev.purchasePrice : null
					row.delta = prev ? round2(row.purchasePrice - prev.purchasePrice) : null
				})
			})
			this.purchaseRows = rows.slice(0, 12)
			this.supplierLatest = Object.keys(groups).map((key) => groups[key][0])
				.sort((a, b) => a.purchasePrice - b.purchasePrice)
				.slice(0, 6)
				.map((row, index) => ({ ...row, isBest: index === 0 }))
		},
		trendText(row) {
			if (row.delta == null) return '首次'
			if (Math.abs(row.delta) < 0.01) return '持平'
			return `${row.delta > 0 ? '涨' : '降'} ${this.money(Math.abs(row.delta))}`
		},
		trendClass(row) {
			if (row.delta == null || Math.abs(row.delta) < 0.01) return 't-muted'
			return row.delta > 0 ? 't-danger' : 't-success'
		},
		calcRecommend(p) {
			const deal = this.historyDealPrice(p._id)
			this.rec = recommendQuote({
				suggestPrice: p.suggestPrice,
				minPrice: p.minPrice,
				costPrice: p.costPrice,
				recentDeal: deal,
				competitorMin: null,
				customerExpect: this.customerExpect || null
			})
		},
		historyDealPrice(productId) {
			const customerId = this.contextCustomerId()
			if (customerId) {
				const customerDeal = db.list(T.QUOTE_ITEM, { productId, customerId, status: 'done' }, 'updateTime', true)
					.filter(isQuotableQuoteItem)
				if (customerDeal.length) return Number(customerDeal[0].price) || null
			}
			const deals = recentDealPrices(productId, 1)
			return deals.length ? deals[0] : null
		},
		pickCompetitor(e) {
			const c = this.competitors[e.detail.value]
			if (c) { this.selCompId = c._id; this.selCompName = c.name }
		},
		addCompQuote(p) {
			if (!this.selCompId) return toast('请选择同行')
			if (!this.compInputPrice) return toast('请输入报价')
			const customerId = this.contextCustomerId()
			const customerName = this.contextCustomerName()
			db.insert(T.COMP_QUOTE, {
				productId: p._id,
				competitorId: this.selCompId,
				competitorName: this.selCompName,
				price: Number(this.compInputPrice),
				sourceCustomerId: customerId,
				sourceCustomerName: customerName
			})
			toast('已录入', 'success')
			this.selCompId = ''; this.selCompName = ''; this.compInputPrice = ''
			this.compQuotes = competitorQuotes(p._id)
			this.calcRecommend(p)
		},
		pick(p) {
			const price = this.rec ? this.rec.price : p.suggestPrice
			const pages = getCurrentPages()
			const prev = pages[pages.length - 2]
			const vm = prev && (prev.$vm || prev)
			if (vm && vm.addProduct) {
				vm.addProduct(p, price)
				uni.navigateBack()
			}
		},
		goPriceQuery(p = null) {
			const params = []
			if (p && p._id) params.push(`productId=${encodeURIComponent(p._id)}`)
			const customerId = this.contextCustomerId()
			const customerName = this.contextCustomerName()
			if (customerId) params.push(`customerId=${encodeURIComponent(customerId)}`)
			if (customerName) params.push(`customerName=${encodeURIComponent(customerName)}`)
			uni.navigateTo({ url: '/pages/price/query' + (params.length ? `?${params.join('&')}` : '') })
		}
	}
}
</script>

<style lang="scss" scoped>
.search-bar { padding: 20rpx 24rpx; background: #fff; }
.search-input { flex: 1; min-width: 0; background: #f3f4f6; border-radius: 999rpx; padding: 18rpx 32rpx; font-size: 28rpx; }
.query-btn { width: 150rpx; padding: 0 12rpx; }
.product-count { display: block; padding: 12rpx 24rpx 0; background: #fff; }
.prod { margin: 16rpx 24rpx; }
.rec-box { background: #eff6ff; border-radius: 12rpx; padding: 16rpx 20rpx; }
.purchase-box { background: #f8fafc; border: 1rpx solid #e6edf6; border-radius: 16rpx; padding: 18rpx; }
.supplier-grid { display: flex; flex-direction: row; flex-wrap: wrap; gap: 12rpx; }
.supplier-chip { width: calc(50% - 6rpx); padding: 14rpx; border-radius: 14rpx; background: #fff; border: 1rpx solid #edf1f6; }
.supplier-chip.best { border-color: #2563eb; background: #eff6ff; }
.supplier-name { display: block; color: #111827; font-size: 24rpx; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.supplier-price { display: block; color: #ef4444; font-size: 28rpx; font-weight: 800; margin-top: 4rpx; }
.supplier-trend { display: block; font-size: 22rpx; margin-top: 4rpx; }
.purchase-row { display: flex; flex-direction: row; align-items: center; gap: 18rpx; padding: 14rpx 0; border-top: 1rpx dashed #e6edf6; }
.purchase-price-col { align-items: flex-end; min-width: 170rpx; }
.empty-mini { color: #9ca3af; font-size: 26rpx; text-align: center; padding: 28rpx 0 10rpx; }
.history-line { display: flex; flex-direction: row; align-items: center; gap: 18rpx; padding: 12rpx 0; border-bottom: 1rpx dashed #edf1f6; }
.history-line:last-child { border-bottom: none; }
.expect-input { flex: 1; min-width: 0; height: 68rpx; line-height: 68rpx; background: #f8fafc; border: 1rpx solid #dbe4f0; border-radius: 16rpx; padding: 0 22rpx; font-size: 28rpx; color: #111827; font-weight: 700; text-align: right; }
.quote-entry { display: flex; flex-direction: row; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.quote-entry-picker, .quote-entry-input { height: 68rpx; line-height: 68rpx; background: #f8fafc; border: 1rpx solid #e2e8f0; border-radius: 14rpx; padding: 0 18rpx; font-size: 25rpx; box-sizing: border-box; }
.quote-entry-picker { min-width: 180rpx; max-width: 240rpx; }
.quote-entry-input { flex: 1; min-width: 150rpx; text-align: center; }
.quote-entry-btn { height: 68rpx; min-width: 92rpx; padding: 0 20rpx; font-size: 25rpx; }
</style>
