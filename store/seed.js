/**
 * 种子数据：首次启动时写入演示数据
 */
import { db } from './db.js'
import { T, ROLE, DEFAULT_SETTINGS, DEFAULT_UNITS } from './schema.js'
import { calcPrices } from '@/utils/pricing.js'

const SEED_FLAG = 'sqms_seeded_v1'

export function ensureSeed(force = false) {
	if (!force && uni.getStorageSync(SEED_FLAG)) return
	if (force) {
		Object.values(T).forEach((t) => db.setAll(t, []))
	}

	// ===== 全局价格参数 =====
	db.insert(T.SETTINGS, { key: 'pricing', value: { ...DEFAULT_SETTINGS } })
	db.insert(T.SETTINGS, { key: 'units', value: { ...DEFAULT_UNITS } })

	// ===== 员工 =====
	const admin = db.insert(T.EMPLOYEE, {
		name: '管理员', phone: '13800000000', password: '123456',
		role: ROLE.ADMIN, position: '总经理', remark: '负责报价审核与客户投诉处理', disabled: false
	})
	const zhang = db.insert(T.EMPLOYEE, {
		name: '张伟', phone: '13800000001', password: '123456',
		role: ROLE.EMPLOYEE, position: '销售经理', remark: '负责断路器、配电箱项目报价', disabled: false
	})
	const li = db.insert(T.EMPLOYEE, {
		name: '李娜', phone: '13800000002', password: '123456',
		role: ROLE.EMPLOYEE, position: '销售专员', remark: '负责电缆、接触器客户跟进', disabled: false
	})

	// ===== 供应商 =====
	const sup1 = db.insert(T.SUPPLIER, { name: '正泰电气', contact: '王经理', phone: '13900000001', address: '浙江温州' })
	const sup2 = db.insert(T.SUPPLIER, { name: '德力西电气', contact: '刘经理', phone: '13900000002', address: '浙江乐清' })
	const sup3 = db.insert(T.SUPPLIER, { name: '施耐德代理', contact: '陈经理', phone: '13900000003', address: '上海' })

	// ===== 同行（竞争对手）=====
	const comp1 = db.insert(T.COMPETITOR, { name: '恒发电料', contact: '赵老板', phone: '13700000001' })
	const comp2 = db.insert(T.COMPETITOR, { name: '鑫源机电', contact: '孙老板', phone: '13700000002' })
	const comp3 = db.insert(T.COMPETITOR, { name: '联通电气', contact: '周老板', phone: '13700000003' })

	// ===== 客户 =====
	const cust1 = db.insert(T.CUSTOMER, {
		name: '陈建国', phone: '13600000001', password: '123456', company: '建国建筑工程',
		grade: 'A', pool: 'private', ownerId: zhang._id, approved: true
	})
	const cust2 = db.insert(T.CUSTOMER, {
		name: '王芳', phone: '13600000002', password: '123456', company: '芳华装饰',
		grade: 'B', pool: 'private', ownerId: li._id, approved: true
	})
	const cust3 = db.insert(T.CUSTOMER, {
		name: '刘强', phone: '13600000003', password: '123456', company: '强盛机电',
		grade: 'C', pool: 'public', ownerId: '', approved: true
	})
	const cust4 = db.insert(T.CUSTOMER, {
		name: '赵敏', phone: '13600000004', password: '123456', company: '敏捷科技',
		grade: 'C', pool: 'public', ownerId: '', approved: false // 待审核
	})

	// ===== 产品（含辅助属性，自动算价）=====
	const s = DEFAULT_SETTINGS
	function product(name, spec, brand, attr, purchase) {
		const prices = calcPrices(purchase, s)
		return db.insert(T.PRODUCT, {
			name, spec, brand,
			category: attr[0] || '',
			attr1: attr[0] || '', attr2: attr[1] || '',
			unitSmall: '个', unitMedium: '包', unitLarge: '箱',
			mediumToSmall: 12, largeToMedium: 12,
			stock: 0,
			...prices
		})
	}
	const p1 = product('断路器 DZ47-60 C16 1P', 'C16 1P', '正泰', ['微型断路器', '1P'], 8.5)
	const p2 = product('断路器 DZ47-60 C32 3P', 'C32 3P', '正泰', ['微型断路器', '3P'], 22)
	const p3 = product('交流接触器 CJX2', '25A 220V', '德力西', ['接触器', '25A'], 35)
	const p4 = product('热继电器 JRS1', '0.63-1A', '德力西', ['继电器', '热继电器'], 18)
	const p5 = product('电缆 ZR-YJV', '3*4 阻燃', '远东', ['电线电缆', '铜芯'], 12.8)
	const p6 = product('配电箱 PZ30', '12回路 明装', '正泰', ['配电箱', '明装'], 45)

	// ===== 同行报价 =====
	const now = Date.now()
	const day = 24 * 3600 * 1000
	db.insert(T.COMP_QUOTE, { productId: p1._id, competitorId: comp1._id, competitorName: comp1.name, price: 11.5, createTime: now - 2 * day })
	db.insert(T.COMP_QUOTE, { productId: p1._id, competitorId: comp2._id, competitorName: comp2.name, price: 10.8, createTime: now - 1 * day })
	db.insert(T.COMP_QUOTE, { productId: p1._id, competitorId: comp3._id, competitorName: comp3.name, price: 12.2, createTime: now - 3 * day })
	db.insert(T.COMP_QUOTE, { productId: p3._id, competitorId: comp1._id, competitorName: comp1.name, price: 46, createTime: now - 1 * day })
	db.insert(T.COMP_QUOTE, { productId: p3._id, competitorId: comp2._id, competitorName: comp2.name, price: 44.5, createTime: now - 2 * day })

	// ===== 报价订单 + 产品报价 =====
	// 订单1：张伟给陈建国 已成交
	const o1 = db.insert(T.QUOTE_ORDER, {
		customerId: cust1._id, customerName: cust1.name, employeeId: zhang._id, employeeName: zhang.name,
		dealStatus: 'done', createTime: now - 5 * day
	})
	db.insert(T.QUOTE_ITEM, { orderId: o1._id, productId: p1._id, productName: p1.name, spec: p1.spec, unit: '个', qty: 100, price: 10.5, costPrice: p1.costPrice, status: 'done', employeeId: zhang._id, customerId: cust1._id, updateTime: now - 5 * day })
	db.insert(T.QUOTE_ITEM, { orderId: o1._id, productId: p3._id, productName: p3.name, spec: p3.spec, unit: '个', qty: 20, price: 45, costPrice: p3.costPrice, status: 'done', employeeId: zhang._id, customerId: cust1._id, updateTime: now - 5 * day })

	// 订单2：李娜给王芳 部分成交
	const o2 = db.insert(T.QUOTE_ORDER, {
		customerId: cust2._id, customerName: cust2.name, employeeId: li._id, employeeName: li.name,
		dealStatus: 'partial', createTime: now - 3 * day
	})
	db.insert(T.QUOTE_ITEM, { orderId: o2._id, productId: p2._id, productName: p2.name, spec: p2.spec, unit: '个', qty: 50, price: 30, costPrice: p2.costPrice, status: 'done', employeeId: li._id, customerId: cust2._id, updateTime: now - 3 * day })
	db.insert(T.QUOTE_ITEM, { orderId: o2._id, productId: p5._id, productName: p5.name, spec: p5.spec, unit: '个', qty: 200, price: 16, costPrice: p5.costPrice, status: 'pending', employeeId: li._id, customerId: cust2._id, updateTime: now - 3 * day })

	// 订单3：张伟给陈建国 未成交（近期）
	const o3 = db.insert(T.QUOTE_ORDER, {
		customerId: cust1._id, customerName: cust1.name, employeeId: zhang._id, employeeName: zhang.name,
		dealStatus: 'pending', createTime: now - 1 * day
	})
	db.insert(T.QUOTE_ITEM, { orderId: o3._id, productId: p6._id, productName: p6.name, spec: p6.spec, unit: '个', qty: 5, price: 78, costPrice: p6.costPrice, status: 'pending', employeeId: zhang._id, customerId: cust1._id, updateTime: now - 1 * day })

	// ===== 客户跟进记录 =====
	db.insert(T.FOLLOW, { customerId: cust1._id, customerName: cust1.name, employeeId: zhang._id, orderId: o1._id, way: '电话', content: '确认订单已发货', createTime: now - 5 * day })
	db.insert(T.FOLLOW, { customerId: cust2._id, customerName: cust2.name, employeeId: li._id, orderId: o2._id, way: '微信', content: '电缆部分待客户确认', createTime: now - 3 * day })

	// ===== 采购订单 + 采购明细 =====
	const po1 = db.insert(T.PURCHASE_ORDER, {
		employeeId: zhang._id, employeeName: zhang.name, supplierId: sup1._id, supplierName: sup1.name,
		freight: 200, createTime: now - 6 * day
	})
	db.insert(T.PURCHASE_ITEM, { purchaseOrderId: po1._id, productId: p1._id, productName: p1.name, spec: p1.spec, supplierId: sup1._id, supplierName: sup1.name, qty: 500, purchasePrice: 8.5, freightShare: 0.4, createTime: now - 6 * day })

	// ===== 客户建议/投诉 =====
	db.insert(T.SUGGESTION, { customerId: cust1._id, customerName: cust1.name, content: '希望增加更多品牌的断路器', reply: '', createTime: now - 2 * day })

	uni.setStorageSync(SEED_FLAG, true)
}

/** 重置所有数据（开发用） */
export function resetData() {
	uni.removeStorageSync(SEED_FLAG)
	ensureSeed(true)
}
