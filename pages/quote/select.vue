<template>
	<view class="page">
		<global-stats />
		<view class="search-bar">
			<input class="search-input" v-model="kw" placeholder="搜索产品名称/规格" @input="load" />
		</view>
		<view class="empty" v-if="!list.length">暂无产品</view>
		<view class="card prod" v-for="p in list" :key="p._id">
			<view class="row-between">
				<view class="col flex1">
					<text class="t-title" style="font-size:28rpx;">{{ p.name }}</text>
					<text class="t-sub">{{ p.spec }} · {{ p.brand || '-' }}</text>
				</view>
				<text class="t-price">{{ money(p.suggestPrice) }}</text>
			</view>

			<!-- 展开详情 -->
			<view class="mt-s" v-if="expanded === p._id">
				<view class="divider"></view>
				<view class="row-between mt-s"><text class="t-sub">成本价</text><text class="t-sub">{{ money(p.costPrice) }}</text></view>
				<view class="row-between"><text class="t-sub">最低销售价</text><text class="t-sub">{{ money(p.minPrice) }}</text></view>
				<view class="row-between"><text class="t-sub">建议销售价</text><text class="t-sub">{{ money(p.suggestPrice) }}</text></view>
				<view class="row-between"><text class="t-sub">零售价</text><text class="t-sub">{{ money(p.retailPrice) }}</text></view>

				<!-- 最近成交价 -->
				<view class="mt-s" v-if="recentDeals.length">
					<text class="t-bold" style="font-size:26rpx;">最近成交价</text>
					<view class="row-between" v-for="d in recentDeals" :key="d._id">
						<text class="t-sub">{{ money(d.price) }}</text>
						<text class="t-muted">{{ fmt(d.updateTime) }}</text>
					</view>
				</view>

				<!-- 最近报价 -->
				<view class="mt-s" v-if="recentQuotes.length">
					<text class="t-bold" style="font-size:26rpx;">最近报价</text>
					<view class="row-between" v-for="q in recentQuotes" :key="q._id">
						<text class="t-sub">{{ money(q.price) }}</text>
						<text class="t-muted">{{ fmt(q.updateTime) }}</text>
					</view>
				</view>

				<!-- 同行报价 -->
				<view class="mt-s" v-if="compQuotes.length">
					<text class="t-bold" style="font-size:26rpx;">同行报价（最低3条）</text>
					<view class="row-between" v-for="q in compQuotes" :key="q._id">
						<text class="t-sub">{{ q.competitorName }}：{{ money(q.price) }}</text>
						<text class="t-muted">{{ fmt(q.createTime) }}</text>
					</view>
				</view>

				<!-- 客户预期价 -->
				<view class="field mt-s">
					<text class="field-label" style="width:auto;margin-right:12rpx;">客户预期价</text>
					<input class="field-input" type="digit" v-model.number="customerExpect" placeholder="选填" style="flex:1;" @blur="calcRecommend(p)" />
				</view>

				<!-- 系统推荐报价 -->
				<view class="rec-box mt-s" v-if="rec">
					<view class="row-between">
						<text class="t-bold t-primary">系统推荐报价</text>
						<text class="t-price t-lg">{{ money(rec.price) }}</text>
					</view>
					<text class="t-sub">依据：{{ rec.basis }}</text>
					<text class="t-sub">利润率：{{ rec.profitRate }}%</text>
					<text class="t-danger" v-if="rec.warning">{{ rec.warning }}</text>
				</view>

				<!-- 同行报价录入 -->
				<view class="mt-s">
					<text class="t-bold" style="font-size:26rpx;">录入同行报价</text>
					<view class="quote-entry mt-s">
						<picker :range="competitors" :range-key="'name'" @change="pickCompetitor">
							<view class="quote-entry-picker">
								<text :class="selCompName ? '' : 't-muted'">{{ selCompName || '选择同行' }}</text>
							</view>
						</picker>
						<input class="quote-entry-input" type="digit" v-model.number="compInputPrice" placeholder="报价" />
						<button class="btn btn-sm quote-entry-btn" @click="addCompQuote(p)">录入</button>
					</view>
				</view>

				<view style="margin-top:20rpx;">
					<button class="btn btn-block btn-sm" @click="pick(p)">选用此产品</button>
				</view>
			</view>

			<view class="mt-s" v-else>
				<text class="t-primary" style="font-size:26rpx;" @click="expand(p)">查看详情/智能报价</text>
			</view>
		</view>
	</view>
</template>

<script>
import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'
import { fmtMoney, fmtDate, toast } from '@/utils/format.js'
import { recentDealPrices, competitorQuotes, recommendQuote, isEffectiveQuoteItem } from '@/utils/pricing.js'

export default {
	data() {
		return {
			list: [], kw: '', orderId: '', focusedProductId: '',
			expanded: '',
			recentDeals: [], recentQuotes: [], compQuotes: [], rec: null, customerExpect: null,
			competitors: [], selCompId: '', selCompName: '', compInputPrice: ''
		}
	},
	onLoad(q) {
		this.orderId = (q && q.orderId) || ''
		this.focusedProductId = (q && q.productId) || ''
		this.competitors = db.list(T.COMPETITOR)
		this.load()
		if (this.focusedProductId) {
			const p = this.list.find((item) => item._id === this.focusedProductId) || db.get(T.PRODUCT, this.focusedProductId)
			if (p) this.expand(p)
		}
	},
	methods: {
		money(n) { return fmtMoney(n) },
		fmt(t) { return fmtDate(t) },
		load() {
			let list = db.list(T.PRODUCT, null, 'updateTime', true)
			const kw = this.kw.trim()
			if (kw) list = list.filter((p) => (p.name + p.spec + (p.brand || '')).indexOf(kw) >= 0)
			this.list = list
		},
		expand(p) {
			this.expanded = p._id
			this.customerExpect = null
			this.recentDeals = db.list(T.QUOTE_ITEM, { productId: p._id, status: 'done' }, 'updateTime', true).filter(isEffectiveQuoteItem).slice(0, 3)
			this.recentQuotes = db.list(T.QUOTE_ITEM, { productId: p._id }, 'updateTime', true)
				.filter((it) => it.status !== 'done')
				.filter(isEffectiveQuoteItem)
				.slice(0, 3)
			this.compQuotes = competitorQuotes(p._id)
			this.calcRecommend(p)
		},
		calcRecommend(p) {
			const deals = recentDealPrices(p._id, 1)
			const comp = competitorQuotes(p._id, 1)
			this.rec = recommendQuote({
				suggestPrice: p.suggestPrice,
				minPrice: p.minPrice,
				costPrice: p.costPrice,
				recentDeal: deals.length ? deals[0] : null,
				competitorMin: comp.length ? comp[0].price : null,
				customerExpect: this.customerExpect || null
			})
		},
		pickCompetitor(e) {
			const c = this.competitors[e.detail.value]
			if (c) { this.selCompId = c._id; this.selCompName = c.name }
		},
		addCompQuote(p) {
			if (!this.selCompId) return toast('请选择同行')
			if (!this.compInputPrice) return toast('请输入报价')
			db.insert(T.COMP_QUOTE, {
				productId: p._id,
				competitorId: this.selCompId,
				competitorName: this.selCompName,
				price: Number(this.compInputPrice)
			})
			toast('已录入', 'success')
			this.selCompId = ''; this.selCompName = ''; this.compInputPrice = ''
			this.compQuotes = competitorQuotes(p._id)
			this.calcRecommend(p)
		},
		pick(p) {
			const price = this.rec ? this.rec.price : p.suggestPrice
			const pages = getCurrentPages()
			const prev = pages[pages.length - 2]
			const vm = prev && (prev.$vm || prev)
			if (vm && vm.addProduct) {
				vm.addProduct(p, price)
				uni.navigateBack()
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.search-bar { padding: 20rpx 24rpx; background: #fff; }
.search-input { background: #f3f4f6; border-radius: 999rpx; padding: 18rpx 32rpx; font-size: 28rpx; }
.prod { margin: 16rpx 24rpx; }
.rec-box { background: #eff6ff; border-radius: 12rpx; padding: 16rpx 20rpx; }
.quote-entry { display: flex; flex-direction: row; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.quote-entry-picker, .quote-entry-input { height: 68rpx; line-height: 68rpx; background: #f8fafc; border: 1rpx solid #e2e8f0; border-radius: 14rpx; padding: 0 18rpx; font-size: 25rpx; box-sizing: border-box; }
.quote-entry-picker { min-width: 180rpx; max-width: 240rpx; }
.quote-entry-input { flex: 1; min-width: 150rpx; text-align: center; }
.quote-entry-btn { height: 68rpx; min-width: 92rpx; padding: 0 20rpx; font-size: 25rpx; }
</style>
