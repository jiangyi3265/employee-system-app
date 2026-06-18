/**
 * 数据表名 与 枚举常量 定义
 */

// 表名常量
export const T = {
	EMPLOYEE: 'employees',        // 员工档案
	CUSTOMER: 'customers',        // 客户档案
	SUPPLIER: 'suppliers',        // 供应商档案
	COMPETITOR: 'competitors',    // 同行档案
	PRODUCT: 'products',          // 产品基础信息
	QUOTE_ORDER: 'quoteOrders',   // 报价订单表
	QUOTE_ITEM: 'quoteItems',     // 产品报价表
	COMP_QUOTE: 'competitorQuotes', // 同行报价表
	FOLLOW: 'follows',            // 客户跟进表
	PURCHASE_ORDER: 'purchaseOrders', // 采购订单表
	PURCHASE_ITEM: 'purchaseItems',   // 产品采购表
	PURCHASE_REQUEST: 'purchaseRequests', // 采购申请单
	PURCHASE_REQUEST_ITEM: 'purchaseRequestItems', // 采购申请明细
	REQUEST_ORDER: 'requestOrders',   // 客户申请报价订单表
	REQUEST_ITEM: 'requestItems',     // 客户申请产品报价表
	SUGGESTION: 'suggestions',    // 客户建议/投诉
	MESSAGE: 'messages',          // 站内信
	SETTINGS: 'settings'          // 全局价格参数等配置
}

// 角色
export const ROLE = {
	ADMIN: 'admin',       // 管理员
	EMPLOYEE: 'employee', // 员工
	CUSTOMER: 'customer'  // 客户
}

export const ROLE_LABEL = {
	admin: '管理员',
	employee: '员工',
	customer: '客户'
}

// 成交状态（订单级：可部分成交）
export const DEAL_STATUS = {
	PENDING: 'pending',   // 未成交
	PARTIAL: 'partial',   // 部分成交
	DONE: 'done'          // 已成交
}

export const DEAL_STATUS_LABEL = {
	pending: '未成交',
	partial: '部分成交',
	done: '已成交'
}

// 产品报价行状态（行级：只分已/未成交）
export const ITEM_STATUS = {
	PENDING: 'pending',
	DONE: 'done'
}
export const ITEM_STATUS_LABEL = {
	pending: '未成交',
	done: '已成交'
}

// 沟通方式
export const CONTACT_WAY = ['电话', '微信', '上门', '到店']

// 客户等级
export const CUSTOMER_GRADE = ['A', 'B', 'C']

// 客户归属类型：公盘 / 私盘
export const POOL = {
	PUBLIC: 'public',  // 公盘（无员工所属）
	PRIVATE: 'private' // 私盘（属于某员工）
}
export const POOL_LABEL = { public: '公盘', private: '私盘' }

// 客户申请报价审核状态
export const REQUEST_STATUS = {
	SUBMITTED: 'submitted', // 已提交待审核
	APPROVED: 'approved',   // 已审核（已入报价表）
	REJECTED: 'rejected'    // 已驳回
}
export const REQUEST_STATUS_LABEL = {
	submitted: '待审核',
	approved: '已审核',
	rejected: '已驳回'
}

// 跟进预警阈值（天）
export const FOLLOW_WARN = {
	QUOTED_UNDEAL: 1, // 已报价未成交客户：每天跟进
	UNQUOTED: 3       // 未报价客户：3天跟进
}

// 默认全局价格参数
export const DEFAULT_SETTINGS = {
	taxRate: 0.06,        // m% 税费比例
	deliveryRate: 0.02,   // N% 配送费比例（占采购价）
	freightRate: 0.03,    // O% 分摊运费比例（占采购价）
	minRatio: 1.05,       // H 最低销售价 = 成本价 * H
	retailRatio: 1.35,    // I 零售价 = 成本价 * I
	suggestRatio: 1.2     // J 建议销售价 = 成本价 * J
}

// 单位换算默认模板：1箱 = 12包 = 144个
export const DEFAULT_UNITS = {
	small: '个',
	medium: '包',
	large: '箱',
	mediumToSmall: 12,  // 1包 = 12个
	largeToMedium: 12   // 1箱 = 12包 (=> 144个)
}
