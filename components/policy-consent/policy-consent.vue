<template>
	<view class="policy-consent">
		<view class="policy-row" @click="toggle">
			<checkbox class="policy-checkbox" :checked="modelValue" color="#2563eb" />
			<view class="policy-copy">
				<text>我已阅读并同意</text>
				<text class="policy-link" @click.stop="openService">《用户服务协议》</text>
				<text>和</text>
				<text class="policy-link" @click.stop="openPrivacy">《隐私政策》</text>
			</view>
		</view>
		<text class="policy-hint">{{ hint }}</text>
	</view>
</template>

<script>
export default {
	name: 'policy-consent',
	props: {
		modelValue: { type: Boolean, default: false },
		hint: {
			type: String,
			default: '用于账号登录、注册审核、报价沟通与账号安全；未同意前不会提交手机号等个人信息。'
		}
	},
	emits: ['update:modelValue'],
	methods: {
		toggle() {
			this.$emit('update:modelValue', !this.modelValue)
		},
		openService() {
			uni.navigateTo({ url: '/pages/login/service' })
		},
		openPrivacy() {
			uni.navigateTo({ url: '/pages/login/privacy' })
		}
	}
}
</script>

<style lang="scss" scoped>
.policy-consent { margin: 2rpx 0 24rpx; padding: 18rpx 18rpx 16rpx; border: 1rpx solid #dbe8ff; border-radius: 18rpx; background: #f4f7ff; }
.policy-row { display: flex; align-items: flex-start; gap: 12rpx; }
.policy-checkbox { transform: scale(0.82); margin-top: -4rpx; }
.policy-copy { flex: 1; color: #475467; font-size: 24rpx; line-height: 1.65; }
.policy-link { color: #2563eb; font-weight: 700; }
.policy-hint { display: block; margin-top: 10rpx; padding-left: 60rpx; color: #7f8ea3; font-size: 22rpx; line-height: 1.55; }
</style>
