<template>
	<view class="page chat-page">
		<view class="recipient-panel">
			<view v-if="canPickRecipient" class="recipient-select" @click="openRecipientPicker">
				<text class="recipient-label">接收人</text>
				<text :class="toId || toGroup ? 'recipient-name' : 'recipient-placeholder'">{{ recipientText }}</text>
			</view>
			<view v-else class="recipient-select">
				<text class="recipient-label">接收人</text>
				<text class="recipient-name">{{ recipientText }}</text>
			</view>
		</view>
		<view class="msg-list">
			<view class="empty-lite" v-if="!messages.length">{{ toId || toGroup ? '暂无消息，输入后发送' : '先选择接收人，再输入消息' }}</view>
			<view class="msg-bubble" v-for="m in messages" :key="m._id" :class="{ mine: m.fromId === session.id }">
				<text class="msg-name" v-if="m.fromName && m.fromId !== session.id">{{ m.fromName }}</text>
				<text class="msg-text">{{ m.content }}</text>
				<text class="msg-time">{{ fmt(m.createTime) }}</text>
			</view>
		</view>

		<view class="input-bar">
			<view class="more-btn" v-if="canGroupSend" @click="showActionMenu = true">···</view>
			<input class="chat-input" v-model="text" placeholder="输入消息" @confirm="send" />
			<button class="btn btn-sm" @click="send">发送</button>
		</view>

		<view class="modal-mask" v-if="showRecipientPicker" @click="showRecipientPicker = false">
			<view class="modal-body" @click.stop>
				<text class="t-title mb-m">选择接收人</text>
				<input class="input-box modal-search mb-s" v-model="recipientKw" placeholder="输入姓名 / 公司 / 手机筛选" />
				<view class="recipient-row" v-for="r in recipientRows" :key="r.id" @click="selectRecipient(r)">
					<view class="col flex1">
						<text class="recipient-row-title">{{ r.label }}</text>
						<text class="t-muted mt-s" v-if="r.sub">{{ r.sub }}</text>
					</view>
				</view>
				<view class="empty" v-if="!recipientRows.length">{{ recipientKw ? '没有匹配的接收人' : '暂无接收人' }}</view>
			</view>
		</view>

		<view class="modal-mask" v-if="showActionMenu" @click="showActionMenu = false">
			<view class="modal-body action-sheet" @click.stop>
				<text class="t-title mb-m">群发消息</text>
				<view class="action-row" @click="composeGroup('internal')">
					<text class="action-title">内部群发</text>
					<text class="t-muted">发送给内部员工和管理员</text>
				</view>
				<view class="action-row" @click="composeGroup('customers')">
					<text class="action-title">全部客户</text>
					<text class="t-muted">发送给所有已审核客户</text>
				</view>
				<view class="action-cancel" @click="showActionMenu = false">取消</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getSession } from '@/utils/auth.js'
import { threadMessages, postThread, postGroupMessage, markRead, manualThreadId } from '@/utils/message.js'
import { fmtDate } from '@/utils/format.js'
import { db } from '@/store/db.js'
import { T, ROLE, ROLE_LABEL } from '@/store/schema.js'

const GROUP_TARGETS = {
	admins: { group: 'admins', name: '管理员' },
	internal: { group: 'internal', name: '内部员工/管理员' },
	customers: { group: 'customers', name: '全部客户' }
}

function safeDecode(value) {
	const text = String(value || '')
	try {
		return decodeURIComponent(text)
	} catch (e) {
		return text
	}
}

export default {
	data() {
		return {
			threadId: '',
			toId: '',
			toRole: '',
			toName: '',
			toGroup: '',
			session: {},
			messages: [],
			text: '',
			recipients: [],
			compose: false,
			recipientKw: '',
			showRecipientPicker: false,
			showActionMenu: false
		}
	},
	computed: {
		canPickRecipient() {
			return this.compose || !this.threadId
		},
		canGroupSend() {
			return this.session.role === ROLE.ADMIN
		},
		recipientText() {
			if (this.toGroup) return `群发：${this.toName}`
			return this.toName ? `${this.roleLabel(this.toRole)}：${this.toName}` : '请选择接收人'
		},
		recipientRows() {
			const kw = this.recipientKw.trim().toLowerCase()
			let rows = this.recipients
			if (kw) {
				rows = rows.filter((item) => {
					const text = [
						item.label,
						item.name,
						item.phone,
						item.company,
						item.sub
					].filter(Boolean).join(' ').toLowerCase()
					return text.indexOf(kw) >= 0
				})
			}
			return rows.slice(0, kw ? 100 : 40)
		}
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.loadRecipients()
		if (q) {
			this.threadId = safeDecode(q.thread)
			this.toId = safeDecode(q.to)
			this.toRole = safeDecode(q.toRole)
			this.toName = safeDecode(q.toName)
			this.toGroup = safeDecode(q.toGroup)
			this.compose = q.compose === true || q.compose === '1' || q.compose === 'true'
			this.resolveRecipient()
			this.applyDefaultRecipient()
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
					phone: e.phone || '',
					sub: e.phone || '',
					label: `${ROLE_LABEL[role] || '员工'}：${e.name}${e.phone ? ' · ' + e.phone : ''}`
				}
			})
			if (this.session.role === ROLE.CUSTOMER) {
				this.recipients = employees
				return
			}
			// 员工 / 采购员 / 管理员 均可群发
			const groups = [
				{ id: '__group_admins__', group: 'admins', role: 'group', name: '管理员', label: '群发：管理员', sub: '发送给所有管理员' },
				{ id: '__group_internal__', group: 'internal', role: 'group', name: '内部员工/管理员', label: '群发：内部员工/管理员', sub: '内部员工和管理员' },
				{ id: '__group_customers__', group: 'customers', role: 'group', name: '全部客户', label: '群发：全部客户', sub: '所有已审核客户' }
			]
			const customers = db.list(T.CUSTOMER, { approved: true }, 'name').filter((c) => c._id !== this.session.id).map((c) => ({
				id: c._id,
				role: ROLE.CUSTOMER,
				name: c.name,
				phone: c.phone || '',
				company: c.company || '',
				sub: [c.company, c.phone].filter(Boolean).join(' · '),
				label: `客户：${c.name}${c.company ? ' · ' + c.company : ''}`
			}))
			this.recipients = groups.concat(employees, customers)
		},
		applyDefaultRecipient() {
			if (this.threadId || this.toId || this.toGroup || this.session.role !== ROLE.EMPLOYEE) return
			this.setGroupTarget('admins')
		},
		setGroupTarget(group) {
			const target = GROUP_TARGETS[group]
			if (!target) return
			this.threadId = ''
			this.toId = ''
			this.toRole = 'group'
			this.toName = target.name
			this.toGroup = target.group
			this.messages = []
		},
		openRecipientPicker() {
			this.recipientKw = ''
			this.showRecipientPicker = true
		},
		pickRecipient(e) {
			const item = this.recipients[e.detail.value]
			this.selectRecipient(item)
		},
		selectRecipient(item) {
			if (!item) return
			this.toId = item.group ? '' : item.id
			this.toRole = item.role
			this.toName = item.name
			this.toGroup = item.group || ''
			if (this.toGroup) {
				this.threadId = ''
				this.messages = []
			}
			this.showRecipientPicker = false
		},
		composeGroup(group) {
			this.showActionMenu = false
			this.compose = true
			this.setGroupTarget(group)
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
			const sentGroup = this.messages.find((m) => m.fromId === this.session.id && (m.groupType || m.toType === 'admins'))
			if (sentGroup) {
				this.setGroupTarget(sentGroup.groupType || 'admins')
				return
			}
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
			if (!this.toId && !this.toGroup) {
				uni.showToast({ title: '请选择接收人', icon: 'none' })
				return
			}
			if (this.toGroup) {
				const sent = postGroupMessage(this.session, {
					group: this.toGroup,
					name: this.toName
				}, content)
				if (!sent.length) {
					uni.showToast({ title: '暂无可群发对象', icon: 'none' })
					return
				}
				this.text = ''
				this.compose = false
				uni.showToast({ title: `已群发${sent.length}人`, icon: 'success' })
				setTimeout(() => uni.navigateBack(), 500)
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
.more-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: #f3f4f6; color: #111827; display: flex; align-items: center; justify-content: center; font-size: 34rpx; font-weight: 800; letter-spacing: 0; flex: none; }
.chat-input { flex: 1; height: 72rpx; min-height: 72rpx; line-height: normal; background: #f7f8fa; border-radius: 999rpx; padding: 0 24rpx; font-size: 28rpx; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.42); z-index: 999; display: flex; align-items: flex-end; }
.modal-body { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 40rpx; max-height: 72vh; overflow-y: auto; box-sizing: border-box; }
.modal-search { height: 84rpx; min-height: 84rpx; line-height: normal; padding: 0 24rpx; }
.recipient-row { display: flex; flex-direction: row; align-items: center; gap: 18rpx; padding: 24rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.recipient-row-title { color: #111827; font-size: 30rpx; font-weight: 700; }
.action-sheet { padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); }
.action-row { padding: 26rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.action-title { display: block; color: #111827; font-size: 32rpx; font-weight: 800; margin-bottom: 8rpx; }
.action-cancel { margin-top: 24rpx; height: 84rpx; border-radius: 16rpx; background: #f3f4f6; color: #111827; font-size: 30rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
</style>
