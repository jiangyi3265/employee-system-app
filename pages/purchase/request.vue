<template>
	<view class="page">
		<global-stats />
		<view class="sub-hero">
			<text class="sub-hero-title">采购申请</text>
			<text class="sub-hero-desc">{{ managerMode ? '查看今日所有员工采购需求，按客户和供货商拆分预采购单' : '提交自己的采购需求，采购员和管理员会统一处理' }}</text>
			<view class="metric-row">
				<view class="metric-pill"><text class="metric-num">{{ requestRows.length }}</text><text class="metric-label">{{ managerMode ? '今日申请' : '我的申请' }}</text></view>
				<view class="metric-pill"><text class="metric-num">{{ pendingItemCount }}</text><text class="metric-label">待处理明细</text></view>
			</view>
		</view>

		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">{{ form._id ? '编辑采购申请' : '新建采购申请' }}</text>
				<text class="inline-action" @click="resetForm">清空</text>
			</view>
			<view class="field" v-if="managerMode">
				<text class="field-label">申请员工*</text>
				<view class="field-input picker-text" @click="openEmployeePicker">
					<text :class="form.employeeName ? '' : 't-muted'">{{ form.employeeName || '选择申请员工' }}</text>
				</view>
			</view>
			<view class="field">
				<text class="field-label">需求客户*</text>
				<view class="field-input picker-text" @click="openCustomerPicker">
					<text :class="form.customerName ? '' : 't-muted'">{{ form.customerName || '选择需求客户' }}</text>
				</view>
			</view>
			<view class="field">
				<text class="field-label">默认供货商</text>
				<view class="field-input picker-text" @click="openSupplierPicker('form')">
					<text :class="form.supplierName ? '' : 't-muted'">{{ form.supplierName || '可不选择' }}</text>
				</view>
			</view>
			<text class="t-muted mt-s">找不到商品时可先新增商品；采购价默认带入商品采购价，申请前可以修改。</text>
		</view>

		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">申请明细</text>
				<text class="inline-action" @click="openProductPicker">+ 添加商品</text>
			</view>
			<view class="empty-lite" v-if="!draftItems.length">暂无明细，请添加商品</view>
			<view class="request-item" v-for="(it, i) in draftItems" :key="it._id || it.productId || i">
				<view class="row-between">
					<view class="col flex1">
						<text class="t-bold product-link" @click="editProduct(it.productId)">{{ it.productName }}</text>
						<text class="t-muted mt-s">{{ it.spec || '-' }}</text>
					</view>
					<text class="t-danger text-action" @click="removeDraftItem(it, i)">删除</text>
				</view>
				<view class="request-grid mt-s">
					<view class="mini-field"><text class="mini-label">数量</text><input class="mini-ipt" type="digit" v-model="it.qty" /></view>
					<view class="mini-field"><text class="mini-label">采购价</text><input class="mini-ipt" type="digit" v-model="it.purchasePrice" /></view>
				</view>
				<view class="row-between mt-s">
					<text class="t-muted supplier-line">供货商：{{ it.supplierName || form.supplierName || '未指定' }}</text>
					<text class="inline-action" @click="openSupplierPicker('draftItem', it)">选择供货商</text>
				</view>
			</view>
			<button class="btn btn-block mt-m" @click="saveRequest">保存采购申请</button>
		</view>

		<view class="card">
			<view class="row-between mb-m">
				<text class="t-title">{{ managerMode ? '今日采购汇总' : '我的采购申请' }}</text>
				<button class="btn btn-sm" v-if="managerMode && pendingItemCount" @click="generatePrePurchase">生成预采购单</button>
			</view>
			<view class="empty-lite" v-if="!requestRows.length">暂无采购申请</view>
			<view class="summary-card" v-for="r in requestRows" :key="r._id">
				<view class="row-between">
					<view class="col flex1">
						<text class="t-bold">{{ r.customerName }}</text>
						<text class="t-muted mt-s">{{ r.employeeName || '-' }} · {{ fmt(r.createTime) }}</text>
					</view>
					<text class="tag" :class="statusTag(r.status)">{{ statusLabel(r.status) }}</text>
				</view>
				<view class="summary-item" v-for="it in requestItems(r._id)" :key="it._id">
					<view class="col flex1">
						<text class="t-sub t-bold">{{ it.productName }}</text>
						<text class="t-muted mt-s">{{ it.spec || '-' }} · 数量 {{ it.qty }} · 采购价 {{ money(it.purchasePrice) }}</text>
						<text class="t-muted mt-s">供货商：{{ it.supplierName || '未关联' }}</text>
					</view>
					<view class="col item-actions" v-if="managerMode && it.status !== 'converted'">
						<text class="inline-action" @click="openSupplierPicker('savedItem', it)">供货商</text>
						<input class="inline-price" type="digit" v-model="it.qty" @blur="saveRequestItemInline(it)" />
						<input class="inline-price" type="digit" v-model="it.purchasePrice" @blur="saveRequestItemInline(it)" />
						<text class="t-danger text-action" @click="removeSavedItem(it)">删除</text>
					</view>
				</view>
				<view class="row-between mt-s">
					<text class="t-muted">{{ requestItems(r._id).length }} 项明细</text>
					<view class="row gap-s" v-if="canEditRequest(r)">
						<text class="inline-action" @click="editRequest(r)">编辑申请</text>
						<text class="inline-action" v-if="managerMode" @click="addProductForRequest(r)">添加商品</text>
					</view>
				</view>
			</view>
		</view>

		<view class="modal-mask" v-if="showEmployeePicker" @click="showEmployeePicker = false">
			<view class="modal-body" @click.stop>
				<view class="row-between mb-m">
					<text class="t-title">选择申请员工</text>
					<text class="inline-action" @click="goNewEmployee">新增员工</text>
				</view>
				<input class="input-box modal-search mb-s" v-model="employeeKw" placeholder="搜索员工姓名 / 手机 / 职位" @input="loadEmployees" />
				<view class="picker-item" v-for="e in employees" :key="e._id" @click="selectEmployee(e)">
					<view class="col flex1">
						<text class="t-bold">{{ e.name }}</text>
						<text class="t-muted mt-s">{{ e.position || '-' }} · {{ e.phone || '-' }}</text>
					</view>
				</view>
				<view class="empty-lite" v-if="!employees.length">暂无匹配员工</view>
			</view>
		</view>

		<view class="modal-mask" v-if="showCustomerPicker" @click="showCustomerPicker = false">
			<view class="modal-body" @click.stop>
				<view class="row-between mb-m">
					<text class="t-title">选择需求客户</text>
					<text class="inline-action" @click="goNewCustomer">新增客户</text>
				</view>
				<input class="input-box modal-search mb-s" v-model="customerKw" placeholder="搜索客户名称 / 公司 / 手机" @input="loadCustomers" />
				<view class="picker-item" v-for="c in customers" :key="c._id" @click="selectCustomer(c)">
					<view class="col flex1">
						<text class="t-bold">{{ c.name }}</text>
						<text class="t-muted mt-s">{{ c.company || c.phone || '-' }}</text>
					</view>
				</view>
				<view class="empty-lite" v-if="!customers.length">暂无匹配客户</view>
			</view>
		</view>

		<view class="modal-mask" v-if="showSupplierPicker" @click="showSupplierPicker = false">
			<view class="modal-body" @click.stop>
				<view class="row-between mb-m">
					<text class="t-title">选择供货商</text>
					<view class="row gap-s">
						<text class="inline-action" @click="goNewSupplier">新增供货商</text>
						<text class="inline-action" @click="clearSupplier">不选择</text>
					</view>
				</view>
				<input class="input-box modal-search mb-s" v-model="supplierKw" placeholder="搜索供货商 / 联系人 / 手机" @input="loadSuppliers" />
				<view class="picker-item" v-for="s in suppliers" :key="s._id" @click="selectSupplier(s)">
					<view class="col flex1">
						<text class="t-bold">{{ s.name }}</text>
						<text class="t-muted mt-s">{{ s.contact || '-' }} · {{ s.phone || '-' }}</text>
					</view>
				</view>
				<view class="empty-lite" v-if="!suppliers.length">暂无匹配供货商</view>
			</view>
		</view>

		<view class="modal-mask" v-if="showProductPicker" @click="showProductPicker = false">
			<view class="modal-body" @click.stop>
				<view class="row-between mb-m">
					<text class="t-title">选择商品</text>
					<text class="inline-action" @click="goNewProduct">新增商品</text>
				</view>
				<input class="input-box modal-search mb-s" v-model="productKw" placeholder="搜索商品名称 / 规格 / 品牌" @input="loadProducts" />
				<view class="picker-item" v-for="p in products" :key="p._id" @click="selectProduct(p)">
					<view class="col flex1">
						<text class="t-bold">{{ p.name }}</text>
						<text class="t-muted mt-s">{{ p.spec || '-' }} · 采购价 {{ money(p.purchasePrice) }}</text>
					</view>
				</view>
				<view class="empty-lite" v-if="!products.length">暂无匹配商品</view>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, ROLE } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtDate, fmtMoney, toast, confirmDialog } from '@/utils/format.js'
import { isPurchaseManager, refreshPurchaseRequestStatus, requestStatusLabel, startOfToday, PURCHASE_REQUEST_STATUS } from '@/utils/purchase.js'

export default {
	data() {
		return {
			session: {},
			managerMode: false,
			form: { _id: '', employeeId: '', employeeName: '', customerId: '', customerName: '', supplierId: '', supplierName: '', status: PURCHASE_REQUEST_STATUS.PENDING },
			draftItems: [],
			requestRows: [],
			requestItemMap: {},
			employees: [],
			employeeKw: '',
			showEmployeePicker: false,
			customers: [],
			customerKw: '',
			showCustomerPicker: false,
			suppliers: [],
			supplierKw: '',
			showSupplierPicker: false,
			supplierPickMode: 'form',
			supplierTargetItem: null,
			products: [],
			productKw: '',
			showProductPicker: false
		}
	},
	computed: {
		pendingItemCount() {
			return Object.values(this.requestItemMap).reduce((count, rows) => {
				return count + rows.filter((it) => it.status !== PURCHASE_REQUEST_STATUS.CONVERTED).length
			}, 0)
		}
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		this.managerMode = isPurchaseManager(s)
		this.resetForm()
		if (q && q.quoteOrderId) this.loadFromQuote(q.quoteOrderId)
	},
	onShow() {
		if (this.session.id) {
			this.managerMode = isPurchaseManager(this.session)
			this.loadRequests()
		}
	},
	methods: {
		fmt(t) { return fmtDate(t, true) },
		money(n) { return fmtMoney(n) },
		statusLabel(status) { return requestStatusLabel(status) },
		statusTag(status) {
			return { pending: 'tag-orange', pre: 'tag-blue', purchased: 'tag-green', converted: 'tag-gray' }[status] || 'tag-gray'
		},
		resetForm() {
			this.form = {
				_id: '',
				employeeId: this.session.id,
				employeeName: this.session.name,
				customerId: '',
				customerName: '',
				supplierId: '',
				supplierName: '',
				status: PURCHASE_REQUEST_STATUS.PENDING
			}
			this.draftItems = []
		},
		openEmployeePicker() {
			this.employeeKw = ''
			this.loadEmployees()
			this.showEmployeePicker = true
		},
		loadEmployees() {
			const kw = this.employeeKw.trim().toLowerCase()
			let list = db.list(T.EMPLOYEE, { disabled: false }, 'name')
			if (kw) {
				list = list.filter((e) => [e.name, e.phone, e.position, e.remark].filter(Boolean).join(' ').toLowerCase().indexOf(kw) >= 0)
			}
			this.employees = list.slice(0, kw ? 80 : 30)
		},
		selectEmployee(e) {
			this.form.employeeId = e._id
			this.form.employeeName = e.name
			this.showEmployeePicker = false
		},
		goNewEmployee() {
			if (this.session.role !== ROLE.ADMIN) return toast('新增员工请管理员操作')
			this.showEmployeePicker = false
			uni.navigateTo({ url: '/pages/archive/edit?type=employee' })
		},
		openCustomerPicker() {
			this.customerKw = ''
			this.loadCustomers()
			this.showCustomerPicker = true
		},
		loadCustomers() {
			const kw = this.customerKw.trim().toLowerCase()
			let list = db.list(T.CUSTOMER, { approved: true }, 'name')
			if (kw) {
				list = list.filter((c) => [c.name, c.company, c.phone, c.contact].filter(Boolean).join(' ').toLowerCase().indexOf(kw) >= 0)
			}
			this.customers = list.slice(0, kw ? 80 : 30)
		},
		selectCustomer(c) {
			this.form.customerId = c._id
			this.form.customerName = c.name
			this.showCustomerPicker = false
		},
		goNewCustomer() {
			this.showCustomerPicker = false
			uni.navigateTo({ url: '/pages/archive/edit?type=customer' })
		},
		openSupplierPicker(mode = 'form', item = null) {
			this.supplierPickMode = mode
			this.supplierTargetItem = item
			this.supplierKw = ''
			this.loadSuppliers()
			this.showSupplierPicker = true
		},
		loadSuppliers() {
			const kw = this.supplierKw.trim().toLowerCase()
			let list = db.list(T.SUPPLIER, null, 'name')
			if (kw) {
				list = list.filter((s) => [s.name, s.contact, s.phone, s.address].filter(Boolean).join(' ').toLowerCase().indexOf(kw) >= 0)
			}
			this.suppliers = list.slice(0, kw ? 80 : 30)
		},
		applySupplierToTarget(supplier) {
			const patch = supplier ? { supplierId: supplier._id, supplierName: supplier.name } : { supplierId: '', supplierName: '' }
			if (this.supplierPickMode === 'form') {
				this.form = { ...this.form, ...patch }
				this.draftItems = this.draftItems.map((it) => it.supplierId ? it : { ...it, ...patch })
			} else if (this.supplierPickMode === 'draftItem' && this.supplierTargetItem) {
				Object.assign(this.supplierTargetItem, patch)
			} else if (this.supplierPickMode === 'savedItem' && this.supplierTargetItem) {
				Object.assign(this.supplierTargetItem, patch)
				db.update(T.PURCHASE_REQUEST_ITEM, this.supplierTargetItem._id, patch)
			}
		},
		selectSupplier(s) {
			this.applySupplierToTarget(s)
			this.showSupplierPicker = false
		},
		clearSupplier() {
			this.applySupplierToTarget(null)
			this.showSupplierPicker = false
		},
		goNewSupplier() {
			this.showSupplierPicker = false
			uni.navigateTo({ url: '/pages/archive/edit?type=supplier' })
		},
		openProductPicker() {
			if (!this.form.customerId) return toast('请先选择需求客户')
			this.productKw = ''
			this.loadProducts()
			this.showProductPicker = true
		},
		loadProducts() {
			const kw = this.productKw.trim().toLowerCase()
			let list = db.list(T.PRODUCT, null, 'updateTime', true)
			if (kw) {
				list = list.filter((p) => [p.name, p.spec, p.brand, p.category, p.attr1, p.attr2].filter(Boolean).join(' ').toLowerCase().indexOf(kw) >= 0)
			}
			this.products = list.slice(0, kw ? 80 : 30)
		},
		selectProduct(p) {
			if (this.draftItems.some((it) => it.productId === p._id)) return toast('该商品已添加')
			this.draftItems.push({
				productId: p._id,
				productName: p.name,
				spec: p.spec,
				qty: 1,
				purchasePrice: Number(p.purchasePrice) || 0,
				supplierId: this.form.supplierId,
				supplierName: this.form.supplierName,
				status: PURCHASE_REQUEST_STATUS.PENDING
			})
			this.showProductPicker = false
		},
		goNewProduct() {
			this.showProductPicker = false
			uni.navigateTo({ url: '/pages/product/detail' })
		},
		editProduct(id) {
			if (id) uni.navigateTo({ url: '/pages/product/detail?id=' + id })
		},
		removeDraftItem(it, index) {
			if (it._id) {
				db.remove(T.PURCHASE_REQUEST_ITEM, it._id)
				refreshPurchaseRequestStatus(this.form._id)
				this.loadRequests()
			}
			this.draftItems.splice(index, 1)
		},
		saveRequest() {
			if (this.managerMode && !this.form.employeeId) return toast('请选择申请员工')
			if (!this.form.customerId) return toast('请选择需求客户')
			if (!this.draftItems.length) return toast('请添加采购商品')
			let requestId = this.form._id
			const base = {
				customerId: this.form.customerId,
				customerName: this.form.customerName,
				supplierId: this.form.supplierId,
				supplierName: this.form.supplierName,
				status: this.form.status || PURCHASE_REQUEST_STATUS.PENDING,
				employeeId: this.managerMode ? this.form.employeeId : this.session.id,
				employeeName: this.managerMode ? this.form.employeeName : this.session.name
			}
			if (requestId) {
				db.update(T.PURCHASE_REQUEST, requestId, base)
			} else {
				const request = db.insert(T.PURCHASE_REQUEST, base)
				requestId = request._id
				this.form._id = requestId
			}
			this.draftItems.forEach((it) => {
				const data = {
					requestId,
					customerId: this.form.customerId,
					customerName: this.form.customerName,
					productId: it.productId,
					productName: it.productName,
					spec: it.spec,
					qty: Number(it.qty) || 1,
					purchasePrice: Number(it.purchasePrice) || 0,
					supplierId: it.supplierId || this.form.supplierId,
					supplierName: it.supplierName || this.form.supplierName,
					status: it.status || PURCHASE_REQUEST_STATUS.PENDING,
					sourceQuoteOrderId: it.sourceQuoteOrderId || '',
					sourceQuoteItemId: it.sourceQuoteItemId || ''
				}
				if (it._id) db.update(T.PURCHASE_REQUEST_ITEM, it._id, data)
				else {
					const saved = db.insert(T.PURCHASE_REQUEST_ITEM, data)
					it._id = saved._id
				}
			})
			refreshPurchaseRequestStatus(requestId)
			this.loadRequests()
			toast('采购申请已保存', 'success')
		},
		loadRequests() {
			let rows = db.list(T.PURCHASE_REQUEST, null, 'createTime', true)
			if (this.managerMode) {
				const today = startOfToday()
				rows = rows.filter((r) => (r.createTime || 0) >= today && r.status !== PURCHASE_REQUEST_STATUS.CONVERTED)
			} else {
				rows = rows.filter((r) => r.employeeId === this.session.id)
			}
			this.requestRows = rows
			const map = {}
			rows.forEach((r) => {
				map[r._id] = db.list(T.PURCHASE_REQUEST_ITEM, { requestId: r._id }).map((it) => ({ ...it }))
			})
			this.requestItemMap = map
		},
		requestItems(id) {
			return this.requestItemMap[id] || []
		},
		canEditRequest(r) {
			return r.status !== PURCHASE_REQUEST_STATUS.CONVERTED && (this.managerMode || r.employeeId === this.session.id)
		},
		editRequest(r) {
			this.form = {
				_id: r._id,
				employeeId: r.employeeId || this.session.id,
				employeeName: r.employeeName || this.session.name,
				customerId: r.customerId,
				customerName: r.customerName,
				supplierId: r.supplierId || '',
				supplierName: r.supplierName || '',
				status: r.status || PURCHASE_REQUEST_STATUS.PENDING
			}
			this.draftItems = this.requestItems(r._id).map((it) => ({ ...it }))
		},
		addProductForRequest(r) {
			this.editRequest(r)
			this.openProductPicker()
		},
		saveRequestItemInline(it) {
			if (!it || !it._id) return
			db.update(T.PURCHASE_REQUEST_ITEM, it._id, {
				qty: Number(it.qty) || 1,
				purchasePrice: Number(it.purchasePrice) || 0,
				supplierId: it.supplierId || '',
				supplierName: it.supplierName || ''
			})
			toast('明细已更新', 'success')
		},
		async removeSavedItem(it) {
			if (!it || !it._id) return
			if (!(await confirmDialog(`确定删除 ${it.productName}？`))) return
			db.remove(T.PURCHASE_REQUEST_ITEM, it._id)
			refreshPurchaseRequestStatus(it.requestId)
			this.loadRequests()
			if (this.form._id === it.requestId) {
				this.draftItems = this.draftItems.filter((row) => row._id !== it._id)
			}
			toast('采购申请明细已删除', 'success')
		},
		generatePrePurchase() {
			if (!this.managerMode) return toast('无权生成预采购单')
			const rows = []
			this.requestRows.forEach((r) => {
				this.requestItems(r._id)
					.filter((it) => it.status !== PURCHASE_REQUEST_STATUS.PRE && it.status !== PURCHASE_REQUEST_STATUS.PURCHASED && it.status !== PURCHASE_REQUEST_STATUS.CONVERTED)
					.forEach((it) => rows.push({ ...it, request: r }))
			})
			if (!rows.length) return toast('没有可生成的采购明细')
			const missing = rows.find((it) => !it.supplierId)
			if (missing) return toast(`${missing.productName} 未关联供货商`)
			const groups = {}
			rows.forEach((it) => {
				const key = `${it.customerId || 'no_customer'}_${it.supplierId}`
				if (!groups[key]) groups[key] = []
				groups[key].push(it)
			})
			const created = []
			Object.keys(groups).forEach((key) => {
				const group = groups[key]
				const first = group[0]
				const order = db.insert(T.PURCHASE_ORDER, {
					status: 'pre',
					supplierId: first.supplierId,
					supplierName: first.supplierName,
					customerId: first.customerId,
					customerName: first.customerName,
					employeeId: this.session.id,
					employeeName: this.session.name,
					freight: 0,
					source: 'purchaseRequest',
					sourcePurchaseRequestIds: [...new Set(group.map((it) => it.requestId))],
					sourceEmployeeNames: [...new Set(group.map((it) => it.request.employeeName).filter(Boolean))].join('、')
				})
				created.push(order)
				group.forEach((it) => {
					db.insert(T.PURCHASE_ITEM, {
						purchaseOrderId: order._id,
						productId: it.productId,
						productName: it.productName,
						spec: it.spec,
						supplierId: first.supplierId,
						supplierName: first.supplierName,
						customerId: it.customerId,
						customerName: it.customerName,
						qty: Number(it.qty) || 1,
						purchasePrice: Number(it.purchasePrice) || 0,
						freightShare: 0,
						sourcePurchaseRequestId: it.requestId,
						sourcePurchaseRequestItemId: it._id
					})
					db.update(T.PURCHASE_REQUEST_ITEM, it._id, {
						status: PURCHASE_REQUEST_STATUS.PRE,
						prePurchaseOrderId: order._id
					})
				})
			})
			this.requestRows.forEach((r) => refreshPurchaseRequestStatus(r._id))
			this.loadRequests()
			toast(`已生成 ${created.length} 张预采购单`, 'success')
			if (created[0]) setTimeout(() => uni.navigateTo({ url: '/pages/purchase/detail?id=' + created[0]._id }), 350)
		},
		loadFromQuote(orderId) {
			const order = db.get(T.QUOTE_ORDER, orderId)
			if (!order) return
			this.form.employeeId = order.employeeId || this.session.id
			this.form.employeeName = order.employeeName || this.session.name
			this.form.customerId = order.customerId
			this.form.customerName = order.customerName
			this.draftItems = db.list(T.QUOTE_ITEM, { orderId, status: 'done' }).filter((it) => {
				return !db.find(T.PURCHASE_REQUEST_ITEM, { sourceQuoteItemId: it._id })
			}).map((it) => {
				const product = db.get(T.PRODUCT, it.productId) || {}
				return {
					productId: it.productId,
					productName: it.productName,
					spec: it.spec,
					qty: Number(it.qty) || 1,
					purchasePrice: Number(product.purchasePrice) || Number(it.costPrice) || 0,
					supplierId: '',
					supplierName: '',
					status: PURCHASE_REQUEST_STATUS.PENDING,
					sourceQuoteOrderId: orderId,
					sourceQuoteItemId: it._id
				}
			})
			if (!this.draftItems.length) toast('该报价单暂无可转采购申请的成交明细')
		}
	}
}
</script>

<style lang="scss" scoped>
.picker-text { min-height: 58rpx; line-height: 1.4; white-space: normal; word-break: break-all; }
.request-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.request-item:last-child { border-bottom: none; }
.product-link { color: #2563eb; font-size: 28rpx; }
.request-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; }
.mini-field { display: flex; flex-direction: row; align-items: center; gap: 10rpx; min-width: 0; }
.mini-label { color: #6b7280; font-size: 25rpx; flex: none; }
.mini-ipt { flex: 1; min-width: 0; min-height: 62rpx; line-height: 62rpx; background: #f8fafc; border: 1rpx solid #dbe4f0; border-radius: 14rpx; padding: 0 14rpx; font-size: 26rpx; color: #111827; font-weight: 700; text-align: center; }
.supplier-line { flex: 1; min-width: 0; margin-right: 14rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-action { font-size: 26rpx; font-weight: 600; padding: 6rpx 12rpx; }
.empty-lite { padding: 24rpx 0; color: #98a2b3; font-size: 26rpx; text-align: center; }
.summary-card { padding: 20rpx 0; border-bottom: 1rpx solid #edf1f6; }
.summary-card:last-child { border-bottom: none; }
.summary-item { display: flex; flex-direction: row; gap: 14rpx; padding: 16rpx; margin-top: 14rpx; border: 1rpx solid #edf1f6; border-radius: 14rpx; background: #f8fafc; }
.item-actions { align-items: flex-end; gap: 10rpx; flex: none; }
.inline-price { width: 126rpx; min-height: 58rpx; line-height: 58rpx; background: #fff; border: 1rpx solid #dbe4f0; border-radius: 12rpx; padding: 0 12rpx; font-size: 25rpx; text-align: center; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.modal-body { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 40rpx; max-height: 72vh; overflow-y: auto; }
.modal-search { height: 84rpx; min-height: 84rpx; line-height: normal; padding: 0 24rpx; }
.picker-item { display: flex; flex-direction: row; align-items: center; gap: 18rpx; padding: 24rpx 0; border-bottom: 1rpx solid #f0f1f4; font-size: 30rpx; }
</style>
