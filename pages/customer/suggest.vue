<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<text class="t-title mb-m">投诉建议</text>
			<view class="field-col">
				<text class="field-label">内容</text>
				<textarea class="input-box mt-s multiline-input" v-model="content" placeholder="请输入您的建议或投诉"></textarea>
			</view>
			<button class="btn btn-block mt-m" @click="submit">提交</button>
		</view>

		<view class="card" v-if="list.length">
			<text class="t-title mb-m">我的反馈记录</text>
			<view class="sug-item" v-for="s in list" :key="s._id">
				<text class="t-sub">{{ s.content }}</text>
				<text class="t-muted mt-s">{{ fmt(s.createTime) }}</text>
				<view class="mt-s" v-if="s.reply">
					<text class="t-primary">回复：{{ s.reply }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtDate, toast } from '@/utils/format.js'
import { notifyEmployees } from '@/utils/message.js'

export default {
	data() { return { content: '', list: [], session: {} } },
	onShow() {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.list = db.list(T.SUGGESTION, { customerId: s.id }, 'createTime', true)
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		submit() {
			if (!this.content.trim()) return toast('请输入内容')
			db.insert(T.SUGGESTION, {
				customerId: this.session.id,
				customerName: this.session.name,
				content: this.content.trim(),
				reply: ''
			})
			notifyEmployees('客户建议/投诉', `客户 ${this.session.name} 提交了建议/投诉`, 'suggestion')
			this.content = ''
			toast('已提交', 'success')
			this.list = db.list(T.SUGGESTION, { customerId: this.session.id }, 'createTime', true)
		}
	}
}
</script>

<style lang="scss" scoped>
.multiline-input { height: 220rpx; min-height: 220rpx; line-height: 1.6; color: #111827; }
.sug-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.sug-item:last-child { border-bottom: none; }
</style>
