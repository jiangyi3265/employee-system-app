<template>
	<view class="page">
		<global-stats v-if="!supplierView" />
		<view class="card">
			<text class="t-title mb-m">{{ preFlow ? '预采购单信息' : '采购订单信息' }}</text>
			<view class="field" v-if="form.customerName">
				<text class="field-label">需求客户</text>
				<text class="field-input">{{ form.customerName }}</text>
			</view>
			<view class="field" v-if="form.sourceEmployeeNames">
				<text class="field-label">申请员工</text>
				<text class="field-input">{{ form.sourceEmployeeNames }}</text>
			</view>
			<view class="field">
				<text class="field-label">供应商</text>
				<view class="field-input row" @click="!supplierView && pickSupplier()">
					<text :class="form.supplierName ? '' : 't-muted'">{{ form.supplierName || (supplierView ? '-' : '点击选择供应商') }}</text>
				</view>
			</view>
			<view class="field">
				<text class="field-label">运费</text>
				<input class="field-input" type="digit" v-model="form.freight" placeholder="0" @blur="allocateFreight(true)" :disabled="supplierView" />
			</view>
			<text class="t-muted mt-s">{{ preFlow ? '预采购单可先核价，采购入库后再同步产品成本。' : '保存采购明细后，可按数量自动分摊单件运费并同步产品成本。' }}</text>
		</view>

		<!-- 采购明细 -->
		<view class="card" v-if="id">
			<view class="row-between mb-m">
				<text class="t-title">采购明细</text>
				<text class="t-primary" v-if="!supplierView" @click="addProductNav">+ 添加产品</text>
			</view>
			<button class="btn btn-ghost btn-block btn-sm mb-m" v-if="items.length && !supplierView" @click="allocateFreight(true)">按数量分摊运费</button>
			<view class="empty" v-if="!items.length">暂无采购明细</view>
			<view class="item-row" v-for="(it, i) in items" :key="it._id || i">
				<view class="row-between">
					<view class="col flex1">
						<text class="t-bold product-link" style="font-size:28rpx;" @click.stop="editProduct(it.productId)">{{ it.productName }}</text>
						<text class="t-sub">{{ it.spec }}</text>
					</view>
					<text class="t-danger" v-if="!supplierView" @click="removeItem(it, i)">删除</text>
				</view>
				<view class="row-between mt-s">
					<view class="row gap-s">
						<text class="t-sub">数量</text>
						<input class="mini-ipt" type="digit" v-model="it.qty" @blur="saveItem(it)" />
					</view>
					<view class="row gap-s">
						<text class="t-sub">采购价</text>
						<input class="mini-ipt" type="digit" v-model="it.purchasePrice" @blur="saveItem(it)" />
					</view>
				</view>
				<view class="row-between mt-s" v-if="!supplierView">
					<view class="row gap-s">
						<text class="t-sub">分摊运费</text>
						<input class="mini-ipt" type="digit" v-model="it.freightShare" @blur="saveItem(it)" />
					</view>
					<text class="t-sub">小计：{{ money(it.qty * it.purchasePrice) }}</text>
				</view>
				<view class="row-between mt-s" v-else>
					<text class="t-sub"> </text>
					<text class="t-sub">小计：{{ money(it.qty * it.purchasePrice) }}</text>
				</view>
			</view>
		</view>

		<view style="margin: 30rpx 24rpx;" v-if="!supplierView">
			<button class="btn btn-block" @click="saveOrder">{{ preFlow ? '保存预采购单' : '保存采购单' }}</button>
			<button class="btn btn-ghost btn-block mt-m" v-if="id && preFlow" @click="copyPrePurchaseList">复制采购清单</button>
			<button class="btn btn-ghost btn-block mt-m" v-if="id && preFlow" open-type="share">微信分享预采购单</button>
			<button class="btn btn-ghost btn-block mt-m" v-if="id && isPrePurchase" @click="approvePrePurchase">审核预采购</button>
			<button class="btn btn-ghost btn-block mt-m" v-if="id && isPurchasedPre" @click="stockInPurchase">采购入库生成采购单</button>
			<button class="btn btn-ghost btn-block mt-m" v-if="id && !preFlow" @click="syncAllPrices">同步更新所有产品价格</button>
			<button class="btn btn-danger btn-block mt-m" v-if="id" @click="removeOrder">{{ preFlow ? '删除预采购单' : '删除采购单' }}</button>
		</view>

		<!-- 供应商选择弹窗 -->
		<view class="modal-mask" v-if="showSupPicker" @click="showSupPicker = false">
			<view class="modal-body" @click.stop>
				<view class="row-between mb-m">
					<text class="t-title">选择供应商</text>
					<text class="inline-action" @click="goNewSupplier">新增供货商</text>
				</view>
				<input class="input-box modal-search mb-s" v-model="supKw" placeholder="输入供应商 / 联系人 / 手机筛选" @input="loadSuppliers" />
				<text class="t-muted mb-s">共 {{ supplierTotal }} 个供应商，当前显示 {{ suppliers.length }} 个</text>
				<view class="picker-item" v-for="s in suppliers" :key="s._id" @click="selectSupplier(s)">
					<text>{{ s.name }} · {{ s.contact }}</text>
				</view>
				<view class="empty" v-if="!suppliers.length">{{ supKw ? '没有匹配的供应商' : '暂无供应商' }}</view>
			</view>
		</view>

		<!-- 产品选择弹窗 -->
		<view class="modal-mask" v-if="showProdPicker" @click="showProdPicker = false">
			<view class="modal-body" @click.stop>
				<view class="row-between mb-m">
					<text class="t-title">选择产品</text>
					<text class="inline-action" @click="goNewProduct">新增产品</text>
				</view>
				<input class="input-box product-search mb-s" v-model="productKw" placeholder="输入产品名称 / 规格 / 品牌筛选" @input="loadProducts" />
				<text class="t-muted mb-s">共 {{ productTotal }} 个产品，当前显示 {{ products.length }} 个</text>
				<view class="picker-item" v-for="p in products" :key="p._id" @click="selectProduct(p)">
					<text>{{ p.name }} {{ p.spec }} · 采购价{{ money(p.purchasePrice) }}</text>
				</view>
				<view class="empty" v-if="!products.length">{{ productKw ? '没有匹配的产品' : '暂无产品' }}</view>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { fmtMoney, toast, confirmDialog } from '@/utils/format.js'
import { calcPrices, getSettings, round2 } from '@/utils/pricing.js'
import { PURCHASE_REQUEST_STATUS, refreshPurchaseRequestStatus } from '@/utils/purchase.js'
import { sendToUser } from '@/utils/message.js'

export default {
	data() {
		return {
			id: '',
			form: { supplierId: '', supplierName: '', employeeId: '', employeeName: '', freight: 0 },
			items: [],
			showSupPicker: false,
			showProdPicker: false,
			suppliers: [],
			supKw: '',
			supplierTotal: 0,
			products: [],
			productKw: '',
			productTotal: 0,
			session: {},
			routeQuery: {},
			supplierView: false
		}
	},
	computed: {
		isPrePurchase() {
			return this.form.status === 'pre'
		},
		isPurchasedPre() {
			return this.form.status === 'purchased'
		},
		preFlow() {
			return this.isPrePurchase || this.isPurchasedPre
		}
	},
	onLoad(q) {
		this.routeQuery = q || {}
		this.supplierView = this.isSupplierShareRoute(q)
		const s = getSession()
		if (!s && !this.supplierView) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s || {}
		const routeId = this.routeValue('id', q)
		if (routeId) {
			this.loadOrder(routeId)
		} else if (!this.supplierView) {
			this.form.employeeId = s.id
			this.form.employeeName = s.name
			uni.setNavigationBarTitle({ title: '新建采购单' })
		}
	},
	onReady() {
		if (this.isSupplierShareRoute()) this.supplierView = true
	},
	onShow() {
		this.syncRouteState()
		if (this.id) {
			this.items = db.list(T.PURCHASE_ITEM, { purchaseOrderId: this.id })
			this.refreshItemsFromProducts()
		}
	},
	mounted() {
		if (typeof window !== 'undefined') {
			this._routeSyncHandler = () => this.syncRouteState()
			window.addEventListener('hashchange', this._routeSyncHandler)
		}
	},
	beforeUnmount() {
		this.removeRouteSyncHandler()
	},
	beforeDestroy() {
		this.removeRouteSyncHandler()
	},
	methods: {
		removeRouteSyncHandler() {
			if (typeof window !== 'undefined' && this._routeSyncHandler) {
				window.removeEventListener('hashchange', this._routeSyncHandler)
				this._routeSyncHandler = null
			}
		},
		syncRouteState() {
			if (this.isSupplierShareRoute()) this.supplierView = true
			const routeId = this.routeValue('id')
			if (routeId && routeId !== this.id) this.loadOrder(routeId)
		},
		isSupplierShareRoute(q = this.routeQuery) {
			const fromQuery = !!(q && (q.view === 'supplier' || q.supplier === '1' || q.supplier === 'true'))
			const href = typeof window !== 'undefined' ? `${window.location.href} ${window.location.hash}` : ''
			return fromQuery || /[?&](view=supplier|supplier=(1|true))(&|$)/.test(href)
		},
		routeValue(name, q = this.routeQuery) {
			const href = typeof window !== 'undefined' ? `${window.location.href} ${window.location.hash}` : ''
			const match = href.match(new RegExp(`[?&]${name}=([^&#\\s]+)`))
			if (match) return decodeURIComponent(match[1])
			if (q && q[name] != null) return q[name]
			return ''
		},
		loadOrder(id) {
			this.id = id
			const o = db.get(T.PURCHASE_ORDER, id)
			if (o) this.form = { ...this.form, ...o }
			this.items = db.list(T.PURCHASE_ITEM, { purchaseOrderId: id })
			this.refreshItemsFromProducts()
			uni.setNavigationBarTitle({ title: this.supplierView ? '预采购单' : (o && (o.status === 'pre' || o.status === 'purchased') ? '编辑预采购单' : '编辑采购单') })
		},
		money(n) { return fmtMoney(n) },
		refreshItemsFromProducts() {
			this.items = this.items.map((it) => {
				const p = db.get(T.PRODUCT, it.productId)
				if (!p) return it
				const patch = {}
				if (it.productName !== p.name) patch.productName = p.name
				if (it.spec !== p.spec) patch.spec = p.spec
				if (Object.keys(patch).length && it._id) {
					db.update(T.PURCHASE_ITEM, it._id, patch)
					return { ...it, ...patch }
				}
				return it
			})
		},
		pickSupplier() {
			if (this.supplierView) return
			this.supKw = ''
			this.loadSuppliers()
			this.showSupPicker = true
		},
		loadSuppliers() {
			const kw = this.supKw.trim().toLowerCase()
			let list = db.list(T.SUPPLIER, null, 'name')
			this.supplierTotal = list.length
			if (kw) {
				list = list.filter((s) => {
					const text = [
						s.name,
						s.contact,
						s.phone,
						s.address
					].filter(Boolean).join(' ').toLowerCase()
					return text.indexOf(kw) >= 0
				})
			}
			this.suppliers = list.slice(0, kw ? 80 : 30)
		},
		selectSupplier(s) {
			this.form.supplierId = s._id
			this.form.supplierName = s.name
			this.items.forEach((it) => {
				it.supplierId = s._id
				it.supplierName = s.name
				if (it._id) db.update(T.PURCHASE_ITEM, it._id, { supplierId: s._id, supplierName: s.name })
			})
			this.showSupPicker = false
		},
		goNewSupplier() {
			this.showSupPicker = false
			uni.navigateTo({ url: '/pages/archive/edit?type=supplier' })
		},
		addProductNav() {
			if (this.supplierView) return toast('分享页不能新增商品')
			this.productKw = ''
			this.loadProducts()
			this.showProdPicker = true
		},
		loadProducts() {
			const kw = this.productKw.trim().toLowerCase()
			let list = db.list(T.PRODUCT, null, 'updateTime', true)
			this.productTotal = list.length
			if (kw) {
				list = list.filter((p) => {
					const text = [
						p.name,
						p.spec,
						p.brand,
						p.category,
						p.attr1,
						p.attr2
					].filter(Boolean).join(' ').toLowerCase()
					return text.indexOf(kw) >= 0
				})
				this.products = list.slice(0, 80)
			} else {
				this.products = list.slice(0, 30)
			}
		},
		goNewProduct() {
			this.showProdPicker = false
			uni.navigateTo({ url: '/pages/product/detail' })
		},
		editProduct(id) {
			if (this.supplierView) return
			if (!id) return
			uni.navigateTo({ url: '/pages/product/detail?id=' + id })
		},
		selectProduct(p) {
			const exists = this.items.find((it) => it.productId === p._id)
			if (exists) { toast('该产品已添加'); return }
			const item = db.insert(T.PURCHASE_ITEM, {
				purchaseOrderId: this.id,
				productId: p._id, productName: p.name, spec: p.spec,
				supplierId: this.form.supplierId, supplierName: this.form.supplierName,
				customerId: this.form.customerId || '',
				customerName: this.form.customerName || '',
				qty: 1, purchasePrice: p.purchasePrice || 0, freightShare: 0
			})
			this.items.push(item)
			this.showProdPicker = false
			this.allocateFreight(true)
		},
		saveItem(it) {
			if (it._id) db.update(T.PURCHASE_ITEM, it._id, {
				qty: Number(it.qty) || 0,
				purchasePrice: Number(it.purchasePrice) || 0,
				freightShare: Number(it.freightShare) || 0
			})
			this.allocateFreight(true, false)
			if (!this.preFlow) this.items.forEach((row) => this.syncProductPrice(row, true))
			toast(this.preFlow ? '预采购明细已保存' : '已保存并重新分摊运费')
		},
		allocateFreight(save = false, showTip = true) {
			if (!this.items.length) return
			const totalQty = this.items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0)
			const freight = Number(this.form.freight) || 0
			const unitFreight = totalQty > 0 ? round2(freight / totalQty) : 0
			this.items.forEach((it) => {
				it.freightShare = unitFreight
				if (save && it._id) db.update(T.PURCHASE_ITEM, it._id, { freightShare: unitFreight })
			})
			if (showTip) toast('已按数量分摊运费', 'success')
		},
		syncProductPrice(it, silent = false) {
			const p = db.get(T.PRODUCT, it.productId)
			if (!p) return
			const newPurchase = Number(it.purchasePrice) || 0
			const extraFreight = Number(it.freightShare) || 0
			const prices = calcPrices(newPurchase, getSettings(), extraFreight)
			db.update(T.PRODUCT, p._id, prices)
			if (!silent) uni.showToast({ title: '已同步更新产品价格', icon: 'none' })
		},
		syncAllPrices() {
			this.allocateFreight(true, false)
			this.items.forEach((it) => this.syncProductPrice(it, true))
			this.refreshItemsFromProducts()
			toast('已同步更新所有产品价格', 'success')
		},
		removeItem(it, i) {
			if (this.supplierView) return toast('分享页不能删除明细')
			if (it._id) db.remove(T.PURCHASE_ITEM, it._id)
			this.items.splice(i, 1)
		},
		saveOrder() {
			if (this.supplierView) return toast('分享页只能修改数量和采购价')
			if (!this.form.supplierId) return toast('请选择供应商')
			if (this.id) {
				db.update(T.PURCHASE_ORDER, this.id, {
					supplierId: this.form.supplierId,
					supplierName: this.form.supplierName,
					freight: Number(this.form.freight) || 0
				})
			} else {
				const o = db.insert(T.PURCHASE_ORDER, {
					status: 'approved',
					supplierId: this.form.supplierId,
					supplierName: this.form.supplierName,
					employeeId: this.form.employeeId,
					employeeName: this.form.employeeName,
					freight: Number(this.form.freight) || 0
				})
				this.id = o._id
			}
			this.allocateFreight(true, false)
			toast('已保存', 'success')
		},
		approvePrePurchase() {
			if (!this.id) return
			if (!this.form.supplierId) return toast('请选择供应商')
			this.saveOrder()
			db.update(T.PURCHASE_ORDER, this.id, {
				status: 'purchased',
				approvedTime: Date.now(),
				approvedBy: this.session.name
			})
			this.form.status = 'purchased'
			this.items.forEach((it) => {
				if (it.sourcePurchaseRequestItemId) {
					db.update(T.PURCHASE_REQUEST_ITEM, it.sourcePurchaseRequestItemId, {
						status: PURCHASE_REQUEST_STATUS.PURCHASED,
						prePurchaseOrderId: this.id
					})
				}
			})
			const requestIds = this.items.map((it) => it.sourcePurchaseRequestId).filter(Boolean)
			Array.from(new Set(requestIds)).forEach((id) => refreshPurchaseRequestStatus(id))
			// 通知申请员工：采购已完成
			const notified = new Set()
			Array.from(new Set(requestIds)).forEach((rid) => {
				const req = db.get(T.PURCHASE_REQUEST, rid)
				if (req && req.employeeId && !notified.has(req.employeeId)) {
					notified.add(req.employeeId)
					sendToUser(req.employeeId, '采购已完成', `您提交的采购申请（客户：${req.customerName || '-'}）已由 ${this.session.name} 完成采购`, {
						type: 'purchase',
						refId: rid,
						fromId: this.session.id,
						fromName: this.session.name,
						fromRole: this.session.role,
						toName: req.employeeName || '',
						toRole: 'employee',
						threadId: `purchase_request_${rid}`
					})
				}
			})
			toast('预采购已审核，员工端显示已采购', 'success')
		},
		stockInPurchase() {
			if (!this.id) return
			if (!this.form.supplierId) return toast('请选择供应商')
			this.saveOrder()
			db.update(T.PURCHASE_ORDER, this.id, {
				status: 'approved',
				stockInTime: Date.now(),
				stockInBy: this.session.name
			})
			this.form.status = 'approved'
			this.items = db.list(T.PURCHASE_ITEM, { purchaseOrderId: this.id })
			this.allocateFreight(true, false)
			this.items.forEach((it) => {
				this.syncProductPrice(it, true)
				if (it.sourcePurchaseRequestItemId) {
					db.update(T.PURCHASE_REQUEST_ITEM, it.sourcePurchaseRequestItemId, {
						status: PURCHASE_REQUEST_STATUS.CONVERTED,
						purchaseOrderId: this.id
					})
				}
			})
			const requestIds = this.items.map((it) => it.sourcePurchaseRequestId).filter(Boolean)
			Array.from(new Set(requestIds)).forEach((id) => refreshPurchaseRequestStatus(id))
			toast('采购已入库，并同步产品成本', 'success')
		},
		buildPrePurchaseText() {
			const lines = []
			lines.push(`预采购单：${this.form.supplierName || '-'}`)
			if (this.form.customerName) lines.push(`需求客户：${this.form.customerName}`)
			if (this.form.sourceEmployeeNames) lines.push(`申请员工：${this.form.sourceEmployeeNames}`)
			lines.push(`运费：${Number(this.form.freight) || 0}`)
			lines.push('商品\t规格\t数量\t采购价\t小计')
			this.items.forEach((it) => {
				const qty = Number(it.qty) || 0
				const price = Number(it.purchasePrice) || 0
				lines.push(`${it.productName}\t${it.spec || '-'}\t${qty}\t${price.toFixed(2)}\t${(qty * price).toFixed(2)}`)
			})
			return lines.join('\n')
		},
		copyPrePurchaseList() {
			uni.setClipboardData({ data: this.buildPrePurchaseText(), success: () => toast('预采购清单已复制', 'success') })
		},
		async removeOrder() {
			if (this.supplierView) return toast('分享页不能删除采购单')
			if (await confirmDialog('确定删除该采购单及所有明细？')) {
				const oldItems = db.list(T.PURCHASE_ITEM, { purchaseOrderId: this.id })
				if (this.preFlow) {
					oldItems.forEach((it) => {
						if (it.sourcePurchaseRequestItemId) {
							db.update(T.PURCHASE_REQUEST_ITEM, it.sourcePurchaseRequestItemId, {
								status: PURCHASE_REQUEST_STATUS.PENDING,
								prePurchaseOrderId: '',
								purchaseOrderId: ''
							})
						}
					})
					const requestIds = oldItems.map((it) => it.sourcePurchaseRequestId).filter(Boolean)
					Array.from(new Set(requestIds)).forEach((id) => refreshPurchaseRequestStatus(id))
				}
				db.removeWhere(T.PURCHASE_ITEM, { purchaseOrderId: this.id })
				db.remove(T.PURCHASE_ORDER, this.id)
				toast('已删除', 'success')
				setTimeout(() => uni.navigateBack(), 300)
			}
		}
	},
	onShareAppMessage() {
		return {
			title: `预采购单 ${this.form.supplierName || ''}`,
			path: this.id ? `/pages/purchase/detail?id=${this.id}&view=supplier` : '/pages/purchase/list'
		}
	}
}
</script>

<style lang="scss" scoped>
.item-row { padding: 20rpx 0; border-bottom: 1rpx solid #f0f1f4; }
.item-row:last-child { border-bottom: none; }
.product-link { color: #2563eb; }
.mini-ipt { width: 120rpx; background: #f7f8fa; border-radius: 8rpx; padding: 8rpx 12rpx; font-size: 26rpx; text-align: center; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: flex-end; }
.modal-body { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 40rpx; max-height: 70vh; overflow-y: auto; }
.product-search, .modal-search { height: 84rpx; min-height: 84rpx; line-height: normal; padding: 0 24rpx; }
.picker-item { padding: 24rpx 0; border-bottom: 1rpx solid #f0f1f4; font-size: 30rpx; }
</style>
