<template>
	<view class="register-page">
		<view class="reg-hero">
			<view class="reg-mark">
				<view class="reg-user-head"></view>
				<view class="reg-user-body"></view>
			</view>
			<text class="reg-title">客户注册</text>
			<text class="reg-sub">提交资料后，管理员审核通过即可登录报价系统</text>
		</view>

		<view class="reg-panel">
			<view class="reg-field">
				<text class="reg-label">姓名</text>
				<input class="reg-input" v-model="form.name" placeholder="请输入姓名" />
			</view>
			<view class="reg-field">
				<text class="reg-label">公司名称</text>
				<input class="reg-input" v-model="form.company" placeholder="请输入公司名称（选填）" />
			</view>
			<view class="reg-field">
				<text class="reg-label">手机号</text>
				<input class="reg-input" type="number" maxlength="11" v-model="form.phone" placeholder="请输入手机号" />
			</view>
			<view class="reg-field">
				<text class="reg-label">密码</text>
				<input class="reg-input" password v-model="form.password" placeholder="请设置登录密码" />
			</view>
			<button class="btn btn-block reg-submit" @click="submit">提交注册</button>
			<view class="reg-note">
				<text>注册后需管理员审核，通过后可使用手机号和密码登录</text>
			</view>
		</view>
	</view>
</template>

<script>
import { registerCustomer } from '@/utils/auth.js'
import { toast } from '@/utils/format.js'

export default {
	data() {
		return { form: { name: '', company: '', phone: '', password: '' } }
	},
	methods: {
		submit() {
			const f = this.form
			if (!f.name || !f.phone || !f.password) return toast('请填写姓名、手机号、密码')
			if (f.phone.length !== 11) return toast('手机号格式不正确')
			const res = registerCustomer(f)
			if (!res.ok) return toast(res.msg)
			uni.showModal({
				title: '提交成功',
				content: '您的注册申请已提交，请等待管理员审核通过后登录。',
				showCancel: false,
				success: () => uni.navigateBack()
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.register-page { min-height: 100vh; background: linear-gradient(155deg, #1d4ed8 0%, #2563eb 38%, #eef4ff 38%, #f7f9fc 100%); padding-bottom: 48rpx; overflow: hidden; }
.reg-hero { padding: 92rpx 44rpx 44rpx; display: flex; flex-direction: column; align-items: center; position: relative; }
.reg-hero::before { content: ""; position: absolute; width: 320rpx; height: 320rpx; border-radius: 50%; background: rgba(255,255,255,0.08); top: -128rpx; left: -96rpx; }
.reg-hero::after { content: ""; position: absolute; width: 180rpx; height: 180rpx; border-radius: 50%; background: rgba(255,255,255,0.08); right: 12rpx; bottom: 12rpx; }
.reg-mark { width: 104rpx; height: 104rpx; border-radius: 28rpx; background: rgba(255,255,255,0.18); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 1rpx 0 rgba(255,255,255,0.22), 0 14rpx 34rpx rgba(15, 23, 42, 0.16); position: relative; z-index: 1; }
.reg-user-head { width: 30rpx; height: 30rpx; border-radius: 50%; border: 5rpx solid rgba(248,251,255,0.94); }
.reg-user-body { width: 56rpx; height: 30rpx; border: 5rpx solid rgba(248,251,255,0.94); border-bottom: none; border-radius: 32rpx 32rpx 0 0; margin-top: 8rpx; }
.reg-title { margin-top: 24rpx; color: #f8fbff; font-size: 42rpx; font-weight: 800; position: relative; z-index: 1; }
.reg-sub { margin-top: 12rpx; color: rgba(248,251,255,0.82); font-size: 25rpx; text-align: center; position: relative; z-index: 1; }
.reg-panel { margin: 10rpx 32rpx 40rpx; background: #fbfcff; border-radius: 34rpx; padding: 34rpx 30rpx 30rpx; box-shadow: 0 24rpx 56rpx rgba(30, 64, 175, 0.16); }
.reg-field { display: flex; flex-direction: column; margin-bottom: 24rpx; }
.reg-label { font-size: 25rpx; color: #667085; margin-bottom: 12rpx; font-weight: 500; }
.reg-input { height: 88rpx; line-height: 88rpx; background: #f3f6fb; border-radius: 18rpx; padding: 0 28rpx; font-size: 29rpx; color: #1f2937; border: 1rpx solid #e8edf5; }
.reg-input:focus { border-color: #9bbcff; background: #f8fbff; }
.reg-submit { margin-top: 12rpx; height: 88rpx; border-radius: 18rpx; box-shadow: 0 12rpx 26rpx rgba(37, 99, 235, 0.2); }
.reg-note { margin-top: 22rpx; padding: 18rpx 22rpx; background: #edf3ff; border: 1rpx solid #dbe8ff; border-radius: 18rpx; color: #667085; font-size: 24rpx; line-height: 1.6; text-align: center; }
</style>
