<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">员工档案</text>
			<text class="sub-hero-desc">管理公司销售及管理团队，控制系统登录与报价权限</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ all.length }}</text><text class="metric-label">总人数</text></view>
				<view class="metric-pill"><text class="metric-num">{{ adminCount }}</text><text class="metric-label">管理员</text></view>
				<view class="metric-pill"><text class="metric-num">{{ activeCount }}</text><text class="metric-label">在职销售</text></view>
			</view>
		</view>

		<view class="toolbar">
			<input class="toolbar-search" v-model="kw" placeholder="搜索员工姓名 / 手机号" @input="load" />
		</view>

		<view class="sub-empty" v-if="!list.length">暂无匹配员工，点击右下角新增</view>

		<view class="list-card emp" v-for="e in list" :key="e._id" @click="go(e._id)">
			<view class="row-between">
				<view class="col flex1">
					<view class="row gap-s">
						<text class="t-title" style="font-size:30rpx;">{{ e.name }}</text>
						<text class="tag" :class="e.role === 'admin' ? 'tag-red' : 'tag-blue'">{{ roleLabel(e.role) }}</text>
						<text class="tag tag-green" v-if="e.isPurchaser">采购员</text>
					</view>
					<text class="t-sub mt-s">手机：{{ e.phone }} · 职位：{{ e.position || '-' }}</text>
					<text class="t-muted mt-s" v-if="e.remark">备注：{{ e.remark }}</text>
				</view>
				<view class="row gap-s">
					<text class="tag" :class="e.disabled ? 'tag-orange' : 'tag-green'">{{ e.disabled ? '已停用' : '正常' }}</text>
					<text class="inline-action">编辑</text>
				</view>
			</view>
		</view>
		<view class="fab" @click="add">+</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, ROLE_LABEL } from '@/store/schema.js'

export default {
	data() { return { list: [], all: [], kw: '' } },
	computed: {
		adminCount() { return this.all.filter((e) => e.role === 'admin').length },
		activeCount() { return this.all.filter((e) => e.role === 'employee' && !e.disabled).length }
	},
	onShow() { this.load() },
	methods: {
		roleLabel(r) { return ROLE_LABEL[r] || '员工' },
		load() {
			this.all = db.list(T.EMPLOYEE, null, 'createTime', true)
			let list = this.all
			const kw = this.kw.trim()
			if (kw) list = list.filter((e) => (e.name + e.phone + (e.position || '') + (e.remark || '')).indexOf(kw) >= 0)
			this.list = list
		},
		go(id) { uni.navigateTo({ url: '/pages/archive/edit?type=employee&id=' + id }) },
		add() { uni.navigateTo({ url: '/pages/archive/edit?type=employee' }) }
	}
}
</script>

<style lang="scss" scoped>
.emp:active { transform: scale(0.995); }
</style>
