<template>
	<view class="page">
		<global-stats />

		<view class="card">
			<text class="t-title mb-m">客户提供报价线索</text>
			<view class="info-line"><text class="info-label">商品</text><text class="info-value">{{ productName || '-' }}</text></view>
			<view class="info-line"><text class="info-label">规格</text><text class="info-value">{{ spec || '-' }}</text></view>
			<view class="info-line"><text class="info-label">客户</text><text class="info-value">{{ customerName || '-' }}</text></view>
			<view class="info-line"><text class="info-label">申请单</text><text class="info-value mono">{{ requestId || '-' }}</text></view>
			<view class="field mt-s">
				<text class="field-label">客户填写名称</text>
				<input class="field-input" v-model="providedName" placeholder="可修正客户填写的同行/供货商名称" @input="syncNewName" />
			</view>
			<view class="field">
				<text class="field-label">客户提供价</text>
				<input class="field-input" type="digit" v-model="price" placeholder="请输入报价" />
			</view>
			<text class="t-muted mt-s">这条线索不会自动进入价格查询，只有保存后才写入同行报价库。</text>
		</view>

		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">匹配系统同行档案</text>
				<text class="inline-action" v-if="selectedCompetitor" @click="clearSelected">重选</text>
			</view>
			<input class="input-box modal-search mb-s" v-model="kw" placeholder="搜索同行名称 / 联系人 / 手机" @input="loadCompetitors" />
			<view class="selected-box mb-s" v-if="selectedCompetitor">
				<text class="t-bold">{{ selectedCompetitor.name }}</text>
				<text class="t-muted mt-s">联系人：{{ selectedCompetitor.contact || '-' }} · 手机：{{ selectedCompetitor.phone || '-' }}</text>
			</view>
			<view
				class="match-row"
				:class="{ on: selectedCompetitorId === row._id }"
				v-for="row in competitorRows"
				:key="row._id"
				@click="selectCompetitor(row)"
			>
				<view class="col flex1">
					<text class="t-bold">{{ row.name }}</text>
					<text class="t-muted mt-s">联系人：{{ row.contact || '-' }} · 手机：{{ row.phone || '-' }}</text>
				</view>
				<text class="tag tag-blue" v-if="selectedCompetitorId === row._id">已选</text>
			</view>
			<view class="empty-lite" v-if="!competitorRows.length">没有匹配同行，可在下方新增</view>
		</view>

		<view class="card">
			<text class="t-title mb-m">新增同行/供货商档案</text>
			<view class="field"><text class="field-label">名称</text><input class="field-input" v-model="newCompetitor.name" placeholder="如：张氏烟酒商行" /></view>
			<view class="field"><text class="field-label">联系人</text><input class="field-input" v-model="newCompetitor.contact" placeholder="选填" /></view>
			<view class="field"><text class="field-label">手机</text><input class="field-input" type="number" v-model="newCompetitor.phone" placeholder="选填" /></view>
			<button class="btn btn-ghost btn-block mt-m" @click="createCompetitor()">新增并选中</button>
		</view>

		<view style="margin: 30rpx 24rpx;">
			<button class="btn btn-block" @click="save">保存到同行报价库</button>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { toast } from '@/utils/format.js'

function normalize(text) {
	return String(text || '').trim().toLowerCase()
}

export default {
	data() {
		return {
			session: {},
			requestId: '',
			requestItemId: '',
			quoteIndex: 0,
			productId: '',
			productName: '',
			spec: '',
			customerId: '',
			customerName: '',
			providedName: '',
			price: '',
			kw: '',
			competitorRows: [],
			selectedCompetitorId: '',
			savedCompQuoteId: '',
			newCompetitor: {
				name: '',
				contact: '',
				phone: ''
			}
		}
	},
	computed: {
		selectedCompetitor() {
			return this.selectedCompetitorId ? db.get(T.COMPETITOR, this.selectedCompetitorId) : null
		}
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		if (s.role === ROLE.CUSTOMER) {
			toast('该功能仅内部员工可用')
			setTimeout(() => uni.navigateBack(), 300)
			return
		}
		this.session = s
		this.applyQuery(q || {})
		this.loadExistingQuoteState()
		this.kw = this.providedName
		this.newCompetitor.name = this.providedName
		this.loadCompetitors()
	},
	methods: {
		decodeQuery(value) {
			let text = String(value || '')
			try {
				for (let i = 0; i < 3; i += 1) {
					const next = decodeURIComponent(text)
					if (next === text) break
					text = next
				}
			} catch (e) {}
			return text
		},
		applyQuery(q) {
			this.requestId = this.decodeQuery(q.requestId)
			this.requestItemId = this.decodeQuery(q.requestItemId)
			this.quoteIndex = Number(this.decodeQuery(q.quoteIndex)) || 0
			this.productId = this.decodeQuery(q.productId)
			this.productName = this.decodeQuery(q.productName)
			this.spec = this.decodeQuery(q.spec)
			this.customerId = this.decodeQuery(q.customerId)
			this.customerName = this.decodeQuery(q.customerName)
			this.providedName = this.decodeQuery(q.providedName).trim()
			this.price = Number(this.decodeQuery(q.price)) || ''
		},
		loadExistingQuoteState() {
			if (!this.requestItemId) return
			const item = db.get(T.REQUEST_ITEM, this.requestItemId)
			const quotes = item && Array.isArray(item.supplierQuotes) ? item.supplierQuotes : []
			const quote = quotes[this.quoteIndex]
			if (!quote) return
			this.providedName = String(quote.name || quote.supplierName || this.providedName || '').trim()
			this.price = Number(quote.price) || this.price
			this.savedCompQuoteId = quote.savedCompQuoteId || ''
			if (quote.matchedCompetitorId) this.selectedCompetitorId = quote.matchedCompetitorId
			if (this.savedCompQuoteId) {
				const saved = db.get(T.COMP_QUOTE, this.savedCompQuoteId)
				if (saved) {
					this.price = Number(saved.price) || this.price
					this.selectedCompetitorId = saved.competitorId || this.selectedCompetitorId
				}
			}
		},
		syncNewName() {
			if (!this.newCompetitor.name || normalize(this.newCompetitor.name) === normalize(this.kw)) {
				this.newCompetitor.name = this.providedName
			}
			this.kw = this.providedName
			this.loadCompetitors()
		},
		loadCompetitors() {
			const key = normalize(this.kw)
			let rows = db.list(T.COMPETITOR, null, 'name')
			if (key) {
				rows = rows.filter((row) => {
					const text = [row.name, row.contact, row.phone].filter(Boolean).join(' ').toLowerCase()
					return text.indexOf(key) >= 0
				})
			}
			this.competitorRows = rows.slice(0, key ? 80 : 30)
		},
		selectCompetitor(row) {
			this.selectedCompetitorId = row ? row._id : ''
		},
		clearSelected() {
			this.selectedCompetitorId = ''
		},
		createCompetitor(silent = false) {
			const name = String(this.newCompetitor.name || this.providedName || '').trim()
			if (!name) {
				if (!silent) toast('请输入同行/供货商名称')
				return null
			}
			const existing = db.list(T.COMPETITOR).find((row) => normalize(row.name) === normalize(name))
			if (existing) {
				this.selectCompetitor(existing)
				this.loadCompetitors()
				if (!silent) toast('已选中已有同行', 'success')
				return existing
			}
			const record = db.insert(T.COMPETITOR, {
				name,
				contact: String(this.newCompetitor.contact || '').trim(),
				phone: String(this.newCompetitor.phone || '').trim()
			})
			this.selectCompetitor(record)
			this.kw = name
			this.loadCompetitors()
			if (!silent) toast('已新增并选中', 'success')
			return record
		},
		updateRequestQuote(saved, competitor) {
			if (!this.requestItemId) return
			const item = db.get(T.REQUEST_ITEM, this.requestItemId)
			if (!item) return
			const quotes = Array.isArray(item.supplierQuotes) ? item.supplierQuotes.slice() : []
			if (this.quoteIndex < 0 || this.quoteIndex >= quotes.length) return
			const oldQuote = quotes[this.quoteIndex] || {}
			quotes[this.quoteIndex] = {
				...oldQuote,
				originalProvidedName: oldQuote.originalProvidedName || oldQuote.name || oldQuote.supplierName || '',
				name: String(this.providedName || '').trim(),
				price: Number(this.price) || 0,
				matchedCompetitorId: competitor._id,
				matchedCompetitorName: competitor.name,
				savedCompQuoteId: saved._id,
				savedTime: Date.now(),
				savedBy: this.session.name
			}
			db.update(T.REQUEST_ITEM, this.requestItemId, { supplierQuotes: quotes })
		},
		save() {
			if (!this.productId) return toast('缺少商品信息，无法保存')
			const price = Number(this.price) || 0
			if (price <= 0) return toast('请输入有效报价')
			const competitor = this.selectedCompetitor
			if (!competitor) return toast('请先选择或新增同行/供货商')
			const product = db.get(T.PRODUCT, this.productId) || {}
			const data = {
				productId: this.productId,
				productName: this.productName || product.name || '',
				spec: this.spec || product.spec || '',
				competitorId: competitor._id,
				competitorName: competitor.name,
				price,
				source: 'manualCustomerSupplierQuote',
				sourceRequestOrderId: this.requestId,
				sourceRequestItemId: this.requestItemId,
				sourceCustomerId: this.customerId,
				sourceCustomerName: this.customerName,
				customerProvidedName: String(this.providedName || '').trim(),
				employeeId: this.session.id,
				employeeName: this.session.name
			}
			let saved = null
			if (this.savedCompQuoteId && db.get(T.COMP_QUOTE, this.savedCompQuoteId)) {
				saved = db.update(T.COMP_QUOTE, this.savedCompQuoteId, data)
			} else {
				saved = db.insert(T.COMP_QUOTE, data)
				this.savedCompQuoteId = saved._id
			}
			this.updateRequestQuote(saved, competitor)
			toast('已保存到同行报价库', 'success')
			setTimeout(() => uni.navigateBack(), 350)
		}
	}
}
</script>

<style lang="scss" scoped>
.info-line { display: flex; flex-direction: row; gap: 18rpx; padding: 8rpx 0; }
.info-label { width: 120rpx; color: #6b7280; font-size: 25rpx; flex: none; }
.info-value { flex: 1; min-width: 0; color: #111827; font-size: 26rpx; word-break: break-all; }
.mono { font-family: Menlo, Consolas, monospace; font-size: 22rpx; color: #64748b; }
.modal-search { height: 84rpx; min-height: 84rpx; line-height: normal; padding: 0 24rpx; }
.selected-box { border: 1rpx solid #bfdbfe; background: #eff6ff; border-radius: 16rpx; padding: 18rpx; }
.match-row { display: flex; flex-direction: row; align-items: center; gap: 18rpx; padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.match-row:last-child { border-bottom: none; }
.match-row.on { background: #f8fbff; }
.empty-lite { padding: 24rpx 0; color: #98a2b3; font-size: 26rpx; text-align: center; }
</style>
