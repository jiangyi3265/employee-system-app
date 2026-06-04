<template>
	<view class="login">
		<view class="hero">
			<view class="logo">
				<view class="logo-sheet">
					<view class="logo-line logo-line-lg"></view>
					<view class="logo-line"></view>
					<view class="logo-line logo-line-sm"></view>
					<view class="logo-seal"></view>
				</view>
			</view>
			<text class="brand">销售报价管理系统</text>
			<text class="slogan">智能报价 · 客户跟进 · 成本管控</text>
		</view>

		<view class="panel">
			<!-- 身份切换 -->
			<view class="switcher">
				<view class="switch-item" :class="{ on: tab === 'employee' }" @click="tab = 'employee'">内部员工</view>
				<view class="switch-item" :class="{ on: tab === 'customer' }" @click="tab = 'customer'">客户登录</view>
			</view>

			<view class="form">
				<view class="ipt">
					<text class="ipt-label">手机号</text>
					<input class="ipt-field" type="number" v-model="phone" placeholder="请输入手机号" maxlength="11" />
				</view>
				<view class="ipt">
					<text class="ipt-label">密码</text>
					<input class="ipt-field" password v-model="password" placeholder="请输入密码" />
				</view>

				<button class="btn btn-block mt-l" @click="doLogin">登录</button>
				<button class="btn btn-ghost btn-block mt-m" @click="doWechat">微信一键登录</button>

				<view class="row-between mt-m">
					<text class="t-muted" v-if="tab === 'customer'" @click="goRegister">客户注册</text>
					<text class="t-muted" v-else> </text>
					<text class="t-muted">{{ tab === 'customer' ? '注册需管理员审核' : '' }}</text>
				</view>

				<view class="contact" v-if="tab === 'customer'">
					<view class="row-between contact-head" @click="showContact = !showContact">
						<text class="t-bold">联系我们</text>
						<text class="t-muted">{{ showContact ? '收起' : '展开' }}</text>
					</view>
					<view class="contact-list" v-if="showContact">
						<view class="contact-item" v-for="e in contactList" :key="e._id">
							<view class="row-between">
								<text class="t-bold">{{ e.name }}</text>
								<text class="t-muted">{{ e.position || '员工' }}</text>
							</view>
							<text class="t-sub mt-s">电话：{{ e.phone }}</text>
							<text class="t-muted mt-s" v-if="e.remark">{{ e.remark }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 演示账号 -->
			<view class="demo">
				<text class="demo-title">演示账号（点击快速填入）</text>
				<view class="demo-list">
					<view class="demo-chip" v-for="d in demoList" :key="d.phone" @click="fill(d)">
						<text class="demo-name">{{ d.label }}</text>
						<text class="demo-phone">{{ d.phone }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { loginEmployee, loginCustomer, loginWechat } from '@/utils/auth.js'
import { ROLE } from '@/store/schema.js'
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { toast } from '@/utils/format.js'

export default {
	data() {
		return {
			tab: 'employee',
			phone: '',
			password: '',
			showContact: false
		}
	},
	computed: {
		contactList() {
			return db.list(T.EMPLOYEE).filter((e) => !e.disabled)
		},
		demoList() {
			if (this.tab === 'employee') {
				return [
					{ label: '管理员', phone: '13800000000', password: '123456' },
					{ label: '员工·张伟', phone: '13800000001', password: '123456' },
					{ label: '员工·李娜', phone: '13800000002', password: '123456' }
				]
			}
			return [
				{ label: '客户·陈建国', phone: '13600000001', password: '123456' },
				{ label: '客户·王芳', phone: '13600000002', password: '123456' }
			]
		}
	},
	methods: {
		fill(d) {
			this.phone = d.phone
			this.password = d.password
		},
		doLogin() {
			if (!this.phone || !this.password) return toast('请输入手机号和密码')
			const res = this.tab === 'employee'
				? loginEmployee(this.phone, this.password)
				: loginCustomer(this.phone, this.password)
			if (!res.ok) return toast(res.msg)
			toast('登录成功', 'success')
			setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 300)
		},
		doWechat() {
			const role = this.tab === 'employee' ? ROLE.EMPLOYEE : ROLE.CUSTOMER
			const res = loginWechat(role)
			if (!res.ok) return toast(res.msg)
			toast('登录成功', 'success')
			setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 300)
		},
		goRegister() {
			uni.navigateTo({ url: '/pages/login/register' })
		}
	}
}
</script>

<style lang="scss" scoped>
.login { min-height: 100vh; background: linear-gradient(155deg, #1d4ed8 0%, #2563eb 42%, #eef4ff 42%, #f7f9fc 100%); overflow: hidden; }
.hero { padding: 96rpx 56rpx 48rpx; display: flex; flex-direction: column; align-items: center; position: relative; }
.hero::before { content: ""; position: absolute; width: 360rpx; height: 360rpx; border-radius: 50%; background: rgba(255,255,255,0.08); top: -120rpx; left: -110rpx; }
.hero::after { content: ""; position: absolute; width: 220rpx; height: 220rpx; border-radius: 50%; background: rgba(255,255,255,0.08); right: -40rpx; bottom: 10rpx; }
.logo { width: 112rpx; height: 112rpx; border-radius: 30rpx; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1rpx 0 rgba(255,255,255,0.22), 0 14rpx 34rpx rgba(15, 23, 42, 0.16); position: relative; z-index: 1; }
.logo-sheet { width: 58rpx; height: 68rpx; border: 5rpx solid rgba(248,251,255,0.94); border-radius: 12rpx; position: relative; padding: 14rpx 10rpx; }
.logo-sheet::before { content: ""; position: absolute; top: -5rpx; right: -5rpx; width: 22rpx; height: 22rpx; border-left: 5rpx solid rgba(248,251,255,0.94); border-bottom: 5rpx solid rgba(248,251,255,0.94); border-radius: 0 10rpx 0 8rpx; background: rgba(255,255,255,0.12); }
.logo-line { width: 28rpx; height: 5rpx; border-radius: 999rpx; background: rgba(248,251,255,0.94); margin-bottom: 9rpx; }
.logo-line-lg { width: 36rpx; }
.logo-line-sm { width: 20rpx; }
.logo-seal { position: absolute; right: 8rpx; bottom: 8rpx; width: 18rpx; height: 18rpx; border-radius: 50%; background: #bfdbfe; box-shadow: 0 0 0 5rpx rgba(191,219,254,0.18); }
.brand { color: #f8fbff; font-size: 42rpx; font-weight: 800; margin-top: 24rpx; letter-spacing: 1rpx; position: relative; z-index: 1; }
.slogan { color: rgba(248,251,255,0.82); font-size: 25rpx; margin-top: 12rpx; position: relative; z-index: 1; }

.panel { margin: 8rpx 32rpx 40rpx; background: #fbfcff; border-radius: 34rpx; padding: 30rpx; box-shadow: 0 24rpx 56rpx rgba(30, 64, 175, 0.16); }
.switcher { display: flex; background: #edf1f7; border-radius: 20rpx; padding: 8rpx; }
.switch-item { flex: 1; text-align: center; height: 72rpx; line-height: 72rpx; font-size: 28rpx; color: #697586; border-radius: 16rpx; }
.switch-item.on { background: #fbfcff; color: #2563eb; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.08); }

.form { margin-top: 32rpx; }
.ipt { display: flex; flex-direction: column; margin-bottom: 22rpx; }
.ipt-label { font-size: 25rpx; color: #667085; margin-bottom: 12rpx; font-weight: 500; }
.ipt-field { height: 88rpx; line-height: 88rpx; background: #f3f6fb; border-radius: 18rpx; padding: 0 28rpx; font-size: 29rpx; color: #1f2937; border: 1rpx solid #e8edf5; }
.ipt-field:focus { border-color: #9bbcff; background: #f8fbff; }
.btn { border-radius: 18rpx; height: 88rpx; box-shadow: 0 12rpx 26rpx rgba(37, 99, 235, 0.2); }
.btn-ghost { box-shadow: none; background: #edf3ff; }

.demo { margin-top: 34rpx; border-top: 1rpx solid #e8edf5; padding-top: 26rpx; }
.demo-title { font-size: 24rpx; color: #98a2b3; }
.demo-list { display: flex; flex-wrap: wrap; gap: 14rpx; margin-top: 18rpx; }
.demo-chip { background: #edf3ff; border-radius: 16rpx; padding: 16rpx 20rpx; display: flex; flex-direction: column; border: 1rpx solid #dbe8ff; }
.demo-chip:active { background: #dfeaff; }
.demo-name { font-size: 26rpx; color: #2563eb; font-weight: 700; }
.demo-phone { font-size: 22rpx; color: #7f8ea3; margin-top: 4rpx; }
.contact { margin-top: 24rpx; border: 1rpx solid #e8edf5; border-radius: 18rpx; background: #fff; overflow: hidden; }
.contact-head { padding: 18rpx 20rpx; }
.contact-list { padding: 0 20rpx 16rpx; }
.contact-item { padding: 18rpx 0; border-top: 1rpx solid #edf1f6; }
</style>
