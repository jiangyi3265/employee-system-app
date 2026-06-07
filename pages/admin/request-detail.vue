<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">报价申请 - {{ order.customerName }}</text>
				<text class="tag" :class="statusTag(order.status)">{{ statusLabel(order.status) }}</text>
			</view>
			<text class="t-sub">申请时间：{{ fmt(order.createTime) }}</text>
			<text class="t-sub mt-s" v-if="order.sourceQuoteOrderId">类型：报价单修改申请，审核通过后更新原报价单</text>
		</view>

		<view class="card">
			<text class="t-title mb-m">申请产品清单</text>
			<view class="item-row" v-for="it in items" :key="it._id">
				<view class="row-between">
					<view class="col flex1">
						<text class="t-bold product-link" style="font-size:28rpx;" @click.stop="goProduct(it.productId)">{{ it.productName }}</text>
						<text class="t-sub">{{ it.spec }}</text>
					</view>
					<text class="t-sub">×{{ it.qty }}</text>
				</view>
				<view class="row-between mt-s" v-if="order.status === 'submitted'">
					<view class="row gap-s">
						<text class="t-sub">建议价：{{ money(it.suggestPrice) }}</text>
						<text class="t-sub">客户预期：</text>
						<input class="mini-ipt price-ipt" type="digit" v-model.number="it.customerExpect" placeholder="选填" @blur="recalcItem(it)" />
					</view>
					<view class="row gap-s">
						<text class="t-sub">报价</text>
						<input class="mini-ipt price-ipt" type="digit" v-model.number="it.quotePrice" @blur="validateItemQuote(it)" />
					</view>
				</view>
				<view class="support-box mt-s" v-if="it.supplierQuotes && it.supplierQuotes.length">
					<text class="t-bold" style="font-size:24rpx;">客户提供供货商报价</text>
					<view class="support-line mt-s" v-for="(q, qi) in it.supplierQuotes" :key="qi">
						<view class="col flex1">
							<text class="t-sub">{{ q.name || '供货商' }}</text>
							<text class="t-muted">客户提供，仅作报价判断</text>
						</view>
						<view class="row gap-s">
							<text class="t-price">{{ money(q.price) }}</text>
							<text class="inline-action" @click="saveSupplierQuote(it, q)">存入报价库</text>
						</view>
					</view>
				</view>
				<view class="rec-box mt-s" v-if="it._rec">
					<text class="t-primary t-bold">推荐：{{ money(it._rec.price) }}</text>
					<text class="t-sub"> 依据：{{ it._rec.basis }} · 利润率{{ it._rec.profitRate }}%</text>
					<text class="t-danger" v-if="it._rec.warning"> {{ it._rec.warning }}</text>
				</view>
				<view class="row-between mt-s" v-if="order.status !== 'submitted'">
					<text class="t-sub">最终报价：{{ money(it.quotePrice) }}</text>
					<text class="t-sub" v-if="it.customerExpect">客户预期：{{ money(it.customerExpect) }}</text>
				</view>
			</view>
		</view>

		<view style="margin: 30rpx 24rpx;" v-if="order.status === 'submitted'">
			<button class="btn btn-block" v-if="canApprove" @click="acceptOrder">接单处理（转入报价单）</button>
			<text class="t-muted review-tip" v-else>已转入管理员低价审核，等待管理员通过后完成</text>
			<button class="btn btn-danger btn-block mt-m" @click="reject">驳回</button>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, REQUEST_STATUS_LABEL, ROLE } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtDate, fmtMoney, toast, confirmDialog } from '@/utils/format.js'
import { sendToUser, notifyEmployees } from '@/utils/message.js'
import { recommendQuote, recentDealPrices, competitorQuotes, quoteAuditPatch } from '@/utils/pricing.js'
import { refreshCustomerOwner, refreshOrderDealStatus } from '@/utils/stats.js'
import { addOrderSystemFollow } from '@/utils/follow.js'
import { archiveEditUrl, findSupplierByName } from '@/utils/competitor.js'

export default {
	data() { return { id: '', order: {}, items: [], session: {} } },
	computed: {
		isAdmin() {
			return this.session.role === ROLE.ADMIN
		},
		canApprove() {
			return this.order.status === 'submitted' && (this.isAdmin || this.order.adminReviewStatus !== 'pending')
		}
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		if (q && q.id) {
			this.id = q.id
			this.load()
		}
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		statusLabel(s) { return REQUEST_STATUS_LABEL[s] || '未知' },
		statusTag(s) { return { submitted: 'tag-orange', approved: 'tag-green', rejected: 'tag-red' }[s] || 'tag-gray' },
		money(n) { return fmtMoney(n) },
		goProduct(id) {
			if (id) uni.navigateTo({ url: '/pages/quote/select?productId=' + id })
		},
		quoteAuditInfo(it) {
			const product = db.get(T.PRODUCT, it.productId) || {}
			const quotePrice = Number(it.quotePrice) || 0
			const costPrice = Number(it.costPrice || product.costPrice) || 0
			const minPrice = Number(it.minPrice || product.minPrice) || 0
			return {
				product,
				quotePrice,
				costPrice,
				minPrice,
				belowCost: costPrice > 0 && quotePrice < costPrice,
				belowMin: minPrice > 0 && quotePrice < minPrice
			}
		},
		validateItemQuote(it, silent = false) {
			const info = this.quoteAuditInfo(it)
			if (info.quotePrice <= 0) {
				if (!silent) toast(`${it.productName} 请输入有效最终报价`)
				return false
			}
			if (info.belowCost) {
				if (!silent) toast(`${it.productName} 最终报价不能低于成本价 ${this.money(info.costPrice)}`)
				return false
			}
			if (info.belowMin && !silent && !this.isAdmin) {
				toast(`${it.productName} 低于最低销售价，审核时将转入管理员审核`)
			}
			return true
		},
		validateAllQuotes() {
			const invalid = this.items.find((it) => !this.validateItemQuote(it, true))
			if (invalid) this.validateItemQuote(invalid)
			return !invalid
		},
		hasBelowMinQuote() {
			return this.items.some((it) => this.quoteAuditInfo(it).belowMin)
		},
		load() {
			this.order = db.get(T.REQUEST_ORDER, this.id) || {}
			this.items = db.list(T.REQUEST_ITEM, { requestOrderId: this.id }).map((it) => {
				const p = db.get(T.PRODUCT, it.productId) || {}
				const hasQuotePrice = Number(it.quotePrice) > 0
				it.suggestPrice = p.suggestPrice || 0
				it.costPrice = p.costPrice || 0
				it.minPrice = p.minPrice || 0
				it.quotePrice = hasQuotePrice ? Number(it.quotePrice) : p.suggestPrice || 0
				it.customerExpect = it.customerExpect || null
				it.supplierQuotes = Array.isArray(it.supplierQuotes) ? it.supplierQuotes : []
				it._rec = null
				if (this.order.status === 'submitted') {
					it._rec = this.buildRecommendation(it, p)
					if (!hasQuotePrice) it.quotePrice = it._rec.price
				}
				return it
			})
		},
		supportMin(it) {
			const prices = (it.supplierQuotes || []).map((q) => Number(q.price) || 0).filter((p) => p > 0)
			return prices.length ? Math.min(...prices) : null
		},
		buildRecommendation(it, product) {
			const p = product || db.get(T.PRODUCT, it.productId) || {}
			const deals = recentDealPrices(it.productId, 1)
			const comp = competitorQuotes(it.productId, 1)
			return recommendQuote({
				suggestPrice: p.suggestPrice,
				minPrice: p.minPrice,
				costPrice: p.costPrice,
				recentDeal: deals.length ? deals[0] : null,
				competitorMin: comp.length ? comp[0].price : null,
				supportMin: this.supportMin(it),
				customerExpect: Number(it.customerExpect) || null
			})
		},
		recalcItem(it) {
			it._rec = this.buildRecommendation(it)
			it.quotePrice = it._rec.price
		},
		async saveSupplierQuote(it, quote) {
			const name = (quote.name || '供货商').trim()
			const price = Number(quote.price) || 0
			if (!it.productId) return toast('商品信息不完整，无法保存')
			if (price <= 0) return toast('供货商报价无效')
			const supplier = findSupplierByName(name)
			if (!supplier) {
				const ok = await confirmDialog(`供应商不存在：${name}，是否添加？`, '供应商不存在', {
					confirmText: '是',
					cancelText: '否'
				})
				if (ok) {
					uni.navigateTo({ url: archiveEditUrl('supplier', { name }) })
				}
				return
			}
			const exists = db.list(T.COMP_QUOTE, { productId: it.productId }).find((row) => {
				const rowName = row.competitorName || row.supplierName || ''
				const sameSupplier = row.supplierId ? row.supplierId === supplier._id : rowName === supplier.name || rowName === name
				return sameSupplier && Number(row.price) === price
			})
			if (exists) return toast('报价库中已有相同记录')
			db.insert(T.COMP_QUOTE, {
				productId: it.productId,
				competitorId: '',
				competitorName: supplier.name,
				supplierId: supplier._id,
				supplierName: supplier.name,
				price,
				source: 'customerSupplierQuote',
				sourceRequestOrderId: this.id,
				sourceRequestItemId: it._id,
				sourceCustomerId: this.order.customerId,
				sourceCustomerName: this.order.customerName
			})
			toast('已存入报价库', 'success')
		},
		insertQuoteItem(orderId, it, orderOwner) {
			const product = db.get(T.PRODUCT, it.productId)
			const quotePrice = Number(it.quotePrice) || (product && product.suggestPrice) || 0
			const audit = quoteAuditPatch(quotePrice, product || {})
			const needsAdminReview = audit.specialPrice && !this.isAdmin
			const specialApproved = audit.specialPrice && this.isAdmin
			db.insert(T.QUOTE_ITEM, {
				orderId,
				productId: it.productId,
				productName: it.productName,
				spec: it.spec,
				unit: (product && product.unitSmall) || '个',
				qty: it.qty,
				price: quotePrice,
				costPrice: (product && product.costPrice) || 0,
				customerExpect: Number(it.customerExpect) || 0,
				status: 'pending',
				employeeId: orderOwner.employeeId,
				customerId: this.order.customerId,
				...audit,
				needsAdminReview,
				specialApproved,
				priceEffective: audit.specialPrice ? false : audit.priceEffective,
				sourceRequestOrderId: this.id,
				sourceRequestItemId: it._id
			})
			db.update(T.REQUEST_ITEM, it._id, {
				quotePrice,
				customerExpect: Number(it.customerExpect) || 0,
				supplierQuotes: it.supplierQuotes || []
			})
			return audit.specialPrice ? 1 : 0
		},
		syncRequestItemsToQuoteOrder(quoteOrder) {
			db.removeWhere(T.QUOTE_ITEM, { orderId: quoteOrder._id })
			let specialCount = 0
			this.items.forEach((it) => {
				if (!Number(it.quotePrice)) it.quotePrice = Number(it.customerExpect) || Number(it.suggestPrice) || 0
				specialCount += this.insertQuoteItem(quoteOrder._id, it, {
					employeeId: quoteOrder.employeeId || this.session.id,
					employeeName: quoteOrder.employeeName || this.session.name
				})
			})
			refreshOrderDealStatus(quoteOrder._id)
			return specialCount
		},
		acceptQuoteOrder() {
			const existingId = this.order.approvedQuoteOrderId || this.order.acceptedQuoteOrderId
			if (existingId) {
				const existing = db.get(T.QUOTE_ORDER, existingId)
				if (existing) return existing
			}
			if (this.order.sourceQuoteOrderId) {
				const source = db.get(T.QUOTE_ORDER, this.order.sourceQuoteOrderId)
				if (source) return db.update(T.QUOTE_ORDER, source._id, { sourceRequestOrderId: this.id }) || source
			}
			return db.insert(T.QUOTE_ORDER, {
				customerId: this.order.customerId,
				customerName: this.order.customerName,
				employeeId: this.session.id,
				employeeName: this.session.name,
				dealStatus: 'pending',
				sourceRequestOrderId: this.id
			})
		},
		acceptOrder() {
			if (!this.items.length) return toast('申请没有商品，无法接单')
			const existingId = this.order.acceptedQuoteOrderId || this.order.approvedQuoteOrderId || this.order.sourceQuoteOrderId
			if (existingId) {
				const existing = db.get(T.QUOTE_ORDER, existingId)
				if (existing) {
					db.update(T.QUOTE_ORDER, existing._id, { sourceRequestOrderId: this.id })
					const specialCount = this.syncRequestItemsToQuoteOrder(existing)
					db.update(T.REQUEST_ORDER, this.id, {
						acceptedQuoteOrderId: existing._id,
						acceptedEmployeeId: existing.employeeId || this.session.id,
						acceptedEmployeeName: existing.employeeName || this.session.name
					})
					addOrderSystemFollow(existing._id, `${this.session.name} 重新同步客户报价申请明细，已带入客户预期价`, this.session)
					if (specialCount) {
						notifyEmployees('低价报价待审核', `${this.session.name} 同步客户报价申请后，有 ${specialCount} 项报价低于最低销售价`, 'quote', existing._id, {
							fromId: this.session.id,
							fromName: this.session.name,
							fromRole: this.session.role,
							threadId: `quote_${existing._id}_special`
						})
					}
					toast('正在进入已接单报价单', 'success')
					setTimeout(() => {
						uni.redirectTo({ url: '/pages/quote/detail?id=' + existing._id })
					}, 300)
					return
				}
			}
			const quoteOrder = this.acceptQuoteOrder()
			db.removeWhere(T.QUOTE_ITEM, { orderId: quoteOrder._id })
			let specialCount = 0
			this.items.forEach((it) => {
				if (!Number(it.quotePrice)) it.quotePrice = Number(it.customerExpect) || Number(it.suggestPrice) || 0
				specialCount += this.insertQuoteItem(quoteOrder._id, it, {
					employeeId: quoteOrder.employeeId || this.session.id,
					employeeName: quoteOrder.employeeName || this.session.name
				})
			})
			refreshOrderDealStatus(quoteOrder._id)
			db.update(T.REQUEST_ORDER, this.id, {
				acceptedQuoteOrderId: quoteOrder._id,
				acceptedEmployeeId: quoteOrder.employeeId || this.session.id,
				acceptedEmployeeName: quoteOrder.employeeName || this.session.name
			})
			addOrderSystemFollow(quoteOrder._id, `${this.session.name} 接单客户报价申请，已转入报价单处理`, this.session)
			if (specialCount) {
				addOrderSystemFollow(quoteOrder._id, `${this.session.name} 接单时带入 ${specialCount} 项低于最低销售价的报价，按报价单低价审核流程处理`, this.session)
				notifyEmployees('低价报价待审核', `${this.session.name} 接单客户报价申请后，有 ${specialCount} 项报价低于最低销售价`, 'quote', quoteOrder._id, {
					fromId: this.session.id,
					fromName: this.session.name,
					fromRole: this.session.role,
					threadId: `quote_${quoteOrder._id}_special`
				})
			}
			sendToUser(this.order.customerId, '报价申请已接单', `您的报价申请已由 ${quoteOrder.employeeName || this.session.name} 接单处理`, {
				type: 'quote',
				refId: quoteOrder._id,
				fromId: this.session.id,
				fromName: this.session.name,
				threadId: `quote_${quoteOrder._id}_${this.order.customerId}`
			})
			toast('已接单，正在进入报价单', 'success')
			setTimeout(() => {
				uni.redirectTo({ url: '/pages/quote/detail?id=' + quoteOrder._id })
			}, 300)
		},
		createReviewQuoteOrder() {
			const existingId = this.order.adminReviewQuoteOrderId
			const data = {
				customerId: this.order.customerId,
				customerName: this.order.customerName,
				employeeId: this.session.id,
				employeeName: this.session.name,
				dealStatus: 'pending',
				sourceRequestOrderId: this.id,
				sourceQuoteOrderId: this.order.sourceQuoteOrderId || ''
			}
			if (existingId) {
				const existing = db.get(T.QUOTE_ORDER, existingId)
				if (existing) {
					db.removeWhere(T.QUOTE_ITEM, { orderId: existing._id })
					return db.update(T.QUOTE_ORDER, existing._id, data)
				}
			}
			return db.insert(T.QUOTE_ORDER, data)
		},
		submitAdminReview() {
			const quoteOrder = this.createReviewQuoteOrder()
			let specialCount = 0
			this.items.forEach((it) => {
				specialCount += this.insertQuoteItem(quoteOrder._id, it, {
					employeeId: quoteOrder.employeeId,
					employeeName: quoteOrder.employeeName
				})
			})
			refreshOrderDealStatus(quoteOrder._id)
			db.update(T.REQUEST_ORDER, this.id, {
				adminReviewStatus: 'pending',
				adminReviewQuoteOrderId: quoteOrder._id,
				adminReviewSubmitterId: this.session.id,
				adminReviewSubmitterName: this.session.name
			})
			addOrderSystemFollow(quoteOrder._id, `${this.session.name} 提交低价管理员审核，低于最低销售价 ${specialCount} 项`, this.session)
			notifyEmployees('低价报价待管理员审核', `${this.session.name} 审核客户报价申请时提交了 ${specialCount} 项低价报价，请管理员审核`, 'quote', quoteOrder._id, {
				fromId: this.session.id,
				fromName: this.session.name,
				fromRole: this.session.role,
				threadId: `request_${this.id}_admin_review`
			})
			toast('最终报价低于最低销售价，已转入管理员审核', 'success')
			this.load()
		},
		approveAdminReviewQuoteOrder() {
			const quoteOrder = db.get(T.QUOTE_ORDER, this.order.adminReviewQuoteOrderId)
			if (!quoteOrder) return false
			db.removeWhere(T.QUOTE_ITEM, { orderId: quoteOrder._id })
			let specialCount = 0
			this.items.forEach((it) => {
				specialCount += this.insertQuoteItem(quoteOrder._id, it, {
					employeeId: quoteOrder.employeeId,
					employeeName: quoteOrder.employeeName
				})
			})
			refreshOrderDealStatus(quoteOrder._id)
			addOrderSystemFollow(quoteOrder._id, `${this.session.name} 管理员审核通过客户报价申请，已完成低价特批`, this.session)
			if (specialCount) {
				addOrderSystemFollow(quoteOrder._id, `${this.session.name} 特批通过 ${specialCount} 项低于最低销售价的报价，该类价格不纳入最近报价/成交参考统计`, this.session)
			}
			db.update(T.REQUEST_ORDER, this.id, {
				status: 'approved',
				approvedQuoteOrderId: quoteOrder._id,
				adminReviewStatus: 'approved'
			})
			refreshCustomerOwner(this.order.customerId)
			sendToUser(this.order.customerId, '报价申请已通过', `您的报价申请已审核通过，报价员工：${quoteOrder.employeeName || this.session.name}`, {
				type: 'request',
				refId: this.id,
				fromId: this.session.id,
				fromName: this.session.name,
				threadId: `request_${this.id}`
			})
			toast('已审核通过并完成管理员低价特批', 'success')
			this.load()
			return true
		},
		approve() {
			if (!this.items.length) return toast('申请没有商品，无法生成报价单')
			if (!this.validateAllQuotes()) return
			if (!this.isAdmin && this.hasBelowMinQuote()) {
				this.submitAdminReview()
				return
			}
			if (this.isAdmin && this.order.adminReviewQuoteOrderId && this.approveAdminReviewQuoteOrder()) return
			if (this.order.sourceQuoteOrderId) {
				const source = db.get(T.QUOTE_ORDER, this.order.sourceQuoteOrderId)
				if (!source) return toast('原报价单不存在，无法更新')
				db.removeWhere(T.QUOTE_ITEM, { orderId: source._id })
				let specialCount = 0
				this.items.forEach((it) => {
					specialCount += this.insertQuoteItem(source._id, it, {
						employeeId: source.employeeId,
						employeeName: source.employeeName
					})
				})
				refreshOrderDealStatus(source._id)
				addOrderSystemFollow(source._id, `${this.session.name} 审核通过客户报价单修改申请，已更新正式报价单`, this.session)
				if (specialCount) {
					addOrderSystemFollow(source._id, `${this.session.name} 特批通过 ${specialCount} 项低于最低销售价的报价，该类价格不纳入最近报价/成交参考统计`, this.session)
				}
				db.update(T.REQUEST_ORDER, this.id, { status: 'approved', approvedQuoteOrderId: source._id })
				sendToUser(this.order.customerId, '报价单修改已通过', '您的报价单修改申请已审核通过，正式报价单已更新', {
					type: 'quote',
					refId: source._id,
					fromId: this.session.id,
					fromName: this.session.name,
					threadId: `quote_${source._id}_${this.order.customerId}`
				})
				toast('已审核通过并更新原报价单', 'success')
				this.load()
				return
			}
			// 转入报价单
			const quoteOrder = db.insert(T.QUOTE_ORDER, {
				customerId: this.order.customerId,
				customerName: this.order.customerName,
				employeeId: this.session.id,
				employeeName: this.session.name,
				dealStatus: 'pending'
			})
			let specialCount = 0
			this.items.forEach((it) => {
				specialCount += this.insertQuoteItem(quoteOrder._id, it, {
					employeeId: this.session.id,
					employeeName: this.session.name
				})
			})
			addOrderSystemFollow(quoteOrder._id, `${this.session.name} 审核通过客户报价申请，已自动生成正式报价单`, this.session)
			if (specialCount) {
				addOrderSystemFollow(quoteOrder._id, `${this.session.name} 特批通过 ${specialCount} 项低于最低销售价的报价，该类价格不纳入最近报价/成交参考统计`, this.session)
			}
			db.update(T.REQUEST_ORDER, this.id, { status: 'approved', approvedQuoteOrderId: quoteOrder._id })
			refreshCustomerOwner(this.order.customerId)
			sendToUser(this.order.customerId, '报价申请已通过', `您的报价申请已审核通过，报价员工：${this.session.name}`, {
				type: 'request',
				refId: this.id,
				fromId: this.session.id,
				fromName: this.session.name,
				threadId: `request_${this.id}`
			})
			toast('已审核通过并创建报价单', 'success')
			this.load()
		},
		async reject() {
			if (await confirmDialog('确定驳回该申请？')) {
				db.update(T.REQUEST_ORDER, this.id, { status: 'rejected' })
				sendToUser(this.order.customerId, '报价申请已驳回', '您的报价申请已被驳回', { type: 'request', refId: this.id })
				toast('已驳回', 'success')
				this.load()
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.item-row { padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.item-row:last-child { border-bottom: none; }
.product-link { color: #2563eb; }
.review-tip { display: block; text-align: center; padding: 18rpx 0; font-size: 26rpx; }
.mini-ipt { width: 120rpx; min-height: 60rpx; line-height: 60rpx; background: #f8fafc; border: 1rpx solid #dbe4f0; border-radius: 14rpx; padding: 0 14rpx; font-size: 26rpx; color: #111827; font-weight: 700; text-align: center; }
.price-ipt { width: 170rpx; }
.rec-box { background: #eff6ff; border-radius: 12rpx; padding: 12rpx 16rpx; }
.support-box { background: #f8fafc; border: 1rpx solid #edf1f6; border-radius: 12rpx; padding: 12rpx 16rpx; }
.support-line { display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 16rpx; padding: 10rpx 0; border-bottom: 1rpx dashed #e5e7eb; }
.support-line:last-child { border-bottom: none; }
</style>
