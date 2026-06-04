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
import { toast, confirmDialog } from '@/utils/format.js'
import { getSession } from '@/utils/auth.js'

const TABLE_MAP = { customer: T.CUSTOMER, employee: T.EMPLOYEE, supplier: T.SUPPLIER, competitor: T.COMPETITOR }

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
		}
	},
	methods: {
		initForm() {
			if (this.type === 'customer') {
				this.form = { name: '', phone: '', password: '', company: '', grade: 'C', pool: 'public', ownerId: '', ownerName: '', approved: false }
			} else if (this.type === 'employee') {
				this.form = { name: '', phone: '', password: '', role: ROLE.EMPLOYEE, position: '', remark: '', disabled: false }
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
		async remove() {
			if (await confirmDialog('确定删除？')) {
				const table = TABLE_MAP[this.type]
				db.remove(table, this.id)
				toast('已删除', 'success')
				setTimeout(() => uni.navigateBack(), 300)
			}
		}
	}
}
</script>
