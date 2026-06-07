<template>
	<view class="page">
		<global-stats />
		<view class="profile">
			<view class="avatar">{{ (user.name || '用')[0] }}</view>
			<view class="col flex1">
				<text class="name">{{ user.name }}</text>
				<text class="sub">{{ roleLabel }} · {{ user.phone }}</text>
				<text class="sub" v-if="user.company">{{ user.company }}</text>
				<text class="sub" v-if="user.position">{{ user.position }}</text>
			</view>
			<view class="tag" :class="gradeTag" v-if="isCustomer">{{ user.grade }}级客户</view>
		</view>

		<view class="card menu">
			<view class="menu-item" v-for="(m, i) in menus" :key="i" @click="go(m.url)">
				<view class="menu-icon" :class="m.icon"><view class="ui-icon"></view></view>
				<text class="menu-text flex1">{{ m.name }}</text>
				<view class="menu-arrow"></view>
			</view>
		</view>

		<view class="card menu">
			<view class="menu-item" @click="resetDemo">
				<view class="menu-icon i-refresh"><view class="ui-icon"></view></view>
				<text class="menu-text flex1">重置演示数据</text>
				<view class="menu-arrow"></view>
			</view>
		</view>

		<view style="margin: 40rpx 24rpx;">
			<button class="btn btn-gray btn-block" @click="logout">退出登录</button>
		</view>
	</view>
</template>

<script>
import { getSession, currentUser, clearSession, isCustomer } from '@/utils/auth.js'
import { ROLE, ROLE_LABEL } from '@/store/schema.js'
import { resetData } from '@/store/seed.js'
import { confirmDialog, toast } from '@/utils/format.js'

export default {
	data() {
		return { session: {}, user: {} }
	},
	computed: {
		roleLabel() { return ROLE_LABEL[this.session.role] || '' },
		isCustomer() { return this.session.role === ROLE.CUSTOMER },
		gradeTag() {
			return { A: 'tag-red', B: 'tag-orange', C: 'tag-blue' }[this.user.grade] || 'tag-gray'
		},
		menus() {
			if (this.session.role === ROLE.CUSTOMER) {
				return [
					{ name: '我的报价', icon: 'i-quote', url: '/pages/customer/orders' },
					{ name: '商品浏览', icon: 'i-product', url: '/pages/customer/products' },
					{ name: '联系我们', icon: 'i-user', url: '/pages/customer/contact' },
					{ name: '投诉建议', icon: 'i-chat', url: '/pages/customer/suggest' }
				]
			}
			const base = [
				{ name: '我的报价单', icon: 'i-quote', url: '/pages/quote/list' },
				{ name: '客户跟进', icon: 'i-phone', url: '/pages/follow/index' },
				{ name: '联系我们', icon: 'i-user', url: '/pages/customer/contact' }
			]
			if (this.session.role === ROLE.ADMIN) {
				base.unshift({ name: '统计分析', icon: 'i-chart', url: '/pages/admin/stats' })
				base.push({ name: '员工档案', icon: 'i-user', url: '/pages/archive/employee' })
				base.push({ name: '价格参数设置', icon: 'i-setting', url: '/pages/product/settings' })
			}
			return base
		}
	},
	onShow() {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.user = currentUser() || { name: s.name }
	},
	methods: {
		go(url) { uni.navigateTo({ url }) },
		async logout() {
			if (await confirmDialog('确定退出登录？')) {
				clearSession()
				uni.redirectTo({ url: '/pages/login/login' })
			}
		},
		async resetDemo() {
			if (await confirmDialog('将清空当前数据并恢复演示数据，确定？')) {
				resetData()
				toast('已重置', 'success')
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.profile { display: flex; flex-direction: row; align-items: center; background: linear-gradient(135deg, #2563eb, #1e40af); padding: 60rpx 40rpx; gap: 24rpx; }
.avatar { width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(255,255,255,0.2); color: #fff; font-size: 56rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.name { color: #fff; font-size: 38rpx; font-weight: 800; }
.sub { color: rgba(255,255,255,0.8); font-size: 24rpx; margin-top: 6rpx; }
.menu { padding: 8rpx 28rpx; }
.menu-item { display: flex; flex-direction: row; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.menu-item:last-child { border-bottom: none; }
.menu-icon { position: relative; width: 68rpx; height: 68rpx; border-radius: 20rpx; margin-right: 20rpx; background: #edf3ff; color: #2563eb; display: flex; align-items: center; justify-content: center; }
.menu-text { font-size: 30rpx; color: #374151; }
.menu-arrow { width: 16rpx; height: 16rpx; border-top: 3rpx solid #cbd5e1; border-right: 3rpx solid #cbd5e1; transform: rotate(45deg); }
.ui-icon, .ui-icon::before, .ui-icon::after { box-sizing: border-box; position: absolute; content: ""; }
.ui-icon { width: 34rpx; height: 34rpx; color: currentColor; }
.i-product .ui-icon { border: 4rpx solid currentColor; border-radius: 10rpx; }
.i-product .ui-icon::before { width: 18rpx; height: 4rpx; background: currentColor; left: 5rpx; top: 9rpx; border-radius: 999rpx; box-shadow: 0 11rpx 0 currentColor; }
.i-quote .ui-icon { width: 30rpx; height: 38rpx; border: 4rpx solid currentColor; border-radius: 9rpx; }
.i-quote .ui-icon::before { width: 14rpx; height: 4rpx; background: currentColor; left: 6rpx; top: 9rpx; border-radius: 999rpx; box-shadow: 0 10rpx 0 currentColor; }
.i-chat .ui-icon { width: 38rpx; height: 28rpx; border: 4rpx solid currentColor; border-radius: 14rpx; }
.i-chat .ui-icon::after { width: 12rpx; height: 12rpx; border-left: 4rpx solid currentColor; border-bottom: 4rpx solid currentColor; left: 7rpx; bottom: -9rpx; transform: rotate(-20deg); }
.i-phone .ui-icon { width: 28rpx; height: 40rpx; border: 4rpx solid currentColor; border-radius: 16rpx; transform: rotate(-22deg); }
.i-phone .ui-icon::before { width: 8rpx; height: 4rpx; background: currentColor; left: 6rpx; bottom: 4rpx; border-radius: 999rpx; }
.i-chart .ui-icon { width: 38rpx; height: 34rpx; border-left: 4rpx solid currentColor; border-bottom: 4rpx solid currentColor; bottom: 17rpx; }
.i-chart .ui-icon::before { width: 6rpx; height: 14rpx; background: currentColor; left: 8rpx; bottom: 4rpx; border-radius: 999rpx; box-shadow: 11rpx -7rpx 0 currentColor, 22rpx -15rpx 0 currentColor; }
.i-user .ui-icon { width: 24rpx; height: 24rpx; border: 4rpx solid currentColor; border-radius: 50%; top: 13rpx; }
.i-user .ui-icon::before { width: 40rpx; height: 20rpx; border: 4rpx solid currentColor; border-bottom: none; border-radius: 24rpx 24rpx 0 0; left: -8rpx; top: 28rpx; }
.i-setting .ui-icon { width: 34rpx; height: 34rpx; border: 4rpx solid currentColor; border-radius: 50%; }
.i-setting .ui-icon::before { width: 12rpx; height: 12rpx; border: 4rpx solid currentColor; border-radius: 50%; left: 7rpx; top: 7rpx; }
.i-setting .ui-icon::after { width: 44rpx; height: 4rpx; background: currentColor; left: -9rpx; top: 15rpx; border-radius: 999rpx; transform: rotate(45deg); }
.i-refresh .ui-icon { width: 34rpx; height: 34rpx; border: 4rpx solid currentColor; border-left-color: transparent; border-radius: 50%; }
.i-refresh .ui-icon::after { width: 12rpx; height: 12rpx; border-top: 4rpx solid currentColor; border-right: 4rpx solid currentColor; right: -1rpx; top: 0; transform: rotate(20deg); }
</style>
