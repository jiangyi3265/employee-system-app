<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">统计筛选</text>
				<text class="inline-action" @click="resetFilters">重置</text>
			</view>
			<view class="filter-row">
				<picker mode="date" @change="startDate = $event.detail.value; load()">
					<view class="filter-chip">{{ startDate || '开始日期' }}</view>
				</picker>
				<picker mode="date" @change="endDate = $event.detail.value; load()">
					<view class="filter-chip">{{ endDate || '结束日期' }}</view>
				</picker>
				<button class="btn btn-sm btn-ghost export-btn" @click="copyStats">复制统计</button>
			</view>
		</view>

		<view class="card">
			<text class="t-title mb-m">整体概览</text>
			<view class="stat-grid">
				<view class="stat-cell"><view class="stat-inner"><text class="stat-num">{{ stat.employeeCount }}</text><text class="stat-label">员工数</text></view></view>
				<view class="stat-cell"><view class="stat-inner"><text class="stat-num">{{ stat.customerCount }}</text><text class="stat-label">客户数</text></view></view>
				<view class="stat-cell"><view class="stat-inner"><text class="stat-num">{{ stat.quoteCount }}</text><text class="stat-label">报价单数</text></view></view>
				<view class="stat-cell"><view class="stat-inner"><text class="stat-num t-price">{{ money(stat.dealAmount) }}</text><text class="stat-label">成交金额</text></view></view>
			</view>
		</view>

		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">员工跟进统计</text>
				<text class="inline-action" @click="goFollow">查看跟进明细</text>
			</view>
			<view class="rank-item" v-for="f in followStats" :key="f.employeeId">
				<view class="row-between">
					<text class="t-bold">{{ f.name }}</text>
					<text class="tag" :class="f.overdue ? 'tag-red' : 'tag-green'">达成率 {{ f.rate }}%</text>
				</view>
				<text class="t-sub mt-s">已跟进 {{ f.followed }} 条 · 超期 {{ f.overdue }} 条 · 已报价未跟进 {{ f.quotedUndealOverdue }} 条 · 未报价未跟进 {{ f.unquotedOverdue }} 条</text>
			</view>
		</view>

		<view class="card">
			<text class="t-title mb-m">员工业绩排行</text>
			<view class="rank-item" v-for="(e, i) in empRank" :key="e.employeeId">
				<view class="row-between">
					<view class="row gap-s">
						<text class="rank-num">{{ i + 1 }}</text>
						<text class="t-bold">{{ e.name }}</text>
					</view>
					<text class="t-price">{{ money(e.dealAmount) }}</text>
				</view>
				<view class="row-between mt-s">
					<text class="t-sub">成交{{ e.dealCount }}单 · 报价{{ e.quoteCount }}单</text>
					<text class="t-sub">利润率{{ e.avgProfitRate }}%</text>
				</view>
			</view>
			<view class="empty" v-if="!empRank.length">暂无数据</view>
		</view>

		<view class="card">
			<text class="t-title mb-m">产品成交排行（前100条）</text>
			<view class="rank-item" v-for="(p, i) in prodRank" :key="i">
				<view class="row-between">
					<view class="row gap-s">
						<text class="rank-num">{{ i + 1 }}</text>
						<text class="t-bold">{{ p.productName }}</text>
					</view>
					<text class="t-sub">成交{{ p.totalQty }}件 · {{ money(p.totalAmount) }}</text>
				</view>
			</view>
			<view class="empty" v-if="!prodRank.length">暂无数据</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, DEAL_STATUS } from '@/store/schema.js'
import { adminDashboard, employeeFollowStats } from '@/utils/stats.js'
import { fmtMoney, sumBy, toast } from '@/utils/format.js'
import { isEffectiveQuoteItem } from '@/utils/pricing.js'

export default {
	data() { return { stat: {}, empRank: [], prodRank: [], followStats: [], startDate: '', endDate: '' } },
	onShow() { this.load() },
	methods: {
		money(n) { return fmtMoney(n) },
		dateStart(date) {
			if (!date) return 0
			const d = new Date(date.replace(/-/g, '/'))
			d.setHours(0, 0, 0, 0)
			return d.getTime()
		},
		dateEnd(date) {
			if (!date) return Infinity
			const d = new Date(date.replace(/-/g, '/'))
			d.setHours(23, 59, 59, 999)
			return d.getTime()
		},
		inRange(ts, start, end) {
			const t = ts || 0
			return t >= start && t <= end
		},
		resetFilters() {
			this.startDate = ''
			this.endDate = ''
			this.load()
		},
		goFollow() {
			uni.navigateTo({ url: '/pages/follow/index' })
		},
		copyStats() {
			let text = `统计区间：${this.startDate || '全部'} 至 ${this.endDate || '全部'}\n`
			text += `报价单数：${this.stat.quoteCount}\n成交金额：${this.money(this.stat.dealAmount)}\n\n员工跟进统计\n`
			this.followStats.forEach((f) => {
				text += `${f.name}\t已跟进${f.followed}\t超期${f.overdue}\t已报价未跟进${f.quotedUndealOverdue}\t未报价未跟进${f.unquotedOverdue}\t达成率${f.rate}%\n`
			})
			uni.setClipboardData({ data: text, success: () => toast('统计已复制', 'success') })
		},
		load() {
			const start = this.dateStart(this.startDate)
			const end = this.dateEnd(this.endDate)
			const base = adminDashboard()
			const rangeOrders = db.list(T.QUOTE_ORDER).filter((o) => this.inRange(o.createTime, start, end))
			const rangeDoneItems = db.list(T.QUOTE_ITEM, { status: 'done' })
				.filter(isEffectiveQuoteItem)
				.filter((it) => this.inRange(it.updateTime || it.createTime, start, end))
			this.stat = {
				...base,
				quoteCount: rangeOrders.length,
				dealAmount: sumBy(rangeDoneItems, (it) => (Number(it.price) || 0) * (Number(it.qty) || 0))
			}
			// 员工业绩排行
			const employees = db.list(T.EMPLOYEE, { disabled: false })
			this.empRank = employees.map((e) => {
				const orders = db.list(T.QUOTE_ORDER, { employeeId: e._id }).filter((o) => this.inRange(o.createTime, start, end))
				const items = db.list(T.QUOTE_ITEM, { employeeId: e._id, status: 'done' })
					.filter(isEffectiveQuoteItem)
					.filter((it) => this.inRange(it.updateTime || it.createTime, start, end))
				const dealAmount = sumBy(items, (it) => (Number(it.price) || 0) * (Number(it.qty) || 0))
				const dealCount = orders.filter((o) => o.dealStatus === DEAL_STATUS.DONE).length
				const profitRates = items.map((it) => {
					const cost = Number(it.costPrice) || 0
					return cost ? ((Number(it.price) - cost) / cost * 100) : 0
				})
				const avgProfitRate = profitRates.length ? Math.round(profitRates.reduce((a, b) => a + b, 0) / profitRates.length) : 0
				return { employeeId: e._id, name: e.name, quoteCount: orders.length, dealCount, dealAmount, avgProfitRate }
			}).sort((a, b) => b.dealAmount - a.dealAmount)

			// 产品成交排行
			const doneItems = rangeDoneItems
			const prodMap = {}
			doneItems.forEach((it) => {
				if (!prodMap[it.productId]) prodMap[it.productId] = { productName: it.productName, totalQty: 0, totalAmount: 0 }
				prodMap[it.productId].totalQty += Number(it.qty) || 0
				prodMap[it.productId].totalAmount += (Number(it.price) || 0) * (Number(it.qty) || 0)
			})
			this.prodRank = Object.values(prodMap).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 100)
			this.followStats = employees.map((e) => ({ employeeId: e._id, name: e.name, ...employeeFollowStats(e._id) }))
		}
	}
}
</script>

<style lang="scss" scoped>
.rank-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.rank-item:last-child { border-bottom: none; }
.rank-num { width: 44rpx; height: 44rpx; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; color: #6b7280; }
.filter-row { display: flex; flex-direction: row; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.filter-chip { background: #f3f6fb; border: 1rpx solid #e8edf5; border-radius: 999rpx; padding: 12rpx 20rpx; font-size: 25rpx; color: #4b5563; }
.export-btn { height: 64rpx; }
</style>
