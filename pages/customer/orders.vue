<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">我的报价单</text>
			<text class="sub-hero-desc">查看销售专员为您量身定制的各项产品特惠报价与成交状态</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ list.length }}</text><text class="metric-label">报价单</text></view>
				<view class="metric-pill"><text class="metric-num">{{ dealCount }}</text><text class="metric-label">已成交</text></view>
				<view class="metric-pill"><text class="metric-num t-price">{{ money(totalAmount) }}</text><text class="metric-label">总计价值</text></view>
			</view>
		</view>

		<view class="sub-empty" v-if="!list.length">暂无报价单数据，待审核申请请到“申请报价”查看</view>

		<view class="list-card order" v-for="o in list" :key="o._id">
			<view class="row-between">
				<view class="row gap-s">
					<view class="role-avatar">{{ o.employeeName ? o.employeeName[0] : '销' }}</view>
					<view class="col">
						<text class="t-title" style="font-size:30rpx;">报价销售：{{ o.employeeName || '系统销售' }}</text>
						<text class="t-muted" style="font-size:22rpx;margin-top:4rpx;">日期：{{ fmt(o.createTime) }}</text>
					</view>
				</view>
				<text class="tag" :class="dealTag(o.dealStatus)">{{ dealLabel(o.dealStatus) }}</text>
			</view>
			<view class="divider"></view>
			<view class="item" v-for="it in getItems(o._id)" :key="it._id">
				<view class="row-between">
					<view class="col">
						<view class="row gap-s wrap">
							<text class="t-bold product-link" style="font-size:27rpx;" @click="goProduct(it.productId)">{{ it.productName }}</text>
							<text class="tag tag-orange" v-if="it.customerPendingReview">待销售确认</text>
						</view>
						<text class="t-sub" style="font-size:23rpx;margin-top:4rpx;">规格：{{ it.spec }}</text>
					</view>
					<view class="col" style="align-items:flex-end;">
						<text class="t-price" style="font-size:28rpx;">{{ money(it.price) }}</text>
						<text class="t-muted" style="font-size:22rpx;margin-top:4rpx;">数量：{{ it.qty }} {{ it.unit || '个' }}</text>
					</view>
				</view>
			</view>
			<view class="divider" style="margin-bottom:12rpx;"></view>
			<view class="row-between" style="padding-top:8rpx;">
				<text class="t-muted" style="font-size:24rpx;">共计 {{ getItemsCount(o._id) }} 项商品</text>
				<view class="row">
					<text class="t-sub" style="font-size:24rpx;margin-right:8rpx;">{{ amountLabel(o) }}:</text>
					<text class="t-price t-bold" style="font-size:32rpx;">{{ money(orderFinance(o).amount) }}</text>
				</view>
			</view>
			<view class="finance-grid">
				<view><text class="t-muted">成本</text><text class="finance-num">{{ money(orderFinance(o).cost) }}</text></view>
				<view><text class="t-muted">利润</text><text class="finance-num" :class="orderFinance(o).profit < 0 ? 't-danger' : 't-success'">{{ money(orderFinance(o).profit) }}</text></view>
				<view><text class="t-muted">利润率</text><text class="finance-num" :class="orderFinance(o).profitRate < 10 ? 't-danger' : 't-success'">{{ orderFinance(o).profitRate }}%</text></view>
			</view>
			<view class="order-actions">
				<button class="btn btn-sm btn-ghost action-btn" @click="copyQuote(o)">复制报价单</button>
				<button class="btn btn-sm btn-ghost action-btn" v-if="o.dealStatus === 'pending'" @click="startQuoteModify(o)">申请修改</button>
				<button class="btn btn-sm action-btn" v-if="o.dealStatus === 'pending'" @click="openAction(o, 'deal')">申请成交变更</button>
			</view>
		</view>

		<view class="modal-mask" v-if="showAction" @click="showAction = false">
			<view class="modal-body" @click.stop>
				<text class="t-title mb-m">{{ actionTitle }}</text>
				<textarea class="input-box" v-model="actionText" :placeholder="actionPlaceholder" style="height:180rpx;" />
				<button class="btn btn-block mt-m" @click="submitAction">提交给销售</button>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, DEAL_STATUS_LABEL } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtDate, fmtMoney, toast } from '@/utils/format.js'
import { notifyEmployees } from '@/utils/message.js'
import { addOrderFollow } from '@/utils/follow.js'
import { orderFinance as calcOrderFinance } from '@/utils/stats.js'
import { isQuotableQuoteItem } from '@/utils/pricing.js'

export default {
	data() {
		return {
			list: [],
			session: {},
			showAction: false,
			actionOrder: null,
			actionType: '',
			actionText: ''
		}
	},
	computed: {
		dealCount() {
			return this.list.filter((o) => o.dealStatus === 'done').length
		},
		totalAmount() {
			return this.list.reduce((sum, o) => sum + this.orderFinance(o).amount, 0)
		},
		actionTitle() {
			return '申请成交状态变更'
		},
		actionPlaceholder() {
			return '请说明希望改为已成交、未成交或部分成交的原因'
		}
	},
	onShow() {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.load()
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		money(n) { return fmtMoney(n) },
		dealLabel(s) { return DEAL_STATUS_LABEL[s] || '未知' },
		dealTag(s) { return { pending: 'tag-orange', partial: 'tag-blue', done: 'tag-green' }[s] || 'tag-gray' },
		goProduct(id) {
			if (id) uni.navigateTo({ url: '/pages/customer/product-detail?id=' + id })
		},
		load() {
			this.list = db.list(T.QUOTE_ORDER, { customerId: this.session.id }, 'createTime', true)
				.filter((o) => o.dealStatus === 'pending' || o.dealStatus === 'done')
				.filter((o) => this.getItems(o._id).length > 0)
		},
		getItems(orderId) { return db.list(T.QUOTE_ITEM, { orderId }).filter(isQuotableQuoteItem) },
		getItemsCount(orderId) { return this.getItems(orderId).length },
		getOrderTotal(orderId) {
			const items = this.getItems(orderId)
			return items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0)
		},
		orderFinance(order) {
			return calcOrderFinance(order._id, order.dealStatus !== 'pending')
		},
		amountLabel(order) {
			return order.dealStatus === 'pending' ? '订单金额' : '成交金额'
		},
		copyQuote(order) {
			const items = this.getItems(order._id)
			let text = `${this.session.name || ''}采购物品询价单\n\n`
			text += '序号\t物品名称\t规格\t单位\t单价\t数量\t合计\n'
			items.forEach((it, i) => {
				text += `${i + 1}\t${it.productName}\t${it.spec}\t${it.unit || '个'}\t${Number(it.price || 0).toFixed(2)}\t${it.qty}\t${((Number(it.price) || 0) * (Number(it.qty) || 0)).toFixed(2)}\n`
			})
			text += `\n合计：${this.getOrderTotal(order._id).toFixed(2)}`
			uni.setClipboardData({ data: text, success: () => toast('报价单已复制', 'success') })
		},
		startQuoteModify(order) {
			const items = this.getItems(order._id)
			const cart = items.map((it) => ({
				_id: it.productId,
				name: it.productName,
				spec: it.spec,
				suggestPrice: it.price,
				retailPrice: it.price,
				qty: Number(it.qty) || 1,
				customerExpect: Number(it.price) || '',
				supplierQuotes: []
			}))
			uni.setStorageSync('sqms_cart', cart)
			uni.setStorageSync('sqms_modify_quote_id', order._id)
			uni.removeStorageSync('sqms_append_request_id')
			uni.navigateTo({ url: '/pages/customer/cart' })
		},
		openAction(order, type) {
			this.actionOrder = order
			this.actionType = type
			this.actionText = ''
			this.showAction = true
		},
		submitAction() {
			if (!this.actionText.trim()) return toast('请填写申请说明')
			const title = this.actionType === 'deal' ? '客户申请成交状态变更' : '客户申请修改报价'
			const threadId = `quote_${this.actionOrder._id}_${this.session.id}`
			notifyEmployees(title, `客户 ${this.session.name} 对报价单提交申请：${this.actionText.trim()}`, 'quote', this.actionOrder._id, {
				fromId: this.session.id,
				fromName: this.session.name,
				fromRole: this.session.role,
				threadId
			})
			addOrderFollow({
				employeeId: this.actionOrder.employeeId,
				employeeName: this.actionOrder.employeeName,
				orderId: this.actionOrder._id,
				way: '系统',
				actorRole: 'system',
				source: 'quote',
				content: `${title}：${this.actionText.trim()}`
			})
			this.showAction = false
			toast('已提交给销售', 'success')
		}
	}
}
</script>

<style lang="scss" scoped>
.order { margin: 16rpx 24rpx; }
.role-avatar { width: 68rpx; height: 68rpx; border-radius: 50%; background: #edf3ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 800; margin-right: 16rpx; }
.item { padding: 16rpx 0; border-bottom: 1rpx dashed #f0f1f4; }
.item:last-child { border-bottom: none; }
.text-dark { color: #1f2937; }
.product-link { color: #2563eb; }
.request-item { padding: 18rpx 0; border-bottom: 1rpx solid #edf1f6; }
.request-item:last-child { border-bottom: none; }
.request-products { margin-top: 14rpx; background: #f8fafc; border: 1rpx solid #edf1f6; border-radius: 14rpx; padding: 6rpx 14rpx; }
.request-product { display: flex; flex-direction: row; align-items: center; padding: 14rpx 0; border-bottom: 1rpx dashed #e5e7eb; }
.request-product:last-child { border-bottom: none; }
.mini-ipt { width: 120rpx; background: #f3f6fb; border: 1rpx solid #e2e8f0; border-radius: 10rpx; padding: 8rpx 12rpx; font-size: 25rpx; text-align: center; }
.text-action { font-size: 24rpx; padding: 6rpx 8rpx; }
.order-actions { display: flex; flex-direction: row; gap: 12rpx; margin-top: 20rpx; }
.action-btn { flex: 1; height: 64rpx; font-size: 23rpx; padding: 0 8rpx; }
.finance-grid { display: flex; flex-direction: row; gap: 12rpx; margin-top: 16rpx; background: #f8fafc; border-radius: 12rpx; padding: 14rpx; }
.finance-grid > view { flex: 1; min-width: 0; }
.finance-num { display: block; font-size: 24rpx; font-weight: 700; margin-top: 4rpx; color: #111827; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.modal-body { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 40rpx; }
</style>
