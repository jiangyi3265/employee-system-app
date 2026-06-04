<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<view class="row-between mb-m">
				<view class="row gap-s">
					<text class="t-title t-lg">{{ customer.name }}</text>
					<text class="tag" :class="gradeTag">{{ customer.grade }}级</text>
				</view>
				<text class="t-primary" @click="edit">编辑</text>
			</view>
			<view class="field"><text class="field-label">手机号</text><text class="field-input">{{ customer.phone }}</text></view>
			<view class="field"><text class="field-label">公司</text><text class="field-input">{{ customer.company || '-' }}</text></view>
			<view class="field"><text class="field-label">归属</text><text class="field-input">{{ poolLabel }}</text></view>
			<view class="field"><text class="field-label">负责员工</text><text class="field-input">{{ ownerName || '-' }}</text></view>
			<view class="field"><text class="field-label">审核状态</text><text class="field-input"><text class="tag" :class="customer.approved ? 'tag-green' : 'tag-orange'">{{ customer.approved ? '已审核' : '待审核' }}</text></text></view>
		</view>

		<view class="card" v-if="!customer.approved">
			<button class="btn btn-block" @click="approve">审核通过</button>
		</view>

		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">跟进记录</text>
				<text class="t-primary" @click="goFollow">查看全部</text>
			</view>
			<view class="follow-item" v-for="f in follows.slice(0, 3)" :key="f._id">
				<view class="row-between">
					<text class="t-sub">{{ f.way }} · {{ f.content }}</text>
					<text class="t-muted">{{ fmt(f.createTime) }}</text>
				</view>
			</view>
			<view class="empty" v-if="!follows.length">暂无跟进</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, POOL_LABEL } from '@/store/schema.js'
import { fmtDate, toast } from '@/utils/format.js'
import { notifyEmployees } from '@/utils/message.js'

export default {
	data() { return { id: '', customer: {}, follows: [], ownerName: '' } },
	computed: {
		gradeTag() { return { A: 'tag-red', B: 'tag-orange', C: 'tag-blue' }[this.customer.grade] || 'tag-gray' },
		poolLabel() { return POOL_LABEL[this.customer.pool] || '' }
	},
	onLoad(q) {
		if (q && q.id) { this.id = q.id; this.load() }
	},
	onShow() { if (this.id) this.load() },
	methods: {
		fmt(t) { return fmtDate(t, true) },
		load() {
			this.customer = db.get(T.CUSTOMER, this.id) || {}
			this.follows = db.list(T.FOLLOW, { customerId: this.id }, 'createTime', true)
			if (this.customer.ownerId) {
				const emp = db.get(T.EMPLOYEE, this.customer.ownerId)
				this.ownerName = emp ? emp.name : ''
			}
		},
		edit() { uni.navigateTo({ url: '/pages/archive/edit?type=customer&id=' + this.id }) },
		goFollow() { uni.navigateTo({ url: '/pages/follow/customer?id=' + this.id }) },
		approve() {
			db.update(T.CUSTOMER, this.id, { approved: true })
			notifyEmployees('客户审核通过', `客户 ${this.customer.name} 已通过审核`, 'notice', this.id)
			toast('已审核通过', 'success')
			this.load()
		}
	}
}
</script>

<style lang="scss" scoped>
.follow-item { padding: 16rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.follow-item:last-child { border-bottom: none; }
</style>
