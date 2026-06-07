<template>
	<view class="page chat-page">
		<view class="recipient-panel">
			<picker v-if="canPickRecipient" :range="recipients" range-key="label" @change="pickRecipient">
				<view class="recipient-select">
					<text class="recipient-label">接收人</text>
					<text :class="toId ? 'recipient-name' : 'recipient-placeholder'">{{ recipientText }}</text>
				</view>
			</picker>
			<view v-else class="recipient-select">
				<text class="recipient-label">接收人</text>
				<text class="recipient-name">{{ recipientText }}</text>
			</view>
		</view>
		<view class="msg-list">
			<view class="empty-lite" v-if="!messages.length">{{ toId ? '暂无消息，输入后发送' : '先选择接收人，再输入消息' }}</view>
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
import { threadMessages, postThread, markRead, manualThreadId } from '@/utils/message.js'
import { fmtDate } from '@/utils/format.js'
import { db } from '@/store/db.js'
import { T, ROLE, ROLE_LABEL } from '@/store/schema.js'

export default {
	data() {
		return {
			threadId: '',
			toId: '',
			toRole: '',
			toName: '',
			session: {},
			messages: [],
			text: '',
			recipients: [],
			compose: false
		}
	},
	computed: {
		canPickRecipient() {
			return this.compose || !this.threadId
		},
		recipientText() {
			return this.toName ? `${this.roleLabel(this.toRole)}：${this.toName}` : '请选择接收人'
		}
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.loadRecipients()
		if (q) {
			this.threadId = q.thread || ''
			this.toId = q.to || ''
			this.toRole = q.toRole || ''
			this.toName = q.toName || ''
			this.compose = !!q.compose
			this.resolveRecipient()
			this.load()
		}
	},
	onShow() {
		if (this.session.id) this.loadRecipients()
		if (this.threadId) this.load()
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		roleLabel(role) { return ROLE_LABEL[role] || '用户' },
		loadRecipients() {
			if (!this.session.id) return
			const employees = db.list(T.EMPLOYEE, null, 'name').filter((e) => !e.disabled && e._id !== this.session.id).map((e) => {
				const role = e.role || ROLE.EMPLOYEE
				return {
					id: e._id,
					role,
					name: e.name,
					label: `${ROLE_LABEL[role] || '员工'}：${e.name}${e.phone ? ' · ' + e.phone : ''}`
				}
			})
			if (this.session.role === ROLE.CUSTOMER) {
				this.recipients = employees
				return
			}
			const customers = db.list(T.CUSTOMER, { approved: true }, 'name').filter((c) => c._id !== this.session.id).map((c) => ({
				id: c._id,
				role: ROLE.CUSTOMER,
				name: c.name,
				label: `客户：${c.name}${c.company ? ' · ' + c.company : ''}`
			}))
			this.recipients = employees.concat(customers)
		},
		pickRecipient(e) {
			const item = this.recipients[e.detail.value]
			if (!item) return
			this.toId = item.id
			this.toRole = item.role
			this.toName = item.name
		},
		resolveRecipient() {
			if (!this.toId) return
			if (!this.toName) {
				const emp = db.get(T.EMPLOYEE, this.toId)
				const customer = emp ? null : db.get(T.CUSTOMER, this.toId)
				const target = emp || customer
				if (target) {
					this.toName = target.name
					this.toRole = emp ? (target.role || ROLE.EMPLOYEE) : ROLE.CUSTOMER
				}
			}
		},
		inferRecipientFromThread() {
			if (!this.messages.length || this.toId) return
			const peerMsg = this.messages.find((m) => m.fromId && m.fromId !== this.session.id) ||
				this.messages.find((m) => m.toId && m.toId !== this.session.id)
			if (!peerMsg) return
			if (peerMsg.fromId && peerMsg.fromId !== this.session.id) {
				this.toId = peerMsg.fromId
				this.toRole = peerMsg.fromRole || ''
				this.toName = peerMsg.fromName || ''
			} else {
				this.toId = peerMsg.toId
				this.toRole = peerMsg.toRole || ''
				this.toName = peerMsg.toName || ''
			}
			this.resolveRecipient()
		},
		load() {
			if (!this.threadId) {
				this.messages = []
				return
			}
			this.messages = threadMessages(this.threadId)
			this.inferRecipientFromThread()
			this.messages.forEach((m) => {
				if (!m.read && m.toId === this.session.id) markRead(m._id)
			})
		},
		send() {
			const content = this.text.trim()
			if (!content) return
			if (!this.toId) {
				uni.showToast({ title: '请选择接收人', icon: 'none' })
				return
			}
			if (this.toId === this.session.id) {
				uni.showToast({ title: '不能发给自己', icon: 'none' })
				return
			}
			if (!this.threadId) this.threadId = manualThreadId(this.session.id, this.toId)
			postThread(this.threadId, this.session, {
				id: this.toId,
				role: this.toRole,
				name: this.toName
			}, content)
			this.compose = false
			this.text = ''
			this.load()
		}
	}
}
</script>

<style lang="scss" scoped>
.chat-page { display: flex; flex-direction: column; height: 100vh; }
.recipient-panel { background: #fff; padding: 16rpx 24rpx; border-bottom: 1rpx solid #edf1f6; }
.recipient-select { min-height: 72rpx; display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.recipient-label { color: #6b7280; font-size: 26rpx; }
.recipient-name { flex: 1; min-width: 0; text-align: right; color: #111827; font-size: 28rpx; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recipient-placeholder { flex: 1; text-align: right; color: #9ca3af; font-size: 28rpx; }
.msg-list { flex: 1; padding: 20rpx 24rpx; overflow-y: auto; }
.empty-lite { color: #9ca3af; text-align: center; padding-top: 160rpx; font-size: 28rpx; }
.msg-bubble { max-width: 70%; margin-bottom: 20rpx; }
.msg-bubble.mine { margin-left: auto; }
.msg-name { font-size: 22rpx; color: #9ca3af; display: block; margin-bottom: 4rpx; }
.msg-text { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx; display: inline-block; }
.msg-bubble.mine .msg-text { background: #2563eb; color: #fff; }
.msg-time { font-size: 20rpx; color: #9ca3af; display: block; margin-top: 4rpx; }
.input-bar { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #f0f1f4; }
.chat-input { flex: 1; height: 72rpx; min-height: 72rpx; line-height: normal; background: #f7f8fa; border-radius: 999rpx; padding: 0 24rpx; font-size: 28rpx; }
</style>
