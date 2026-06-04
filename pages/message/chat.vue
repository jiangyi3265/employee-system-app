<template>
	<view class="page chat-page">
		<view class="msg-list">
			<view class="msg-bubble" v-for="m in messages" :key="m._id" :class="{ mine: m.fromId === session.id }">
				<text class="msg-name" v-if="m.fromName && m.fromId !== session.id">{{ m.fromName }}</text>
				<text class="msg-text">{{ m.content }}</text>
				<text class="msg-time">{{ fmt(m.createTime) }}</text>
			</view>
		</view>

		<view class="input-bar">
			<input class="chat-input" v-model="text" placeholder="输入消息" @confirm="send" />
			<button class="btn btn-sm" @click="send">发送</button>
		</view>
	</view>
</template>

<script>
import { getSession } from '@/utils/auth.js'
import { threadMessages, postThread, markRead } from '@/utils/message.js'
import { fmtDate } from '@/utils/format.js'

export default {
	data() { return { threadId: '', toId: '', session: {}, messages: [], text: '' } },
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		if (q) {
			this.threadId = q.thread || ''
			this.toId = q.to || ''
			this.load()
		}
	},
	onShow() { if (this.threadId) this.load() },
	methods: {
		fmt(t) { return fmtDate(t, true) },
		load() {
			this.messages = threadMessages(this.threadId)
			this.messages.forEach((m) => {
				if (!m.read && m.toId === this.session.id) markRead(m._id)
			})
		},
		send() {
			if (!this.text.trim()) return
			postThread(this.threadId, this.session, this.toId, this.text.trim())
			this.text = ''
			this.load()
		}
	}
}
</script>

<style lang="scss" scoped>
.chat-page { display: flex; flex-direction: column; height: 100vh; }
.msg-list { flex: 1; padding: 20rpx 24rpx; overflow-y: auto; }
.msg-bubble { max-width: 70%; margin-bottom: 20rpx; }
.msg-bubble.mine { margin-left: auto; }
.msg-name { font-size: 22rpx; color: #9ca3af; display: block; margin-bottom: 4rpx; }
.msg-text { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx; display: inline-block; }
.msg-bubble.mine .msg-text { background: #2563eb; color: #fff; }
.msg-time { font-size: 20rpx; color: #9ca3af; display: block; margin-top: 4rpx; }
.input-bar { display: flex; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #f0f1f4; }
.chat-input { flex: 1; background: #f7f8fa; border-radius: 999rpx; padding: 16rpx 24rpx; font-size: 28rpx; }
</style>
