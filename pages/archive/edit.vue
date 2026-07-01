<template>
	<view class="page">
		<global-stats />
		<view class="card">
			<text class="t-title mb-m">{{ title }}</text>

			<!-- 客户 -->
			<template v-if="type === 'customer'">
				<view class="field"><text class="field-label">姓名*</text><input class="field-input" v-model="form.name" placeholder="必填" /></view>
				<view class="field"><text class="field-label">手机号*</text><input class="field-input" type="number" maxlength="11" v-model="form.phone" placeholder="必填" /></view>
				<view class="field"><text class="field-label">密码</text><input class="field-input" password v-model="form.password" placeholder="留空则不修改" /></view>
				<view class="field"><text class="field-label">公司</text><input class="field-input" v-model="form.company" placeholder="选填" /></view>
				<view class="field">
					<text class="field-label">等级</text>
					<picker :range="grades" @change="form.grade = grades[$event.detail.value]">
						<view class="field-input"><text class="tag" :class="gradeTag">{{ form.grade }}级</text></view>
					</picker>
				</view>
				<view class="field">
					<text class="field-label">归属</text>
					<picker :range="pools" :range-key="'label'" @change="form.pool = pools[$event.detail.value].value">
						<view class="field-input">{{ poolLabel }}</view>
					</picker>
				</view>
				<view class="field" v-if="form.pool === 'private'">
					<text class="field-label">负责员工</text>
					<picker :range="employees" :range-key="'name'" @change="pickEmployee">
						<view class="field-input">{{ form.ownerName || '点击选择' }}</view>
					</picker>
				</view>
				<view class="field">
					<text class="field-label">审核</text>
					<switch :checked="form.approved" @change="form.approved = $event.detail.value" />
				</view>
			</template>

			<!-- 员工 -->
			<template v-if="type === 'employee'">
				<view class="field"><text class="field-label">姓名*</text><input class="field-input" v-model="form.name" placeholder="必填" /></view>
				<view class="field"><text class="field-label">手机号*</text><input class="field-input" type="number" maxlength="11" v-model="form.phone" placeholder="必填" /></view>
				<view class="field"><text class="field-label">密码</text><input class="field-input" password v-model="form.password" placeholder="留空则不修改" /></view>
				<view class="field">
					<text class="field-label">角色</text>
					<picker :range="roles" :range-key="'label'" @change="form.role = roles[$event.detail.value].value">
						<view class="field-input">{{ roleLabel }}</view>
					</picker>
				</view>
				<view class="field"><text class="field-label">职位</text><input class="field-input" v-model="form.position" placeholder="选填" /></view>
				<view class="field">
					<text class="field-label">采购员</text>
					<switch :checked="form.isPurchaser" @change="form.isPurchaser = $event.detail.value" />
				</view>
				<view class="field"><text class="field-label">备注/负责事项</text><input class="field-input" v-model="form.remark" placeholder="如负责区域、品类或联系说明" /></view>
				<view class="field">
					<text class="field-label">停用</text>
					<switch :checked="form.disabled" @change="form.disabled = $event.detail.value" />
				</view>
			</template>

			<!-- 供应商 -->
			<template v-if="type === 'supplier'">
				<view class="field"><text class="field-label">名称*</text><input class="field-input" v-model="form.name" placeholder="必填" /></view>
				<view class="field"><text class="field-label">联系人</text><input class="field-input" v-model="form.contact" placeholder="选填" /></view>
				<view class="field"><text class="field-label">手机号</text><input class="field-input" type="number" v-model="form.phone" placeholder="选填" /></view>
				<view class="field"><text class="field-label">地址</text><input class="field-input" v-model="form.address" placeholder="选填" /></view>
			</template>

			<!-- 同行 -->
			<template v-if="type === 'competitor'">
				<view class="field"><text class="field-label">名称*</text><input class="field-input" v-model="form.name" placeholder="必填" /></view>
				<view class="field"><text class="field-label">联系人</text><input class="field-input" v-model="form.contact" placeholder="选填" /></view>
				<view class="field"><text class="field-label">手机号</text><input class="field-input" type="number" v-model="form.phone" placeholder="选填" /></view>
			</template>
		</view>

		<view style="margin: 30rpx 24rpx;">
			<button class="btn btn-block" @click="save">保存</button>
			<button class="btn btn-danger btn-block mt-m" v-if="id" @click="remove">删除</button>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, ROLE, ROLE_LABEL, CUSTOMER_GRADE, POOL_LABEL as POOL_LABEL_MAP } from '@/store/schema.js'
import { deleteRemoteRecord } from '@/store/remote.js'
import { isRemoteSyncEnabled } from '@/store/sync.js'
import { toast, confirmDialog } from '@/utils/format.js'
import { getSession } from '@/utils/auth.js'

const TABLE_MAP = { customer: T.CUSTOMER, employee: T.EMPLOYEE, supplier: T.SUPPLIER, competitor: T.COMPETITOR }

function sameId(a, b) {
	const left = String(a || '')
	const right = String(b || '')
	return !!right && left === right
}

function idSet(rows) {
	return new Set((rows || []).map((row) => String(row && row._id || '')).filter(Boolean))
}

function setHas(set, value) {
	const id = String(value || '')
	return !!id && set.has(id)
}

function countLabel(label, rows) {
	const count = rows && rows.length ? rows.length : 0
	return count ? `${label}${count}条` : ''
}

export default {
	data() {
		return {
			type: 'customer',
			id: '',
			form: {},
			grades: CUSTOMER_GRADE,
			pools: [{ value: 'public', label: '公盘' }, { value: 'private', label: '私盘' }],
			roles: [{ value: ROLE.ADMIN, label: '管理员' }, { value: ROLE.EMPLOYEE, label: '员工' }],
			employees: []
		}
	},
	computed: {
		title() {
			const labels = { customer: '客户', employee: '员工', supplier: '供应商', competitor: '同行' }
			return (this.id ? '编辑' : '新增') + labels[this.type]
		},
		gradeTag() { return { A: 'tag-red', B: 'tag-orange', C: 'tag-blue' }[this.form.grade] || 'tag-gray' },
		poolLabel() { return POOL_LABEL_MAP[this.form.pool] || '' },
		roleLabel() { return ROLE_LABEL[this.form.role] || '' }
	},
	onLoad(q) {
		if (!q) return
		this.type = q.type || 'customer'
		const session = getSession()
		if (this.type === 'employee' && (!session || session.role !== ROLE.ADMIN)) {
			toast('无权维护员工档案')
			setTimeout(() => uni.navigateBack(), 300)
			return
		}
		this.employees = db.list(T.EMPLOYEE, { disabled: false })
		if (q.id) {
			this.id = q.id
			const table = TABLE_MAP[this.type]
			const rec = db.get(table, q.id)
			if (rec) this.form = { ...rec }
		} else {
			this.initForm()
			this.applyQuerySeed(q)
		}
	},
	methods: {
		decodeQuery(value) {
			let text = value || ''
			try {
				for (let i = 0; i < 3; i += 1) {
					const next = decodeURIComponent(text)
					if (next === text) break
					text = next
				}
				return text
			} catch (e) {
				return text
			}
		},
		applyQuerySeed(q) {
			const fields = ['name', 'contact', 'phone', 'address']
			fields.forEach((key) => {
				if (q[key]) this.form[key] = this.decodeQuery(q[key]).trim()
			})
		},
		initForm() {
			if (this.type === 'customer') {
				this.form = { name: '', phone: '', password: '', company: '', grade: 'C', pool: 'public', ownerId: '', ownerName: '', approved: false }
			} else if (this.type === 'employee') {
				this.form = { name: '', phone: '', password: '', role: ROLE.EMPLOYEE, position: '', isPurchaser: false, remark: '', disabled: false }
			} else if (this.type === 'supplier') {
				this.form = { name: '', contact: '', phone: '', address: '' }
			} else {
				this.form = { name: '', contact: '', phone: '' }
			}
		},
		pickEmployee(e) {
			const emp = this.employees[e.detail.value]
			if (emp) { this.form.ownerId = emp._id; this.form.ownerName = emp.name }
		},
		save() {
			if (!this.form.name) return toast('名称不能为空')
			const table = TABLE_MAP[this.type]
			const data = { ...this.form }
			if (this.id) {
				db.update(table, this.id, data)
			} else {
				db.insert(table, data)
			}
			toast('已保存', 'success')
			setTimeout(() => uni.navigateBack(), 300)
		},
		customerCascadePlan() {
			const customerId = this.id
			const quoteOrders = db.list(T.QUOTE_ORDER, { customerId })
			const quoteOrderIds = idSet(quoteOrders)
			const quoteItems = db.list(T.QUOTE_ITEM).filter((row) =>
				sameId(row.customerId, customerId) || setHas(quoteOrderIds, row.orderId)
			)
			const quoteItemIds = idSet(quoteItems)
			const requestOrders = db.list(T.REQUEST_ORDER, { customerId })
			const requestOrderIds = idSet(requestOrders)
			const requestItems = db.list(T.REQUEST_ITEM).filter((row) =>
				sameId(row.customerId, customerId) ||
				setHas(requestOrderIds, row.requestOrderId) ||
				setHas(requestOrderIds, row.requestId)
			)
			const requestItemIds = idSet(requestItems)
			const follows = db.list(T.FOLLOW).filter((row) =>
				sameId(row.customerId, customerId) ||
				setHas(quoteOrderIds, row.orderId) ||
				setHas(quoteOrderIds, row.relatedOrderId)
			)
			const suggestions = db.list(T.SUGGESTION, { customerId })
			const suggestionIds = idSet(suggestions)
			const competitorQuotes = db.list(T.COMP_QUOTE).filter((row) =>
				sameId(row.sourceCustomerId, customerId) || sameId(row.customerId, customerId)
			)
			const competitorQuoteIds = idSet(competitorQuotes)
			const relatedIds = new Set([
				...quoteOrderIds,
				...quoteItemIds,
				...requestOrderIds,
				...requestItemIds,
				...suggestionIds,
				...competitorQuoteIds
			])
			const messages = db.list(T.MESSAGE).filter((row) =>
				sameId(row.fromId, customerId) ||
				sameId(row.toId, customerId) ||
				setHas(relatedIds, row.refId)
			)
			return { quoteOrders, quoteItems, requestOrders, requestItems, follows, suggestions, competitorQuotes, messages }
		},
		competitorCascadePlan() {
			const competitorId = this.id
			const name = this.form.name || ''
			const competitorQuotes = db.list(T.COMP_QUOTE).filter((row) =>
				sameId(row.competitorId, competitorId) ||
				(!row.competitorId && name && row.competitorName === name)
			)
			return { competitorQuotes }
		},
		removeByRows(table, rows) {
			const ids = idSet(rows)
			if (!ids.size) return 0
			return db.removeWhere(table, { _id: (value) => setHas(ids, value) })
		},
		applyCustomerCascade(plan) {
			this.removeByRows(T.MESSAGE, plan.messages)
			this.removeByRows(T.FOLLOW, plan.follows)
			this.removeByRows(T.COMP_QUOTE, plan.competitorQuotes)
			this.removeByRows(T.QUOTE_ITEM, plan.quoteItems)
			this.removeByRows(T.QUOTE_ORDER, plan.quoteOrders)
			this.removeByRows(T.REQUEST_ITEM, plan.requestItems)
			this.removeByRows(T.REQUEST_ORDER, plan.requestOrders)
			this.removeByRows(T.SUGGESTION, plan.suggestions)
		},
		applyCompetitorCascade(plan) {
			this.removeByRows(T.COMP_QUOTE, plan.competitorQuotes)
		},
		deleteConfirmMessage(plan) {
			if (this.type === 'customer') {
				const labels = [
					countLabel('报价单', plan.quoteOrders),
					countLabel('报价明细', plan.quoteItems),
					countLabel('客户申请', plan.requestOrders),
					countLabel('申请明细', plan.requestItems),
					countLabel('跟进', plan.follows),
					countLabel('建议/投诉', plan.suggestions),
					countLabel('同行报价来源', plan.competitorQuotes),
					countLabel('站内消息', plan.messages)
				].filter(Boolean)
				const detail = labels.length ? `将同步删除：${labels.join('、')}。` : '未发现关联业务数据。'
				return `确定删除该客户？\n${detail}\n采购单、采购申请和采购明细会保留。`
			}
			if (this.type === 'competitor') {
				const detail = countLabel('同行报价', plan.competitorQuotes)
				return `确定删除该同行？\n${detail ? `将同步删除：${detail}。` : '未发现关联同行报价。'}`
			}
			return '确定删除？'
		},
		async remove() {
			const table = TABLE_MAP[this.type]
			const plan = this.type === 'customer'
				? this.customerCascadePlan()
				: (this.type === 'competitor' ? this.competitorCascadePlan() : null)
			if (await confirmDialog(this.deleteConfirmMessage(plan))) {
				if (isRemoteSyncEnabled()) {
					try {
						await deleteRemoteRecord(table, this.id)
					} catch (e) {
						toast(e && e.message ? e.message : '服务器删除失败，请稍后重试')
						return
					}
				}
				if (this.type === 'customer') this.applyCustomerCascade(plan)
				if (this.type === 'competitor') this.applyCompetitorCascade(plan)
				db.remove(table, this.id)
				toast('已删除', 'success')
				setTimeout(() => uni.navigateBack(), 300)
			}
		}
	}
}
</script>
