<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">采购管理</text>
			<text class="sub-hero-desc">按供应商和时间追踪采购订单，便于同步产品成本</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ allCount }}</text><text class="metric-label">采购单</text></view>
				<view class="metric-pill"><text class="metric-num">{{ supplierCount }}</text><text class="metric-label">供应商</text></view>
				<view class="metric-pill"><text class="metric-num">{{ money(totalFreight) }}</text><text class="metric-label">运费</text></view>
			</view>
		</view>

		<view class="toolbar">
			<input class="toolbar-search" v-model="kw" placeholder="搜索供应商 / 员工" @input="load" />
		</view>
		<view class="filter-bar">
			<picker :range="supplierOptions" :range-key="'name'" @change="pickSupplier">
				<view class="filter-chip">{{ supplierName || '全部供应商' }}</view>
			</picker>
			<picker mode="date" @change="startDate = $event.detail.value; load()">
				<view class="filter-chip">{{ startDate || '开始日期' }}</view>
			</picker>
			<picker mode="date" @change="endDate = $event.detail.value; load()">
				<view class="filter-chip">{{ endDate || '结束日期' }}</view>
			</picker>
			<text class="inline-action" @click="clearFilters">重置</text>
		</view>

		<view class="sub-empty" v-if="!list.length">暂无采购订单，点击右下角新增采购</view>

		<view class="list-card order" v-for="o in list" :key="o._id" @click="go(o._id)">
			<view class="row-between">
				<text class="t-title" style="font-size:30rpx;">{{ o.supplierName }}</text>
				<text class="tag" :class="o.status === 'pre' ? 'tag-blue' : 'tag-green'">{{ o.status === 'pre' ? '预采购' : '采购单' }}</text>
			</view>
			<text class="meta-line">采购员工：{{ o.employeeName || '-' }} · 明细 {{ itemCount(o._id) }} 项</text>
			<view class="row-between mt-s">
				<text class="t-sub">{{ fmt(o.createTime) }} · 运费：{{ money(o.freight || 0) }}</text>
				<text class="inline-action">查看详情</text>
			</view>
		</view>

		<view class="fab" @click="add">+</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { fmtDate, fmtMoney } from '@/utils/format.js'
import { getSession } from '@/utils/auth.js'
import { isPurchaseManager } from '@/utils/purchase.js'

export default {
	data() { return { list: [], all: [], kw: '', suppliers: [], supplierId: '', supplierName: '', startDate: '', endDate: '', session: {}, managerMode: false } },
	computed: {
		allCount() { return this.all.length },
		totalFreight() { return this.all.reduce((s, o) => s + (Number(o.freight) || 0), 0) },
		supplierCount() { return new Set(this.all.map((o) => o.supplierId).filter(Boolean)).size },
		supplierOptions() { return [{ _id: '', name: '全部供应商' }].concat(this.suppliers) }
	},
	onShow() {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.managerMode = isPurchaseManager(s)
		this.load()
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		money(n) { return fmtMoney(n) },
		itemCount(orderId) { return db.count(T.PURCHASE_ITEM, { purchaseOrderId: orderId }) },
		pickSupplier(e) {
			const s = this.supplierOptions[e.detail.value]
			this.supplierId = s ? s._id : ''
			this.supplierName = s && s._id ? s.name : ''
			this.load()
		},
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
		clearFilters() {
			this.kw = ''
			this.supplierId = ''
			this.supplierName = ''
			this.startDate = ''
			this.endDate = ''
			this.load()
		},
		load() {
			this.suppliers = db.list(T.SUPPLIER, null, 'name')
			this.all = db.list(T.PURCHASE_ORDER, null, 'createTime', true)
			if (!this.managerMode) this.all = this.all.filter((o) => o.employeeId === this.session.id)
			const kw = this.kw.trim()
			const start = this.dateStart(this.startDate)
			const end = this.dateEnd(this.endDate)
			let list = this.all
			if (kw) list = list.filter((o) => ((o.supplierName || '') + (o.employeeName || '')).indexOf(kw) >= 0)
			if (this.supplierId) list = list.filter((o) => o.supplierId === this.supplierId)
			list = list.filter((o) => (o.createTime || 0) >= start && (o.createTime || 0) <= end)
			this.list = list
		},
		go(id) { uni.navigateTo({ url: '/pages/purchase/detail?id=' + id }) },
		add() { uni.navigateTo({ url: '/pages/purchase/detail' }) }
	}
}
</script>

<style lang="scss" scoped>
.order:active { transform: scale(0.995); }
.filter-bar { display: flex; flex-direction: row; align-items: center; gap: 12rpx; padding: 0 24rpx 20rpx; background: #fff; flex-wrap: wrap; }
.filter-chip { background: #f3f6fb; border: 1rpx solid #e8edf5; border-radius: 999rpx; padding: 12rpx 18rpx; font-size: 24rpx; color: #4b5563; }
</style>
