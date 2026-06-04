<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">客户投诉与建议</text>
			<text class="sub-hero-desc">听取客户第一声音，在这里集中回复并优化我们的服务品质</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ pendingCount }}</text><text class="metric-label">待回复</text></view>
				<view class="metric-pill"><text class="metric-num">{{ repliedCount }}</text><text class="metric-label">已解答</text></view>
				<view class="metric-pill"><text class="metric-num">{{ totalCount }}</text><text class="metric-label">收到建议</text></view>
			</view>
		</view>

		<view class="tabs" style="margin-bottom: 8rpx;">
			<view class="tab-item" :class="{ on: tab === 'pending' }" @click="tab = 'pending'; load()">待回复</view>
			<view class="tab-item" :class="{ on: tab === 'replied' }" @click="tab = 'replied'; load()">已回复</view>
		</view>

		<view class="sub-empty" v-if="!list.length">暂无相关客户反馈</view>

		<view class="list-card sug" v-for="s in list" :key="s._id">
			<view class="row-between">
				<view class="row gap-s">
					<view class="role-avatar">{{ s.customerName ? s.customerName[0] : '客' }}</view>
					<view class="col">
						<text class="t-title" style="font-size:28rpx; font-weight:700;">客户：{{ s.customerName }}</text>
						<text class="t-muted" style="font-size:22rpx; margin-top:4rpx;">反馈于：{{ fmt(s.createTime) }}</text>
					</view>
				</view>
			</view>
			<view class="content-box mt-m">
				<text class="t-sub text-content">{{ s.content }}</text>
			</view>
			<view class="divider" style="margin: 20rpx 0;"></view>
			<view v-if="s.reply" class="reply-box">
				<text class="reply-tag">平台回复</text>
				<text class="t-primary reply-text">{{ s.reply }}</text>
			</view>
			<view v-if="!s.reply" class="action-box">
				<input class="toolbar-search reply-input" v-model="s._replyInput" placeholder="输入平台关怀与解答内容..." style="flex:1; border-radius:16rpx;" />
				<button class="btn btn-sm btn-ghost reply-btn" @click="reply(s)">快捷回复</button>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { fmtDate, toast } from '@/utils/format.js'
import { sendToUser } from '@/utils/message.js'

export default {
	data() { return { list: [], all: [], tab: 'pending' } },
	computed: {
		totalCount() { return this.all.length },
		pendingCount() { return this.all.filter((s) => !s.reply).length },
		repliedCount() { return this.all.filter((s) => s.reply).length }
	},
	onShow() { this.load() },
	methods: {
		fmt(t) { return fmtDate(t, true) },
		load() {
			this.all = db.list(T.SUGGESTION, null, 'createTime', true)
			let list = this.all
			if (this.tab === 'pending') list = list.filter((s) => !s.reply)
			else list = list.filter((s) => s.reply)
			this.list = list.map((s) => ({ ...s, _replyInput: '' }))
		},
		reply(s) {
			const text = (s._replyInput || '').trim()
			if (!text) return toast('请输入回复内容')
			db.update(T.SUGGESTION, s._id, { reply: text })
			sendToUser(s.customerId, '建议回复', `您的建议已收到回复：${text}`, { type: 'suggestion' })
			toast('已回复', 'success')
			this.load()
		}
	}
}
</script>

<style lang="scss" scoped>
.tabs { display: flex; background: #fff; padding: 20rpx 24rpx; gap: 16rpx; border-bottom: 1rpx solid #edf1f6; }
.tab-item { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 26rpx; color: #6b7280; background: #f3f4f6; }
.tab-item.on { background: #2563eb; color: #fff; font-weight: 600; }
.sug { margin: 16rpx 24rpx; }
.role-avatar { width: 68rpx; height: 68rpx; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 800; margin-right: 16rpx; }
.content-box { background: #f8fafc; border-radius: 16rpx; padding: 20rpx; }
.text-content { font-size: 27rpx; color: #334155; line-height: 1.5; }
.reply-box { background: #eff6ff; border-radius: 16rpx; padding: 20rpx; border-left: 6rpx solid #2563eb; }
.reply-tag { display: inline-block; font-size: 20rpx; font-weight: 700; color: #2563eb; background: rgba(37,99,235,0.08); padding: 4rpx 10rpx; border-radius: 6rpx; margin-bottom: 8rpx; }
.reply-text { display: block; font-size: 26rpx; color: #1e3a8a; line-height: 1.5; }
.action-box { display: flex; flex-direction: row; align-items: center; gap: 16rpx; }
.reply-input { font-size: 26rpx; height: 72rpx; line-height: 72rpx; }
.reply-btn { margin-top: 0 !important; height: 72rpx; line-height: 72rpx; padding: 0 24rpx; background: #2563eb; color: #fff !important; border-radius: 16rpx; font-size: 25rpx; font-weight: 600; }
</style>
