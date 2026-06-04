<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">{{ pageTitle }}</text>
			<text class="sub-hero-desc">{{ pageDesc }}</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ cart.length }}</text><text class="metric-label">待申品种</text></view>
				<view class="metric-pill"><text class="metric-num t-price">{{ money(totalReference) }}</text><text class="metric-label">参考总值</text></view>
			</view>
		</view>

		<view class="list-card" v-if="pendingRequests.length">
			<view class="row-between mb-m" style="padding-bottom: 12rpx; border-bottom: 1rpx solid #edf1f6;">
				<text class="t-title" style="font-size:30rpx;">待审核报价申请</text>
				<text class="t-muted">共 {{ pendingRequests.length }} 单</text>
			</view>
			<view class="request-block request-order" v-for="r in pendingRequests" :key="r._id" @click="goRequestDetail(r._id)">
				<view class="row-between">
					<view class="col flex1">
						<text class="t-bold" style="font-size:27rpx;">{{ requestTitle(r) }}</text>
						<text class="t-muted mt-s">{{ fmt(r.createTime) }} · {{ requestItems(r._id).length }} 项商品</text>
					</view>
					<text class="tag tag-orange">待审核</text>
				</view>
				<view class="row-between mt-m">
					<text class="t-muted request-summary">{{ requestSummary(r._id) }}</text>
					<text class="t-price t-bold">{{ money(requestTotal(r._id)) }}</text>
				</view>
				<view class="row-between mt-m">
					<text class="inline-action" @click.stop="goRequestDetail(r._id)">查看详情</text>
					<text class="inline-action" @click.stop="continueRequest(r)">继续添加</text>
				</view>
			</view>
		</view>

		<view class="list-card">
			<view class="row-between mb-m" style="padding-bottom: 12rpx; border-bottom: 1rpx solid #edf1f6;">
				<text class="t-title" style="font-size:30rpx;">待提交报价申请</text>
				<text class="inline-action" @click="goProducts">添加商品</text>
			</view>
			<view class="sub-empty" v-if="!cart.length" style="box-shadow: none; margin: 20rpx 0; padding: 60rpx 0;" @click="goProducts">暂无产品，点击添加商品</view>
			<view class="request-block request-order" v-else @click="goDraftDetail">
				<view class="row-between">
					<view class="col flex1">
						<text class="t-bold" style="font-size:27rpx;">{{ draftTitle }}</text>
						<text class="t-muted mt-s">{{ cart.length }} 项商品</text>
					</view>
					<text class="tag tag-blue">待提交</text>
				</view>
				<view class="row-between mt-m">
					<text class="t-muted request-summary">{{ draftSummary }}</text>
					<text class="t-price t-bold">{{ money(totalReference) }}</text>
				</view>
				<view class="row-between mt-m">
					<text class="inline-action" @click.stop="goDraftDetail">查看详情</text>
					<text class="inline-action" @click.stop="goProducts">继续添加</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtMoney, fmtDate, toast, confirmDialog } from '@/utils/format.js'
import { notifyEmployees } from '@/utils/message.js'
import { addFollowLog, addOrderSystemFollow } from '@/utils/follow.js'

export default {
	data() {
		return {
			cart: [],
			pendingRequests: [],
			pendingRequestItems: {},
			session: {},
			appendRequestId: '',
			appendRequest: null,
			modifyQuoteId: '',
			modifyQuote: null
		}
	},
	computed: {
		pageTitle() {
			if (this.modifyQuoteId) return '修改报价单申请'
			if (this.appendRequestId) return '追加报价申请商品'
			return '我的报价申请清单'
		},
		pageDesc() {
			if (this.modifyQuoteId) return '当前修改会先提交给销售审核，审核通过后再更新到我的报价'
			if (this.appendRequestId) return '当前商品会追加到待审核申请中，销售人员将继续审核'
			return '在此处设置您所需商品的预期采购数量，提交后平台销售人员会尽快为您定制专属特惠'
		},
		totalReference() {
			return this.cart.reduce((sum, it) => sum + (Number(it.suggestPrice) || 0) * (Number(it.qty) || 1), 0)
		},
		draftTitle() {
			if (this.modifyQuoteId) return '报价单修改申请'
			if (this.appendRequestId) return '追加报价申请商品'
			return '报价申请'
		},
		draftSummary() {
			const names = this.cart.slice(0, 2).map((it) => it.name).filter(Boolean).join('、')
			if (!names) return '点击查看申请明细'
			return this.cart.length > 2 ? `${names} 等 ${this.cart.length} 项` : names
		}
	},
	onShow() {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.cart = this.normalizeCart(uni.getStorageSync('sqms_cart') || [])
		this.loadPendingRequests()
		this.appendRequestId = uni.getStorageSync('sqms_append_request_id') || ''
		this.appendRequest = this.appendRequestId ? db.get(T.REQUEST_ORDER, this.appendRequestId) : null
		if (this.appendRequest && this.appendRequest.status !== 'submitted') {
			uni.removeStorageSync('sqms_append_request_id')
			this.appendRequestId = ''
			this.appendRequest = null
		}
		this.modifyQuoteId = uni.getStorageSync('sqms_modify_quote_id') || ''
		this.modifyQuote = this.modifyQuoteId ? db.get(T.QUOTE_ORDER, this.modifyQuoteId) : null
		if (this.modifyQuote && this.modifyQuote.dealStatus !== 'pending') {
			uni.removeStorageSync('sqms_modify_quote_id')
			this.modifyQuoteId = ''
			this.modifyQuote = null
		}
	},
	methods: {
		money(n) { return fmtMoney(n) },
		fmt(t) { return fmtDate(t, true) },
		goProducts() {
			uni.navigateTo({ url: '/pages/customer/products' })
		},
		goProduct(id) {
			if (id) uni.navigateTo({ url: '/pages/customer/product-detail?id=' + id })
		},
		goRequestDetail(id) {
			if (id) uni.navigateTo({ url: '/pages/customer/request-detail?id=' + id })
		},
		goDraftDetail() {
			uni.navigateTo({ url: '/pages/customer/request-detail?draft=1' })
		},
		loadPendingRequests() {
			this.pendingRequests = db.list(T.REQUEST_ORDER, { customerId: this.session.id, status: 'submitted' }, 'createTime', true)
			const itemMap = {}
			this.pendingRequests.forEach((r) => {
				itemMap[r._id] = db.list(T.REQUEST_ITEM, { requestOrderId: r._id }).map((it) => ({
					...it,
					customerExpect: Number(it.customerExpect) || Number(it.suggestPrice) || '',
					supplierQuotes: Array.isArray(it.supplierQuotes) ? it.supplierQuotes : [],
					_supplierName: '',
					_supplierPrice: ''
				}))
			})
			this.pendingRequestItems = itemMap
		},
		requestItems(id) {
			return this.pendingRequestItems[id] || []
		},
		requestTotal(id) {
			return this.requestItems(id).reduce((sum, it) => sum + (Number(it.suggestPrice) || 0) * (Number(it.qty) || 1), 0)
		},
		requestSummary(id) {
			const names = this.requestItems(id).slice(0, 2).map((it) => it.productName).filter(Boolean).join('、')
			const count = this.requestItems(id).length
			if (!names) return '点击查看申请明细'
			return count > 2 ? `${names} 等 ${count} 项` : names
		},
		requestTitle(r) {
			return r.requestType === 'modifyQuote' ? '报价单修改申请' : '报价申请'
		},
		continueRequest(r) {
			uni.setStorageSync('sqms_append_request_id', r._id)
			uni.removeStorageSync('sqms_modify_quote_id')
			uni.navigateTo({ url: '/pages/customer/products' })
		},
		saveRequestItem(request, item) {
			const qty = Number(item.qty) || 1
			const customerExpect = Number(item.customerExpect) || Number(item.suggestPrice) || 0
			item.qty = qty
			item.customerExpect = customerExpect || ''
			db.update(T.REQUEST_ITEM, item._id, { qty, customerExpect })
			this.refreshRequestTotal(request._id)
			toast('已更新申请商品', 'success')
		},
		addRequestSupplierQuote(request, item) {
			const name = (item._supplierName || '').trim()
			const price = Number(item._supplierPrice) || 0
			if (!name) return toast('请输入供货商名称')
			if (price <= 0) return toast('请输入有效报价')
			item.supplierQuotes.push({ name, price })
			item._supplierName = ''
			item._supplierPrice = ''
			db.update(T.REQUEST_ITEM, item._id, {
				supplierQuotes: item.supplierQuotes.map((q) => ({ name: q.name, price: Number(q.price) || 0 }))
			})
			toast('已添加供货商报价', 'success')
		},
		removeRequestSupplierQuote(request, item, qi) {
			item.supplierQuotes.splice(qi, 1)
			db.update(T.REQUEST_ITEM, item._id, {
				supplierQuotes: item.supplierQuotes.map((q) => ({ name: q.name, price: Number(q.price) || 0 }))
			})
			toast('已删除供货商报价', 'success')
		},
		refreshRequestTotal(requestId) {
			const items = db.list(T.REQUEST_ITEM, { requestOrderId: requestId })
			const totalReference = items.reduce((sum, it) => sum + (Number(it.suggestPrice) || 0) * (Number(it.qty) || 1), 0)
			db.update(T.REQUEST_ORDER, requestId, { totalReference })
			this.loadPendingRequests()
		},
		async removeRequestItem(request, item) {
			if (!(await confirmDialog(`确定移除 ${item.productName}？`))) return
			db.remove(T.REQUEST_ITEM, item._id)
			const rest = db.list(T.REQUEST_ITEM, { requestOrderId: request._id })
			if (!rest.length) {
				db.remove(T.REQUEST_ORDER, request._id)
				if (request.sourceQuoteOrderId) {
					addOrderSystemFollow(request.sourceQuoteOrderId, `客户 ${this.session.name} 取消了报价单修改申请`, {
						id: request.employeeId,
						name: request.employeeName
					})
				}
			} else {
				this.refreshRequestTotal(request._id)
			}
			addFollowLog({
				customerId: this.session.id,
				customerName: this.session.name,
				way: '系统',
				actorRole: 'system',
				source: 'request',
				content: `客户从待审核报价申请中移除了商品：${item.productName}`
			})
			notifyEmployees('客户修改报价申请', `客户 ${this.session.name} 从待审核报价申请中移除了 ${item.productName}`, 'request', request._id, {
				fromId: this.session.id,
				fromName: this.session.name,
				fromRole: this.session.role,
				threadId: `request_${request._id}`
			})
			this.loadPendingRequests()
			toast('已更新待审核申请', 'success')
		},
		normalizeCart(list) {
			return (list || []).map((it) => ({
				...it,
				qty: Number(it.qty) || 1,
				customerExpect: Number(it.customerExpect) || Number(it.suggestPrice) || '',
				supplierQuotes: Array.isArray(it.supplierQuotes) ? it.supplierQuotes : [],
				_supplierName: '',
				_supplierPrice: ''
			}))
		},
		saveCart() {
			const data = this.cart.map(({ _supplierName, _supplierPrice, ...it }) => it)
			uni.setStorageSync('sqms_cart', data)
		},
		needSupplierQuote(it) {
			const expect = Number(it.customerExpect) || 0
			return expect > 0 && expect < (Number(it.suggestPrice) || 0)
		},
		onQtyBlur(i) {
			if (!this.cart[i].qty || Number(this.cart[i].qty) <= 0) {
				this.cart[i].qty = 1
			}
			this.saveCart()
		},
		removeItem(i) {
			this.cart.splice(i, 1)
			this.saveCart()
		},
		addSupplierQuote(i) {
			const item = this.cart[i]
			const name = (item._supplierName || '').trim()
			const price = Number(item._supplierPrice) || 0
			if (!name) return toast('请输入供货商名称')
			if (price <= 0) return toast('请输入有效报价')
			item.supplierQuotes.push({ name, price })
			item._supplierName = ''
			item._supplierPrice = ''
			this.saveCart()
		},
		removeSupplierQuote(i, qi) {
			this.cart[i].supplierQuotes.splice(qi, 1)
			this.saveCart()
		},
		copyRequestText() {
			let text = `${this.session.name || ''}采购物品询价申请单\n\n`
			text += '序号\t物品名称\t规格\t参考单价\t预期单价\t数量\t供货商报价\n'
			this.cart.forEach((it, i) => {
				const support = (it.supplierQuotes || []).map((q) => `${q.name}:${Number(q.price).toFixed(2)}`).join('；')
				text += `${i + 1}\t${it.name}\t${it.spec}\t${Number(it.suggestPrice || 0).toFixed(2)}\t${it.customerExpect || ''}\t${it.qty}\t${support}\n`
			})
			uni.setClipboardData({ data: text, success: () => toast('申请单已复制', 'success') })
		},
		submit() {
			if (!this.cart.length) return toast('清单为空')
			const missing = this.cart.find((it) => this.needSupplierQuote(it) && !(it.supplierQuotes || []).length)
			if (missing) return toast(`${missing.name} 低于参考价需填写供货商报价`)
			const customer = db.get(T.CUSTOMER, this.session.id)
			const modifyMode = !!this.modifyQuote
			let order = this.appendRequest
			const appendMode = !!(order && order.status === 'submitted')
			if (appendMode) {
				order = db.update(T.REQUEST_ORDER, order._id, {
					totalReference: (Number(order.totalReference) || 0) + this.totalReference
				})
			} else {
				order = db.insert(T.REQUEST_ORDER, {
					customerId: this.session.id,
					customerName: this.session.name || (customer && customer.name) || '',
					totalReference: this.totalReference,
					status: 'submitted',
					requestType: modifyMode ? 'modifyQuote' : 'newQuote',
					sourceQuoteOrderId: modifyMode ? this.modifyQuote._id : '',
					employeeId: modifyMode ? this.modifyQuote.employeeId : '',
					employeeName: modifyMode ? this.modifyQuote.employeeName : ''
				})
			}
			this.cart.forEach((it) => {
				db.insert(T.REQUEST_ITEM, {
					requestOrderId: order._id,
					productId: it._id,
					productName: it.name,
					spec: it.spec,
					qty: Number(it.qty) || 1,
					suggestPrice: Number(it.suggestPrice) || 0,
					customerExpect: Number(it.customerExpect) || Number(it.suggestPrice) || 0,
					supplierQuotes: (it.supplierQuotes || []).map((q) => ({ name: q.name, price: Number(q.price) || 0 }))
				})
			})
			if (modifyMode) {
				addOrderSystemFollow(this.modifyQuote._id, `客户 ${this.session.name} 提交了报价单修改申请，共 ${this.cart.length} 项商品，待销售审核`, {
					id: this.modifyQuote.employeeId,
					name: this.modifyQuote.employeeName
				})
			}
			addFollowLog({
				customerId: this.session.id,
				customerName: this.session.name || (customer && customer.name) || '',
				way: '系统',
				actorRole: 'system',
				source: 'request',
				content: modifyMode
					? `客户提交了报价单修改申请，共 ${this.cart.length} 项商品`
					: (appendMode ? `客户追加了报价申请，新增 ${this.cart.length} 项商品` : `客户提交了报价申请，共 ${this.cart.length} 项商品，请及时审核`)
			})
			notifyEmployees(modifyMode ? '客户报价单修改申请' : '客户报价申请', `客户 ${this.session.name} ${modifyMode ? '提交了报价单修改申请' : (appendMode ? '追加了' : '提交了') + '报价申请'}`, 'request', order._id, {
				fromId: this.session.id,
				fromName: this.session.name,
				fromRole: this.session.role,
				threadId: `request_${order._id}`
			})
			uni.setStorageSync('sqms_cart', [])
			uni.removeStorageSync('sqms_append_request_id')
			uni.removeStorageSync('sqms_modify_quote_id')
			this.cart = []
			this.appendRequestId = ''
			this.modifyQuoteId = ''
			this.modifyQuote = null
			this.loadPendingRequests()
			toast(modifyMode ? '已提交修改申请' : (appendMode ? '已追加报价申请' : '已提交报价申请'), 'success')
		}
	}
}
</script>

<style lang="scss" scoped>
.item-row { padding: 24rpx 0; border-bottom: 1rpx solid #edf1f6; }
.item-row:last-child { border-bottom: none; }
.product-link { color: #2563eb; }
.request-block { padding: 18rpx 0; border-bottom: 1rpx solid #edf1f6; }
.request-block:last-child { border-bottom: none; }
.request-order:active { transform: scale(0.995); }
.request-summary { flex: 1; min-width: 0; margin-right: 16rpx; line-height: 1.5; }
.request-product { margin-top: 16rpx; background: #f8fafc; border: 1rpx solid #edf1f6; border-radius: 14rpx; padding: 16rpx; }
.mini-ipt { width: 140rpx; background: #f3f6fb; border: 1rpx solid #e2e8f0; border-radius: 12rpx; padding: 10rpx 12rpx; font-size: 26rpx; text-align: center; }
.price-ipt { width: 180rpx; }
.support-box { background: #f8fafc; border-radius: 16rpx; padding: 18rpx; border: 1rpx solid #edf1f6; }
.support-row { display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx dashed #e5e7eb; }
.support-row:last-of-type { border-bottom: none; }
.support-input { flex: 1; min-width: 0; background: #fff; border: 1rpx solid #e2e8f0; border-radius: 12rpx; padding: 10rpx 12rpx; font-size: 24rpx; }
.support-input.price { width: 120rpx; flex: none; text-align: center; }
.add-quote-btn { height: 60rpx; min-width: 96rpx; padding: 0 16rpx; font-size: 24rpx; }
.text-action { font-size: 26rpx; font-weight: 600; padding: 6rpx 12rpx; }
</style>
