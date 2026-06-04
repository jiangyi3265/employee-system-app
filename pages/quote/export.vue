<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<text class="t-title mb-m">{{ order.customerName }}采购物品询价单</text>
			<text class="t-sub">报价员工：{{ order.employeeName }}</text>
			<text class="t-sub">日期：{{ fmt(order.createTime) }}</text>
		</view>

		<view class="card">
			<text class="t-title mb-m">报价明细</text>
			<text class="t-danger mb-m" v-if="pendingReviewCount">有低价报价待管理员审核，未审核商品不会出现在报价单中。</text>
			<!-- 表头 -->
			<view class="tbl-header">
				<text class="tbl-cell c-seq">序号</text>
				<text class="tbl-cell c-name">物品名称</text>
				<text class="tbl-cell c-spec">规格</text>
				<text class="tbl-cell c-unit">单位</text>
				<text class="tbl-cell c-price">单价</text>
				<text class="tbl-cell c-qty">数量</text>
				<text class="tbl-cell c-total">合计</text>
			</view>
			<!-- 数据行 -->
			<view class="tbl-row" v-for="(it, i) in items" :key="it._id">
				<text class="tbl-cell c-seq">{{ i + 1 }}</text>
				<text class="tbl-cell c-name">{{ it.productName }}</text>
				<text class="tbl-cell c-spec">{{ it.spec }}</text>
				<text class="tbl-cell c-unit">{{ it.unit }}</text>
				<text class="tbl-cell c-price">{{ money(it.price) }}</text>
				<text class="tbl-cell c-qty">{{ it.qty }}</text>
				<text class="tbl-cell c-total t-price">{{ money(it.qty * it.price) }}</text>
			</view>
			<!-- 合计行 -->
			<view class="tbl-row tbl-footer" v-if="items.length">
				<text class="tbl-cell c-seq"></text>
				<text class="tbl-cell c-name"></text>
				<text class="tbl-cell c-spec"></text>
				<text class="tbl-cell c-unit"></text>
				<text class="tbl-cell c-price"></text>
				<text class="tbl-cell c-qty t-bold">合计</text>
				<text class="tbl-cell c-total t-price t-lg">{{ money(totalAmount) }}</text>
			</view>
		</view>

		<view class="card">
			<text class="t-title mb-m">订单统计</text>
			<view class="row-between"><text class="t-sub">{{ amountLabel }}</text><text class="t-bold">{{ money(finance.amount) }}</text></view>
			<view class="row-between"><text class="t-sub">成本金额</text><text class="t-bold">{{ money(finance.cost) }}</text></view>
			<view class="row-between"><text class="t-sub">利润金额</text><text class="t-bold" :class="finance.profit < 0 ? 't-danger' : 't-success'">{{ money(finance.profit) }}</text></view>
			<view class="row-between"><text class="t-sub">利润率</text><text class="t-bold" :class="finance.profitRate < 10 ? 't-danger' : 't-success'">{{ finance.profitRate }}%</text></view>
		</view>

		<view style="margin: 30rpx 24rpx;">
			<button class="btn btn-block" @click="doExport">复制报价单文本</button>
			<button class="btn btn-ghost btn-block mt-m" @click="copyCsv">复制CSV表格</button>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { fmtMoney, fmtDate, toast } from '@/utils/format.js'
import { isQuotableQuoteItem } from '@/utils/pricing.js'
import { orderFinance } from '@/utils/stats.js'

export default {
	data() { return { id: '', order: {}, items: [], pendingReviewCount: 0 } },
	computed: {
		totalAmount() { return this.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0) },
		finance() { return orderFinance(this.id, this.order.dealStatus !== 'pending') },
		amountLabel() { return this.order.dealStatus === 'pending' ? '订单金额' : '成交金额' }
	},
	onLoad(q) {
		if (q && q.id) {
			this.id = q.id
			this.order = db.get(T.QUOTE_ORDER, q.id) || {}
			const allItems = db.list(T.QUOTE_ITEM, { orderId: q.id })
			this.pendingReviewCount = allItems.filter((it) => it.needsAdminReview).length
			this.items = allItems.filter(isQuotableQuoteItem)
		}
	},
	methods: {
		money(n) { return fmtMoney(n) },
		fmt(t) { return fmtDate(t) },
		csvCell(v) {
			const s = String(v == null ? '' : v)
			return `"${s.replace(/"/g, '""')}"`
		},
		doExport() {
			let text = `${this.order.customerName}采购物品询价单\n\n`
			text += '序号\t物品名称\t规格\t单位\t单价\t数量\t合计\n'
			this.items.forEach((it, i) => {
				text += `${i + 1}\t${it.productName}\t${it.spec}\t${it.unit}\t${Number(it.price).toFixed(2)}\t${it.qty}\t${(it.qty * it.price).toFixed(2)}\n`
			})
			text += `\n合计：¥${this.totalAmount.toFixed(2)}`
			uni.setClipboardData({ data: text, success: () => toast('已复制到剪贴板', 'success') })
		},
		copyCsv() {
			const rows = [
				[`${this.order.customerName || ''}采购物品询价单`],
				[],
				['序号', '物品名称', '规格', '单位', '单价', '数量', '合计']
			]
			this.items.forEach((it, i) => {
				rows.push([
					i + 1,
					it.productName,
					it.spec,
					it.unit,
					Number(it.price || 0).toFixed(2),
					Number(it.qty || 0),
					((Number(it.qty) || 0) * (Number(it.price) || 0)).toFixed(2)
				])
			})
			rows.push([])
			rows.push(['', '', '', '', '', '合计', this.totalAmount.toFixed(2)])
			const csv = rows.map((row) => row.map(this.csvCell).join(',')).join('\n')
			uni.setClipboardData({ data: csv, success: () => toast('CSV表格已复制', 'success') })
		}
	}
}
</script>

<style lang="scss" scoped>
.tbl-header, .tbl-row { display: flex; flex-direction: row; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f1f4; font-size: 24rpx; }
.tbl-header { font-weight: 700; color: #6b7280; }
.tbl-footer { border-bottom: none; border-top: 2rpx solid #1f2937; }
.tbl-cell { padding: 0 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c-seq { width: 60rpx; text-align: center; }
.c-name { width: 160rpx; }
.c-spec { width: 120rpx; }
.c-unit { width: 60rpx; text-align: center; }
.c-price { width: 100rpx; text-align: right; }
.c-qty { width: 80rpx; text-align: center; }
.c-total { flex: 1; text-align: right; }
</style>
