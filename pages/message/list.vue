<template>
	<view class="page">
		<global-stats />
		<view class="message-toolbar">
			<view class="tabs">
				<view class="tab-item" :class="{ on: tab === 'all' }" @click="tab = 'all'; applyFilter()">全部</view>
				<view class="tab-item" :class="{ on: tab === 'unread' }" @click="tab = 'unread'; applyFilter()">未读</view>
				<view class="tab-item" :class="{ on: tab === 'read' }" @click="tab = 'read'; applyFilter()">已读</view>
			</view>
			<button class="btn btn-sm compose-btn" @click="compose">写信</button>
		</view>
		<view class="empty" v-if="!list.length">暂无消息</view>
		<view class="card-tight card msg" v-for="m in list" :key="m._id" @click="open(m)">
			<view class="row-between">
				<view class="row gap-s">
					<view class="dot" v-if="!m.read"></view>
					<text class="t-title" style="font-size:30rpx;">{{ m.title || '站内信' }}</text>
				</view>
				<view class="row gap-s">
					<text class="tag" :class="m.read ? 'tag-gray' : 'tag-red'">{{ m.read ? '已读' : '未读' }}</text>
					<text class="tag" :class="typeTag(m.type)">{{ typeLabel(m.type) }}</text>
				</view>
			</view>
			<text class="t-sub mt-s">{{ m.content }}</text>
			<text class="t-muted mt-s">{{ fmt(m.createTime) }}</text>
		</view>
	</view>
</template>

<script>
import { getSession } from '@/utils/auth.js'
import { inboxFor, markRead } from '@/utils/message.js'
import { fmtDate } from '@/utils/format.js'
import { ROLE } from '@/store/schema.js'

export default {
	data() { return { session: {}, all: [], list: [], tab: 'all' } },
	onShow() {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.all = inboxFor(s)
		this.applyFilter()
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		typeLabel(t) { return ({ request: '报价申请', suggestion: '建议回复', quote: '报价反馈', chat: '站内信', notice: '通知' })[t] || '通知' },
		typeTag(t) { return ({ request: 'tag-blue', suggestion: 'tag-green', quote: 'tag-orange', chat: 'tag-gray' })[t] || 'tag-gray' },
		applyFilter() {
			if (this.tab === 'unread') this.list = this.all.filter((m) => !m.read)
			else if (this.tab === 'read') this.list = this.all.filter((m) => m.read)
			else this.list = this.all
		},
		compose() {
			uni.navigateTo({ url: '/pages/message/chat?compose=1' })
		},
		open(m) {
			if (!m.read) { markRead(m._id); m.read = true; this.applyFilter() }
			if (m.type === 'request' && this.session.role === ROLE.CUSTOMER) {
				uni.navigateTo({ url: '/pages/customer/orders' })
			} else if (m.type === 'request' && m.refId) {
				uni.navigateTo({ url: '/pages/admin/request-detail?id=' + m.refId })
			} else if (m.threadId) {
				const toId = m.fromId === this.session.id ? (m.toId || '') : (m.fromId || '')
				const toRole = m.fromId === this.session.id ? (m.toRole || '') : (m.fromRole || '')
				const toName = m.fromId === this.session.id ? (m.toName || '') : (m.fromName || '')
				uni.navigateTo({
					url: '/pages/message/chat?thread=' + encodeURIComponent(m.threadId) +
						'&to=' + encodeURIComponent(toId) +
						'&toRole=' + encodeURIComponent(toRole) +
						'&toName=' + encodeURIComponent(toName)
				})
			} else if (m.type === 'quote' && m.refId && this.session.role !== ROLE.CUSTOMER) {
				uni.navigateTo({ url: '/pages/quote/detail?id=' + m.refId })
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.msg { margin: 16rpx 24rpx; }
.dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #ef4444; }
.message-toolbar { display: flex; align-items: center; gap: 16rpx; background: #fff; padding: 20rpx 24rpx; border-bottom: 1rpx solid #edf1f6; }
.tabs { display: flex; flex: 1; gap: 16rpx; }
.tab-item { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 26rpx; color: #6b7280; background: #f3f4f6; }
.tab-item.on { background: #2563eb; color: #fff; font-weight: 600; }
.compose-btn { flex: none; margin: 0; }
</style>
