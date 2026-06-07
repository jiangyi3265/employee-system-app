<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">联系我们</text>
			<text class="sub-hero-desc">销售与管理人员联系方式，按负责事项选择联系人</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ employees.length }}</text><text class="metric-label">可联系员工</text></view>
				<view class="metric-pill"><text class="metric-num">{{ salesCount }}</text><text class="metric-label">销售人员</text></view>
			</view>
		</view>

		<view class="toolbar">
			<input class="toolbar-search" v-model="kw" placeholder="搜索姓名 / 职位 / 负责事项" @input="load" />
		</view>

		<view class="sub-empty" v-if="!list.length">{{ loadingContacts ? '正在加载联系人...' : '暂无联系人' }}</view>

		<view class="list-card contact" v-for="e in list" :key="e._id" @click="copyPhone(e)">
			<view class="row-between">
				<view class="col flex1">
					<view class="row gap-s wrap">
						<text class="t-title" style="font-size:30rpx;">{{ e.name }}</text>
						<text class="tag" :class="e.role === 'admin' ? 'tag-red' : 'tag-blue'">{{ e.role === 'admin' ? '管理员' : '员工' }}</text>
					</view>
					<text class="t-sub mt-s">职位：{{ e.position || '-' }}</text>
					<text class="t-sub mt-s">电话：{{ e.phone || '-' }}</text>
					<text class="t-muted mt-s" v-if="e.remark">备注/负责事项：{{ e.remark }}</text>
				</view>
				<view class="col contact-actions">
					<text class="inline-action" @click.stop="copyPhone(e)">复制电话</text>
					<text class="inline-action mt-s" v-if="isAdmin" @click.stop="editContact(e)">编辑</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'
import { toast } from '@/utils/format.js'
import { getSession } from '@/utils/auth.js'
import { pullAll } from '@/store/remote.js'

export default {
	data() { return { employees: [], list: [], kw: '', session: {}, loadingContacts: false } },
	computed: {
		salesCount() {
			return this.employees.filter((e) => e.role !== 'admin').length
		},
		isAdmin() {
			return this.session.role === ROLE.ADMIN
		}
	},
	onShow() {
		this.session = getSession() || {}
		this.load()
		this.refreshContacts()
	},
	methods: {
		load() {
			this.employees = db.list(T.EMPLOYEE, { disabled: false }, 'createTime', true)
			const kw = this.kw.trim()
			this.list = kw
				? this.employees.filter((e) => (e.name + (e.position || '') + (e.phone || '') + (e.remark || '')).indexOf(kw) >= 0)
				: this.employees
		},
		async refreshContacts() {
			if (this.loadingContacts) return
			this.loadingContacts = true
			try {
				const res = await pullAll()
				const employees = (((res || {}).data || {})[T.EMPLOYEE] || []).filter((e) => !e.disabled)
				if (employees.length) {
					db.setAll(T.EMPLOYEE, employees, true)
					this.load()
				}
			} catch (e) {
				console.warn('Contact refresh failed:', e && e.message ? e.message : e)
			} finally {
				this.loadingContacts = false
			}
		},
		copyPhone(e) {
			if (!e.phone) return toast('暂无电话')
			uni.setClipboardData({ data: e.phone, success: () => toast('电话已复制', 'success') })
		},
		editContact(e) {
			uni.navigateTo({ url: '/pages/archive/edit?type=employee&id=' + e._id })
		}
	}
}
</script>

<style lang="scss" scoped>
.contact:active { transform: scale(0.995); }
.contact-actions { align-items: flex-end; min-width: 120rpx; }
</style>
