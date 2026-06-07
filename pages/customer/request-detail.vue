<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<view class="row-between">
				<view class="col flex1">
					<text class="t-title">{{ title }}</text>
					<text class="t-muted mt-s">{{ subTitle }}</text>
				</view>
				<text class="tag" :class="draftMode ? 'tag-blue' : statusTag(request.status)">{{ draftMode ? '待提交' : statusLabel(request.status) }}</text>
			</view>
			<view class="divider"></view>
			<view class="row-between">
				<text class="t-muted">参考总值</text>
				<text class="t-price t-bold">{{ money(totalReference) }}</text>
			</view>
			<text class="inline-action mt-m" v-if="canEdit" @click="goProducts">继续添加商品</text>
		</view>

		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">申请商品明细</text>
				<text class="t-muted">{{ items.length }} 项</text>
			</view>
			<view class="sub-empty" v-if="!items.length">暂无申请商品</view>
			<view class="request-product" v-for="(it, i) in items" :key="itemKey(it, i)">
				<view class="row-between">
					<view class="col flex1">
						<text class="t-bold product-link" style="font-size:28rpx;" @click="goProduct(productId(it))">{{ productName(it) }}</text>
						<text class="t-muted mt-s">规格：{{ it.spec }}</text>
					</view>
					<text class="t-danger text-action" v-if="canEdit" @click="removeItem(it, i)">移除</text>
				</view>
				<view class="row-between mt-m">
					<view class="row gap-s">
						<text class="t-sub" style="font-size:24rpx;">数量</text>
						<input v-if="canEdit" class="mini-ipt" type="digit" v-model.number="it.qty" @blur="saveItem(it)" />
						<text v-else class="t-bold">{{ it.qty }}</text>
					</view>
					<view class="row gap-s">
						<text class="t-sub" style="font-size:24rpx;">预期价</text>
						<input v-if="canEdit" class="mini-ipt price-ipt" type="digit" v-model.number="it.customerExpect" @blur="saveItem(it)" />
						<text v-else class="t-price">{{ money(it.customerExpect) }}</text>
					</view>
				</view>
				<text class="t-sub mt-s" style="font-size:24rpx;">系统建议价：{{ money(it.suggestPrice) }}</text>
				<view class="support-box mt-m">
					<text class="t-sub" style="font-size:24rpx;">其他供货商报价</text>
					<view class="support-row" v-for="(q, qi) in it.supplierQuotes" :key="qi">
						<text class="t-sub">{{ q.name || '供货商' }}：{{ money(q.price) }}</text>
						<text class="t-danger text-action" v-if="canEdit" @click="removeSupplierQuote(it, qi)">删除</text>
					</view>
					<view class="row gap-s mt-s" v-if="canEdit">
						<input class="support-input" v-model="it._supplierName" placeholder="供货商名称" />
						<input class="support-input price" type="digit" v-model.number="it._supplierPrice" placeholder="单价" />
						<button class="btn btn-sm add-quote-btn" @click="addSupplierQuote(it)">添加</button>
					</view>
				</view>
			</view>
		</view>

		<view style="margin: 34rpx 24rpx;" v-if="items.length && (draftMode || canEdit)">
			<button class="btn btn-ghost btn-block mb-m" @click="copyRequestText">复制申请单文本</button>
			<button class="btn btn-block" v-if="draftMode" @click="submit">提交报价申请</button>
			<button class="btn btn-block" v-else @click="resubmit">提交报价单</button>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, REQUEST_STATUS_LABEL } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtMoney, fmtDate, toast, confirmDialog } from '@/utils/format.js'
import { notifyEmployees } from '@/utils/message.js'
import { addFollowLog, addOrderSystemFollow } from '@/utils/follow.js'

export default {
	data() {
		return {
			id: '',
			draftMode: false,
			request: {},
			items: [],
			session: {},
			appendRequestId: '',
			appendRequest: null,
			modifyQuoteId: '',
			modifyQuote: null
		}
	},
	computed: {
		canEdit() {
			return this.draftMode || this.request.status === 'submitted'
		},
		title() {
			if (this.draftMode && this.modifyQuoteId) return '报价单修改申请'
			if (this.draftMode && this.appendRequestId) return '追加报价申请商品'
			if (this.draftMode) return '报价申请'
			return this.requestTitle(this.request)
		},
		subTitle() {
			if (this.draftMode) return `${this.items.length} 项商品`
			return `${this.fmt(this.request.createTime)} · ${this.items.length} 项商品`
		},
		totalReference() {
			return this.items.reduce((sum, it) => sum + (Number(it.suggestPrice) || 0) * (Number(it.qty) || 1), 0)
		}
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.draftMode = !!(q && q.draft)
		this.id = (q && q.id) || ''
		this.load()
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		money(n) { return fmtMoney(n) },
		statusLabel(s) { return REQUEST_STATUS_LABEL[s] || '未知' },
		statusTag(s) { return { submitted: 'tag-orange', approved: 'tag-green', rejected: 'tag-red' }[s] || 'tag-gray' },
		itemKey(it, i) { return it._id || it.productId || i },
		productId(it) { return it.productId || it._id },
		productName(it) { return it.productName || it.name },
		requestTitle(r) { return r.requestType === 'modifyQuote' ? '报价单修改申请' : '报价申请' },
		normalizeItem(it) {
			return {
				...it,
				qty: Number(it.qty) || 1,
				customerExpect: Number(it.customerExpect) || Number(it.suggestPrice) || '',
				supplierQuotes: Array.isArray(it.supplierQuotes) ? it.supplierQuotes : [],
				_supplierName: '',
				_supplierPrice: ''
			}
		},
		load() {
			if (this.draftMode) {
				this.items = (uni.getStorageSync('sqms_cart') || []).map(this.normalizeItem)
				this.appendRequestId = uni.getStorageSync('sqms_append_request_id') || ''
				this.appendRequest = this.appendRequestId ? db.get(T.REQUEST_ORDER, this.appendRequestId) : null
				this.modifyQuoteId = uni.getStorageSync('sqms_modify_quote_id') || ''
				this.modifyQuote = this.modifyQuoteId ? db.get(T.QUOTE_ORDER, this.modifyQuoteId) : null
				return
			}
			this.request = db.get(T.REQUEST_ORDER, this.id) || {}
			if (!this.request._id) return
			if (this.request.customerId && this.request.customerId !== this.session.id) {
				uni.navigateBack()
				return
			}
			this.items = db.list(T.REQUEST_ITEM, { requestOrderId: this.id }).map(this.normalizeItem)
		},
		goProducts() {
			uni.navigateTo({ url: '/pages/customer/products' })
		},
		goProduct(id) {
			if (id) uni.navigateTo({ url: '/pages/customer/product-detail?id=' + id })
		},
		saveCart() {
			if (!this.draftMode) return
			const data = this.items.map(({ _supplierName, _supplierPrice, ...it }) => it)
			uni.setStorageSync('sqms_cart', data)
		},
		saveItem(item) {
			const qty = Number(item.qty) || 1
			const customerExpect = Number(item.customerExpect) || Number(item.suggestPrice) || 0
			item.qty = qty
			item.customerExpect = customerExpect
			if (this.draftMode) {
				this.saveCart()
				return
			}
			db.update(T.REQUEST_ITEM, item._id, { qty, customerExpect })
			db.update(T.REQUEST_ORDER, this.id, { totalReference: this.totalReference })
			toast('已更新申请商品', 'success')
		},
		addSupplierQuote(item) {
			const name = (item._supplierName || '').trim()
			const price = Number(item._supplierPrice) || 0
			if (!name) return toast('请输入供货商名称')
			if (price <= 0) return toast('请输入有效报价')
			item.supplierQuotes.push({ name, price })
			item._supplierName = ''
			item._supplierPrice = ''
			if (this.draftMode) {
				this.saveCart()
			} else {
				db.update(T.REQUEST_ITEM, item._id, { supplierQuotes: item.supplierQuotes.map((q) => ({ name: q.name, price: Number(q.price) || 0 })) })
			}
			toast('已添加供货商报价', 'success')
		},
		removeSupplierQuote(item, qi) {
			item.supplierQuotes.splice(qi, 1)
			if (this.draftMode) {
				this.saveCart()
			} else {
				db.update(T.REQUEST_ITEM, item._id, { supplierQuotes: item.supplierQuotes.map((q) => ({ name: q.name, price: Number(q.price) || 0 })) })
			}
			toast('已删除供货商报价', 'success')
		},
		async removeItem(item, i) {
			if (!(await confirmDialog(`确定移除 ${this.productName(item)}？`))) return
			if (this.draftMode) {
				this.items.splice(i, 1)
				this.saveCart()
				return
			}
			db.remove(T.REQUEST_ITEM, item._id)
			const rest = db.list(T.REQUEST_ITEM, { requestOrderId: this.id })
			if (!rest.length) {
				db.remove(T.REQUEST_ORDER, this.id)
				if (this.request.sourceQuoteOrderId) {
					addOrderSystemFollow(this.request.sourceQuoteOrderId, `客户 ${this.session.name} 取消了报价单修改申请`, {
						id: this.request.employeeId,
						name: this.request.employeeName
					})
				}
				uni.navigateBack()
			} else {
				const totalReference = rest.reduce((sum, it) => sum + (Number(it.suggestPrice) || 0) * (Number(it.qty) || 1), 0)
				db.update(T.REQUEST_ORDER, this.id, { totalReference })
			}
			addFollowLog({
				customerId: this.session.id,
				customerName: this.session.name,
				way: '系统',
				actorRole: 'system',
				source: 'request',
				content: `客户从待审核报价申请中移除了商品：${item.productName}`
			})
			notifyEmployees('客户修改报价申请', `客户 ${this.session.name} 从待审核报价申请中移除了 ${item.productName}`, 'request', this.id, {
				fromId: this.session.id,
				fromName: this.session.name,
				fromRole: this.session.role,
				threadId: `request_${this.id}`
			})
			this.load()
			toast('已更新待审核申请', 'success')
		},
		needSupplierQuote(it) {
			const expect = Number(it.customerExpect) || 0
			return expect > 0 && expect < (Number(it.suggestPrice) || 0)
		},
		copyRequestText() {
			let text = `${this.session.name || ''}采购物品询价申请单\n\n`
			text += '序号\t物品名称\t规格\t参考单价\t预期单价\t数量\t供货商报价\n'
			this.items.forEach((it, i) => {
				const support = (it.supplierQuotes || []).map((q) => `${q.name}:${Number(q.price).toFixed(2)}`).join('；')
				text += `${i + 1}\t${it.name}\t${it.spec}\t${Number(it.suggestPrice || 0).toFixed(2)}\t${it.customerExpect || ''}\t${it.qty}\t${support}\n`
			})
			uni.setClipboardData({ data: text, success: () => toast('申请单已复制', 'success') })
		},
		submit() {
			if (!this.items.length) return toast('清单为空')
			const missing = this.items.find((it) => this.needSupplierQuote(it) && !(it.supplierQuotes || []).length)
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
			this.items.forEach((it) => {
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
				addOrderSystemFollow(this.modifyQuote._id, `客户 ${this.session.name} 提交了报价单修改申请，共 ${this.items.length} 项商品，待销售审核`, {
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
					? `客户提交了报价单修改申请，共 ${this.items.length} 项商品`
					: (appendMode ? `客户追加了报价申请，新增 ${this.items.length} 项商品` : `客户提交了报价申请，共 ${this.items.length} 项商品，请及时审核`)
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
			this.items = []
			toast(modifyMode ? '已提交修改申请' : (appendMode ? '已追加报价申请' : '已提交报价申请'), 'success')
			setTimeout(() => uni.navigateBack(), 300)
		},
		resubmit() {
			if (!this.items.length) return toast('清单为空')
			if (!this.request._id) return toast('申请单不存在')
			const missing = this.items.find((it) => this.needSupplierQuote(it) && !(it.supplierQuotes || []).length)
			if (missing) return toast(`${this.productName(missing)} 低于参考价需填写供货商报价`)
			this.items.forEach((it) => {
				db.update(T.REQUEST_ITEM, it._id, {
					qty: Number(it.qty) || 1,
					customerExpect: Number(it.customerExpect) || Number(it.suggestPrice) || 0,
					supplierQuotes: (it.supplierQuotes || []).map((q) => ({ name: q.name, price: Number(q.price) || 0 }))
				})
			})
			db.update(T.REQUEST_ORDER, this.request._id, {
				status: 'submitted',
				totalReference: this.totalReference,
				resubmitTime: Date.now()
			})
			addFollowLog({
				customerId: this.session.id,
				customerName: this.session.name,
				way: '系统',
				actorRole: 'system',
				source: 'request',
				content: `客户重新提交报价申请，共 ${this.items.length} 项商品`
			})
			notifyEmployees('客户重新提交报价申请', `客户 ${this.session.name} 更新并重新提交了报价申请`, 'request', this.request._id, {
				fromId: this.session.id,
				fromName: this.session.name,
				fromRole: this.session.role,
				threadId: `request_${this.request._id}`
			})
			toast('报价单已提交', 'success')
			this.load()
		}
	}
}
</script>

<style lang="scss" scoped>
.product-link { color: #2563eb; }
.request-product { padding: 22rpx 0; border-bottom: 1rpx solid #edf1f6; }
.request-product:last-child { border-bottom: none; }
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
