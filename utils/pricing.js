/**
 * 价格计算引擎
 * 1) 由采购价 + 全局参数 自动生成 成本价/最低销售价/零售价/建议销售价
 * 2) 智能报价推荐：综合 建议价/最低价/成本价/最近成交价/同行最低价 给出最优报价
 */

import { db } from '@/store/db.js'
import { T, DEFAULT_SETTINGS } from '@/store/schema.js'

/** 读取全局价格参数（带默认值兜底） */
export function getSettings() {
	const s = db.find(T.SETTINGS, { key: 'pricing' })
	return s && s.value ? { ...DEFAULT_SETTINGS, ...s.value } : { ...DEFAULT_SETTINGS }
}

/** 保存全局价格参数 */
export function saveSettings(value) {
	const exist = db.find(T.SETTINGS, { key: 'pricing' })
	if (exist) return db.update(T.SETTINGS, exist._id, { value })
	return db.insert(T.SETTINGS, { key: 'pricing', value })
}

export function round2(n) {
	if (n == null || isNaN(n)) return 0
	return Math.round(Number(n) * 100) / 100
}

/**
 * 由采购价计算各项价格
 * 成本价 = 采购价 + 采购价*税率 + 采购价*分摊运费率 + 采购价*配送费率
 *        = 采购价 * (1 + 税率 + 运费率 + 配送费率)
 * 最低销售价 = 成本价 * H
 * 零售价     = 成本价 * I
 * 建议销售价 = 成本价 * J
 * @param {number} purchasePrice 采购价
 * @param {object} settings 可选，覆盖全局参数
 * @param {number} extraFreight 额外分摊到单件的运费金额（采购模块按数量分摊）
 */
export function calcPrices(purchasePrice, settings, extraFreight = 0) {
	const s = settings || getSettings()
	const p = Number(purchasePrice) || 0
	const cost = p * (1 + s.taxRate + s.freightRate + s.deliveryRate) + (Number(extraFreight) || 0)
	const costPrice = round2(cost)
	return {
		purchasePrice: round2(p),
		costPrice,
		minPrice: round2(costPrice * s.minRatio),
		retailPrice: round2(costPrice * s.retailRatio),
		suggestPrice: round2(costPrice * s.suggestRatio)
	}
}

/** 利润率 = (报价 - 成本价) / 成本价 */
export function profitRate(price, cost) {
	if (!cost) return 0
	return round2(((price - cost) / cost) * 100)
}

export function quoteAuditPatch(price, product = {}) {
	const minPrice = Number(product.minPrice) || 0
	const quotePrice = Number(price) || 0
	const specialPrice = minPrice > 0 && quotePrice < minPrice
	return {
		minPriceSnapshot: minPrice,
		specialPrice,
		needsAdminReview: specialPrice,
		priceEffective: !specialPrice
	}
}

export function isEffectiveQuoteItem(item) {
	if (!item) return false
	return item.priceEffective !== false && !item.specialPrice && !item.needsAdminReview
}

export function isQuotableQuoteItem(item) {
	if (!item) return false
	return !item.needsAdminReview
}

/**
 * 最近成交价（近 N 条）
 * 从产品报价表中找该产品已成交记录，按时间倒序
 */
export function recentDealPrices(productId, n = 3) {
	const items = db.list(T.QUOTE_ITEM, { productId, status: 'done' }, 'updateTime', true).filter(isQuotableQuoteItem)
	return items.slice(0, n).map((it) => it.price)
}

export function recentQuotePrices(productId, n = 3) {
	const items = db.list(T.QUOTE_ITEM, { productId }, 'updateTime', true)
		.filter((it) => it.status !== 'done')
		.filter(isQuotableQuoteItem)
	return items.slice(0, n).map((it) => it.price)
}

/**
 * 同行报价（按价格从低到高，单个供应商/同行只取最低一条），取前3条
 */
export function competitorQuotes(productId, n = 3) {
	const all = db.list(T.COMP_QUOTE, { productId })
	// 单个同行只保留最低一条
	const byComp = {}
	all.forEach((q) => {
		const key = q.competitorId || q.supplierId || q._id
		if (!byComp[key] || q.price < byComp[key].price) byComp[key] = q
	})
	const list = Object.values(byComp).sort((a, b) => a.price - b.price)
	return list.slice(0, n)
}

/**
 * 智能报价推荐
 * 思路（来自需求）：默认建议销售价；先做公司内部判断（基于最近成交价），
 * 再与同行最低价比较；保障成交、设定红线(成本价)不亏本。
 * @returns {{ price, basis, warning, profit, profitRate, refs }}
 */
export function recommendQuote(opts) {
	const {
		suggestPrice = 0,
		minPrice = 0,
		costPrice = 0,
		recentDeal = null,      // 最近一次成交价（取近三条第一条）
		competitorMin = null,   // 同行最低报价
		supportMin = null,      // 客户提供、公司内部按同行处理的最低报价
		customerExpect = null   // 客户预期价（仅参考）
	} = opts || {}

	let price = suggestPrice
	let basis = '建议销售价'
	let warning = ''

	// ===== 第一步：公司内部判断（最近成交价）=====
	if (recentDeal != null && recentDeal > 0) {
		if (recentDeal < suggestPrice && recentDeal >= minPrice) {
			price = recentDeal
			basis = '最近成交价'
		} else if (recentDeal < minPrice && recentDeal >= costPrice) {
			price = minPrice
			basis = '最低销售价'
			warning = '最近成交价低于最低销售价，需管理员特批才可低价报价'
		} else if (recentDeal < costPrice) {
			price = suggestPrice
			basis = '建议销售价'
			warning = '最近成交价低于成本，报价成功率低，建议更换货源'
		}
		// recentDeal >= suggestPrice 时维持建议价
	}

	// ===== 第二步：与同行最低价比较 =====
	if (competitorMin != null && competitorMin > 0) {
		// 当前报价高于同行最低价时，才需要向同行价靠拢以保障成交
		if (price > competitorMin) {
			if (competitorMin >= minPrice) {
				price = competitorMin
				basis = '同行最低价'
			} else if (competitorMin < minPrice && competitorMin >= costPrice) {
				price = minPrice
				basis = '最低销售价'
				warning = '同行报价低于最低销售价，需管理员特批才可低价报价'
			} else if (competitorMin < costPrice) {
				price = suggestPrice
				basis = '建议销售价'
				warning = '同行报价低于成本，报价成功率低，建议更换货源'
			}
		}
	}

	// ===== 第三步：客户提供的其他商家报价（内部按同行处理）=====
	if (supportMin != null && supportMin > 0 && price > supportMin) {
		if (supportMin >= minPrice) {
			price = supportMin
			basis = '客户提供同行报价'
		} else if (supportMin < minPrice && supportMin >= costPrice) {
			price = minPrice
			basis = '最低销售价'
			warning = '客户提供同行报价低于最低销售价，需管理员特批才可低价报价'
		} else if (supportMin < costPrice) {
			price = suggestPrice
			basis = '建议销售价'
			warning = '客户提供同行报价低于成本，报价成功率低，建议更换货源'
		}
	}

	// ===== 第四步：客户预期价 =====
	if (customerExpect != null && customerExpect > 0 && price > customerExpect) {
		if (customerExpect >= minPrice) {
			price = customerExpect
			basis = '客户预期价'
		} else if (customerExpect < minPrice && customerExpect >= costPrice) {
			price = minPrice
			basis = '最低销售价'
			warning = '客户预期价低于最低销售价，需管理员特批才可低价报价'
		} else if (customerExpect < costPrice) {
			price = suggestPrice
			basis = '建议销售价'
			warning = '客户预期价低于成本，报价成功率低，建议更换货源'
		}
	}

	price = round2(price)
	const profit = round2(price - costPrice)
	return {
		price,
		basis,
		warning,
		profit,
		profitRate: profitRate(price, costPrice),
		refs: {
			suggestPrice,
			minPrice,
			costPrice,
			recentDeal,
			competitorMin,
			supportMin,
			customerExpect
		}
	}
}

/**
 * 给客户看的报价（只展示建议销售价/系统建议报价，不暴露成本与最低价）
 */
export function customerQuote(product) {
	if (!product) return { suggestPrice: 0, retailPrice: 0 }
	return {
		suggestPrice: product.suggestPrice,
		retailPrice: product.retailPrice
	}
}
