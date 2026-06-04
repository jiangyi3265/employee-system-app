<template>
	<view class="page">
		<view class="card">
			<text class="t-title mb-m">新增跟进记录</text>
			<text class="t-sub mb-m">客户：{{ customerName }}</text>

			<view class="field-col">
				<text class="field-label">沟通方式</text>
				<view class="row gap-s mt-s wrap">
					<view class="tag" :class="way === w ? 'tag-blue' : 'tag-gray'" v-for="w in ways" :key="w" @click="way = w">{{ w }}</view>
				</view>
			</view>
			<view class="field-col">
				<text class="field-label">跟进内容</text>
				<textarea class="input-box mt-s" v-model="content" placeholder="请输入跟进内容" style="height:200rpx;" />
			</view>
			<view class="field-col" v-if="orders.length">
				<text class="field-label">关联报价单</text>
				<picker :range="orderLabels" @change="pickOrder">
					<view class="input-box mt-s">
						<text :class="selectedOrder ? '' : 't-muted'">{{ selectedOrderLabel || '点击选择（选填）' }}</text>
					</view>
				</picker>
			</view>
		</view>

		<view style="margin: 30rpx 24rpx;">
			<button class="btn btn-block" @click="submit">提交</button>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T, CONTACT_WAY } from '@/store/schema.js'
import { getSession } from '@/utils/auth.js'
import { toast } from '@/utils/format.js'

export default {
	data() {
		return {
			customerId: '',
			customerName: '',
			way: '电话',
			content: '',
			ways: CONTACT_WAY,
			orders: [],
			selectedOrder: '',
			selectedOrderLabel: '',
			session: {}
		}
	},
	computed: {
		orderLabels() { return this.orders.map((o) => o.employeeName + ' - ' + new Date(o.createTime).toLocaleDateString()) }
	},
	onLoad(q) {
		const s = getSession()
		if (!s) { uni.redirectTo({ url: '/pages/login/login' }); return }
		this.session = s
		if (q && q.customerId) {
			this.customerId = q.customerId
			const c = db.get(T.CUSTOMER, q.customerId)
			if (c) this.customerName = c.name
			this.orders = db.list(T.QUOTE_ORDER, { customerId: q.customerId })
		}
	},
	methods: {
		pickOrder(e) {
			const i = e.detail.value
			this.selectedOrder = this.orders[i]._id
			this.selectedOrderLabel = this.orderLabels[i]
		},
		submit() {
			if (!this.content.trim()) return toast('请输入跟进内容')
			db.insert(T.FOLLOW, {
				customerId: this.customerId,
				customerName: this.customerName,
				employeeId: this.session.id,
				orderId: this.selectedOrder,
				way: this.way,
				content: this.content.trim()
			})
			toast('已提交', 'success')
			setTimeout(() => uni.navigateBack(), 300)
		}
	}
}
</script>
