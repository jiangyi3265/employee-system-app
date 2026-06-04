<template>
	<view class="page">
		<global-stats />
		<!-- 订单基本信息 -->
		<view class="card">
			<text class="t-title mb-m">报价单信息</text>
			<view class="field">
				<text class="field-label">客户*</text>
				<view class="field-input row" @click="pickCustomer">
					<text :class="form.customerName ? '' : 't-muted'">{{ form.customerName || '点击选择客户' }}</text>
				</view>
			</view>
			<view class="field">
				<text class="field-label">成交状态</text>
				<text class="field-input">{{ dealLabel(form.dealStatus) }}</text>
			</view>
			<text class="t-muted" v-if="!form.customerId">请先选择客户，再添加商品并保存报价单</text>
		</view>

		<!-- 产品报价行 -->
		<view class="card" v-if="form.customerId || id">
			<view class="row-between mb-m">
				<text class="t-title">产品报价</text>
				<text class="t-primary" @click="addProductNav">+ 添加产品</text>
			</view>

			<view class="empty" v-if="!items.length">暂无报价产品，请先添加商品</view>

			<view class="item-row" v-for="(it, i) in items" :key="it._id || i">
				<view class="row-between">
					<view class="col flex1">
						<text class="t-bold product-link" style="font-size:28rpx;" @click.stop="goSmartQuote(it.productId)">{{ it.productName }}</text>
						<text class="t-sub">{{ it.spec }}</text>
						<text class="t-sub" v-if="it.customerExpect">客户预期：{{ money(it.customerExpect) }}</text>
					</view>
					<view class="row gap-s">
						<text class="tag tag-orange" v-if="it.customerPendingReview">客户修改待确认</text>
						<text class="tag tag-red" v-if="it.specialPrice || it.needsAdminReview">{{ it.needsAdminReview ? '低价待审' : '低价特批' }}</text>
						<text class="tag" :class="it.status === 'done' ? 'tag-green' : 'tag-orange'">{{ it.status === 'done' ? '已成交' : '未成交' }}</text>
					</view>
				</view>
				<view class="row-between mt-s">
					<view class="row gap-s">
						<text class="t-sub">数量</text>
						<input class="mini-ipt" type="digit" v-model.number="it.qty" @blur="saveItem(it)" />
						<text class="t-sub">{{ it.unit }}</text>
					</view>
					<view class="row gap-s">
						<text class="t-sub">单价</text>
						<input class="mini-ipt" type="digit" v-model.number="it.price" @blur="saveItem(it)" />
					</view>
				</view>
				<view class="row-between mt-s">
					<view class="row gap-s">
						<text class="t-sub">小计：{{ money(it.qty * it.price) }}</text>
						<text class="t-sub">成本：{{ money(it.costPrice) }}</text>
						<text class="t-sub" :class="itemProfitRate(it) < 10 ? 't-danger' : 't-success'">利润率：{{ itemProfitRate(it) }}%</text>
					</view>
					<view class="row gap-s">
						<text class="t-primary" @click="toggleDeal(it)">{{ it.status === 'done' ? '取消成交' : '标记成交' }}</text>
						<text class="t-primary" v-if="it.customerPendingReview" @click="confirmCustomerChange(it)">确认客户修改</text>
						<text class="t-primary" v-if="isAdmin && it.needsAdminReview" @click="approveSpecialPrice(it)">通过低价</text>
						<text class="t-danger" @click="removeItem(it, i)">删除</text>
					</view>
				</view>
			</view>

			<view class="divider" v-if="items.length"></view>
			<view class="row-between" v-if="items.length">
				<text class="t-bold">合计</text>
				<text class="t-price t-lg">{{ money(totalAmount) }}</text>
			</view>
			<view class="finance-box" v-if="items.length">
				<view class="row-between"><text class="t-sub">{{ amountLabel }}</text><text class="t-bold">{{ money(finance.amount) }}</text></view>
				<view class="row-between"><text class="t-sub">成本金额</text><text class="t-bold">{{ money(finance.cost) }}</text></view>
				<view class="row-between"><text class="t-sub">利润金额</text><text class="t-bold" :class="finance.profit < 0 ? 't-danger' : 't-success'">{{ money(finance.profit) }}</text></view>
				<view class="row-between"><text class="t-sub">利润率</text><text class="t-bold" :class="finance.profitRate < 10 ? 't-danger' : 't-success'">{{ finance.profitRate }}%</text></view>
				<text class="t-muted mt-s" v-if="pendingReviewCount">有 {{ pendingReviewCount }} 项低价报价待管理员审核，审核前不允许对外报价，也不纳入统计。</text>
			</view>
		</view>

		<view class="card" v-if="id">
			<text class="t-title mb-m">报价单跟进</text>
			<view class="follow-box">
				<textarea class="input-box follow-input" v-model="followText" placeholder="输入本报价单跟进内容" />
				<button class="btn btn-sm mt-s" @click="submitFollow">添加跟进</button>
			</view>
			<view class="empty" v-if="!follows.length">暂无报价单跟进</view>
			<view class="follow-item" v-for="f in follows" :key="f._id">
				<view class="row-between">
					<text class="t-bold" style="font-size:27rpx;">{{ actor(f) }}</text>
					<text class="t-muted">{{ fmt(f.createTime) }}</text>
				</view>
				<text class="t-sub mt-s">{{ f.content }}</text>
			</view>
		</view>

		<!-- 操作按钮 -->
		<view style="margin: 30rpx 24rpx;">
			<button class="btn btn-block" @click="saveOrder">{{ saveText }}</button>
			<button class="btn btn-ghost btn-block mt-m" v-if="id" @click="goExport">导出报价单</button>
			<button class="btn btn-danger btn-block mt-m" v-if="id" @click="removeOrder">删除报价单</button>
		</view>

		<!-- 客户选择弹窗 -->
		<view class="modal-mask" v-if="showCustPicker" @click="showCustPicker = false">
			<view class="modal-body" @click.stop>
				<text class="t-title mb-m">选择客户</text>
				<view class="picker-item" v-for="c in customers" :key="c._id" @click="selectCustomer(c)">
					<text>{{ c.name }} · {{ c.phone }}</text>
				</view>
				<view class="empty" v-if="!customers.length">暂无客户</view>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, DEAL_STATUS, DEAL_STATUS_LABEL, ROLE } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtDate, fmtMoney, toast, confirmDialog } from '@/utils/format.js'
import { refreshOrderDealStatus, refreshCustomerOwner, orderFinance } from '@/utils/stats.js'
import { profitRate, quoteAuditPatch, isQuotableQuoteItem } from '@/utils/pricing.js'
import { addOrderFollow, addOrderSystemFollow, followActor, orderFollows } from '@/utils/follow.js'
import { notifyEmployees, sendToUser } from '@/utils/message.js'

export default {
	data() {
		return {
			id: '',
			form: { customerId: '', customerName: '', employeeId: '', employeeName: '', dealStatus: 'pending' },
			items: [],
			follows: [],
			followText: '',
			showCustPicker: false,
			customers: [],
			session: {}
		}
	},
	computed: {
		totalAmount() {
			return this.items.filter((it) => !it.needsAdminReview).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0)
		},
		saveText() {
			return this.pendingReviewCount ? '保存并提交低价审核' : '保存报价单'
		},
		isAdmin() {
			return this.session.role === ROLE.ADMIN
		},
		pendingReviewCount() {
			return this.items.filter((it) => it.needsAdminReview).length
		},
		finance() {
			if (this.id) return orderFinance(this.id, this.form.dealStatus !== DEAL_STATUS.PENDING)
			const rows = this.items.filter(isQuotableQuoteItem)
			const amount = rows.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0)
			const cost = rows.reduce((s, it) => s + (Number(it.costPrice) || 0) * (Number(it.qty) || 0), 0)
			const profit = Math.round((amount - cost) * 100) / 100
			return {
				amount,
				cost,
				profit,
				profitRate: cost ? Math.round((profit / cost) * 10000) / 100 : 0
			}
		},
		amountLabel() {
			return this.form.dealStatus === DEAL_STATUS.PENDING ? '订单金额' : '成交金额'
		}
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		if (q && q.id) {
			this.id = q.id
			const o = db.get(T.QUOTE_ORDER, q.id)
			if (o) this.form = { ...this.form, ...o }
			this.items = db.list(T.QUOTE_ITEM, { orderId: q.id })
			this.loadFollows()
			uni.setNavigationBarTitle({ title: '编辑报价单' })
		} else {
			this.form.employeeId = s.id
			this.form.employeeName = s.name
			uni.setNavigationBarTitle({ title: '新建报价单' })
		}
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		money(n) { return fmtMoney(n) },
		actor(f) { return followActor(f) },
		dealLabel(s) { return DEAL_STATUS_LABEL[s] || '未知' },
		pickCustomer() {
			this.customers = db.list(T.CUSTOMER, { approved: true })
			this.showCustPicker = true
		},
		selectCustomer(c) {
			this.form.customerId = c._id
			this.form.customerName = c.name
			this.showCustPicker = false
		},
		addProductNav() {
			if (!this.form.customerId) return toast('请先选择客户')
			const query = this.id ? '?orderId=' + this.id : ''
			uni.navigateTo({ url: '/pages/quote/select' + query })
		},
		addProduct(p, recPrice) {
			const exists = this.items.find((it) => it.productId === p._id)
			if (exists) { toast('该产品已添加'); return }
			const price = Number(recPrice) || Number(p.suggestPrice) || 0
			const audit = this.auditPrice(price, p)
			const data = {
				orderId: this.id || '',
				productId: p._id, productName: p.name, spec: p.spec,
				unit: p.unitSmall || '个', qty: 1, price,
				costPrice: p.costPrice || 0,
				status: 'pending',
				employeeId: this.form.employeeId,
				customerId: this.form.customerId,
				...audit
			}
			const item = this.id ? db.insert(T.QUOTE_ITEM, data) : { ...data, _id: 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2) }
			this.items.push(item)
			if (this.id) {
				addOrderSystemFollow(this.id, `${this.session.name} 添加了商品：${p.name}，报价 ${fmtMoney(price)}`, this.session)
				if (item.needsAdminReview) {
					addOrderSystemFollow(this.id, `${this.session.name} 提交低价审核：${p.name} 报价 ${fmtMoney(price)}，低于最低销售价 ${fmtMoney(item.minPriceSnapshot)}`, this.session)
				}
				this.notifySpecialPrice(item)
				this.loadFollows()
			}
		},
		itemProfitRate(it) {
			return profitRate(Number(it.price) || 0, Number(it.costPrice) || 0)
		},
		saveItem(it) {
			const product = db.get(T.PRODUCT, it.productId) || {}
			const old = it._id && !String(it._id).startsWith('tmp_') ? db.get(T.QUOTE_ITEM, it._id) : null
			const price = Number(it.price) || 0
			const patch = {
				qty: Number(it.qty) || 0,
				price,
				customerPendingReview: false,
				...this.auditPrice(price, product)
			}
			Object.assign(it, patch)
			if (it._id && !String(it._id).startsWith('tmp_')) {
				db.update(T.QUOTE_ITEM, it._id, patch)
				if (old && (Number(old.price) !== patch.price || Number(old.qty) !== patch.qty)) {
					addOrderSystemFollow(this.id, `${this.session.name} 修改了 ${it.productName}：数量 ${old.qty} -> ${patch.qty}，单价 ${fmtMoney(old.price)} -> ${fmtMoney(patch.price)}`, this.session)
					if (patch.needsAdminReview && !old.needsAdminReview) {
						addOrderSystemFollow(this.id, `${this.session.name} 提交低价审核：${it.productName} 报价 ${fmtMoney(patch.price)}，低于最低销售价 ${fmtMoney(patch.minPriceSnapshot)}`, this.session)
					}
					this.loadFollows()
				}
				if (patch.needsAdminReview && (!old || !old.needsAdminReview || Number(old.price) !== patch.price)) {
					this.notifySpecialPrice(it)
				}
			}
		},
		toggleDeal(it) {
			if (it.needsAdminReview) return toast('低价报价需管理员审核通过后才能成交')
			const newStatus = it.status === 'done' ? 'pending' : 'done'
			const oldStatus = it.status
			it.status = newStatus
			if (it._id && !String(it._id).startsWith('tmp_')) db.update(T.QUOTE_ITEM, it._id, { status: newStatus })
			refreshOrderDealStatus(this.id)
			const o = db.get(T.QUOTE_ORDER, this.id)
			if (o) this.form.dealStatus = o.dealStatus
			if (newStatus === 'done') refreshCustomerOwner(this.form.customerId)
			if (oldStatus !== newStatus && this.id) {
				addOrderSystemFollow(this.id, `${this.session.name} 将 ${it.productName} ${newStatus === 'done' ? '标记为已成交' : '取消成交'}`, this.session)
				this.loadFollows()
			}
		},
		removeItem(it, i) {
			if (it._id && !String(it._id).startsWith('tmp_')) db.remove(T.QUOTE_ITEM, it._id)
			this.items.splice(i, 1)
			refreshOrderDealStatus(this.id)
			const o = db.get(T.QUOTE_ORDER, this.id)
			if (o) this.form.dealStatus = o.dealStatus
			if (this.id) {
				addOrderSystemFollow(this.id, `${this.session.name} 删除了商品：${it.productName}`, this.session)
				this.loadFollows()
			}
		},
		saveOrder() {
			if (!this.form.customerId) return toast('请选择客户')
			if (!this.items.length) return toast('请至少添加一个商品')
			if (this.id) {
				const old = db.get(T.QUOTE_ORDER, this.id)
				db.update(T.QUOTE_ORDER, this.id, {
					customerId: this.form.customerId,
					customerName: this.form.customerName
				})
				if (old && old.customerId !== this.form.customerId) {
					addOrderSystemFollow(this.id, `${this.session.name} 将报价单客户调整为 ${this.form.customerName}`, this.session)
				}
			} else {
				const o = db.insert(T.QUOTE_ORDER, {
					customerId: this.form.customerId,
					customerName: this.form.customerName,
					employeeId: this.form.employeeId,
					employeeName: this.form.employeeName,
					dealStatus: 'pending'
				})
				this.id = o._id
				this.items = this.items.map((it) => {
					const item = db.insert(T.QUOTE_ITEM, {
						...it,
						_id: undefined,
						orderId: o._id,
						employeeId: this.form.employeeId,
						customerId: this.form.customerId
					})
					this.notifySpecialPrice(item)
					if (item.needsAdminReview) {
						addOrderSystemFollow(o._id, `${this.form.employeeName} 提交低价审核：${item.productName} 报价 ${fmtMoney(item.price)}，低于最低销售价 ${fmtMoney(item.minPriceSnapshot)}`, this.session)
					}
					return item
				})
				addOrderSystemFollow(o._id, `${this.form.employeeName} 生成报价单，商品 ${this.items.length} 项，报价金额 ${fmtMoney(this.totalAmount)}`, this.session)
				const status = refreshOrderDealStatus(o._id)
				if (status) this.form.dealStatus = status
				refreshCustomerOwner(this.form.customerId)
			}
			this.loadFollows()
			const completedRequest = this.completeSourceRequestIfReady()
			toast(this.pendingReviewCount ? '已保存，低价项待管理员审核' : (completedRequest ? '已保存，客户申请已通过' : '已保存'), 'success')
		},
		loadFollows() {
			if (!this.id) return
			this.follows = orderFollows(this.id, this.session)
		},
		submitFollow() {
			const content = this.followText.trim()
			if (!content) return toast('请输入跟进内容')
			addOrderFollow({
				employeeId: this.session.id,
				employeeName: this.session.name,
				orderId: this.id,
				way: '跟进',
				source: 'quote',
				content
			})
			this.followText = ''
			this.loadFollows()
			toast('已添加跟进', 'success')
		},
		auditPrice(price, product) {
			const audit = quoteAuditPatch(price, product)
			if (audit.specialPrice && this.session.role === ROLE.ADMIN) {
				audit.needsAdminReview = false
				audit.specialApproved = true
				audit.priceEffective = false
			}
			return audit
		},
		approveSpecialPrice(it) {
			if (!this.isAdmin || !it._id) return
			db.update(T.QUOTE_ITEM, it._id, {
				needsAdminReview: false,
				specialApproved: true,
				priceEffective: false
			})
			it.needsAdminReview = false
			it.specialApproved = true
			it.priceEffective = false
			addOrderSystemFollow(this.id, `${this.session.name} 审核通过 ${it.productName} 的低价报价 ${fmtMoney(it.price)}，该价格不纳入成交/报价参考统计`, this.session)
			this.loadFollows()
			this.completeSourceRequestIfReady()
			toast('低价报价已通过', 'success')
		},
		completeSourceRequestIfReady() {
			const requestId = this.form.sourceRequestOrderId
			if (!requestId) return false
			const pending = db.list(T.QUOTE_ITEM, { orderId: this.id }).some((item) => item.needsAdminReview)
			if (pending) return false
			const request = db.get(T.REQUEST_ORDER, requestId)
			if (!request || request.status === 'approved') return false
			db.update(T.REQUEST_ORDER, requestId, {
				status: 'approved',
				approvedQuoteOrderId: this.id,
				adminReviewStatus: 'approved'
			})
			refreshCustomerOwner(this.form.customerId)
			sendToUser(this.form.customerId, '报价申请已通过', `您的报价申请已审核通过，报价员工：${this.form.employeeName || this.session.name}`, {
				type: 'request',
				refId: requestId,
				fromId: this.session.id,
				fromName: this.session.name,
				threadId: `request_${requestId}`
			})
			addOrderSystemFollow(this.id, `${this.session.name} 已完成来源客户报价申请审核`, this.session)
			return true
		},
		confirmCustomerChange(it) {
			if (!it._id) return
			db.update(T.QUOTE_ITEM, it._id, { customerPendingReview: false })
			it.customerPendingReview = false
			addOrderSystemFollow(this.id, `${this.session.name} 确认了客户对 ${it.productName} 的报价单修改`, this.session)
			this.loadFollows()
			toast('已确认客户修改', 'success')
		},
		notifySpecialPrice(item) {
			if (!item.needsAdminReview) return
			notifyEmployees('低价报价待审核', `${this.session.name} 对 ${item.productName} 报价 ${fmtMoney(item.price)}，低于最低销售价，需要管理员审核`, 'quote', this.id, {
				fromId: this.session.id,
				fromName: this.session.name,
				fromRole: this.session.role,
				threadId: `quote_${this.id || 'draft'}_${item.productId}`
			})
		},
		goSmartQuote(productId) {
			if (!productId) return
			const query = this.id ? `?orderId=${this.id}&productId=${productId}` : `?productId=${productId}`
			uni.navigateTo({ url: '/pages/quote/select' + query })
		},
		goExport() {
			if (this.pendingReviewCount) return toast('存在低价待审核商品，审核通过前不能导出报价')
			uni.navigateTo({ url: '/pages/quote/export?id=' + this.id })
		},
		async removeOrder() {
			if (await confirmDialog('确定删除该报价单及所有报价行？')) {
				db.removeWhere(T.QUOTE_ITEM, { orderId: this.id })
				db.remove(T.QUOTE_ORDER, this.id)
				toast('已删除', 'success')
				setTimeout(() => uni.navigateBack(), 300)
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.item-row { padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.item-row:last-child { border-bottom: none; }
.product-link { color: #2563eb; }
.follow-box { background: #f8fafc; border: 1rpx solid #edf1f6; border-radius: 16rpx; padding: 18rpx; margin-bottom: 20rpx; }
.follow-input { min-height: 130rpx; }
.follow-item { padding: 18rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.follow-item:last-child { border-bottom: none; }
.finance-box { margin-top: 18rpx; background: #f8fafc; border: 1rpx solid #edf1f6; border-radius: 14rpx; padding: 16rpx 18rpx; }
.mini-ipt { width: 120rpx; background: #f7f8fa; border-radius: 8rpx; padding: 8rpx 12rpx; font-size: 26rpx; text-align: center; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.modal-body { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 40rpx; max-height: 70vh; overflow-y: auto; }
.picker-item { padding: 24rpx 0; border-bottom: 1rpx solid #f0f1f4; font-size: 30rpx; }
</style>
