/**
 * 初始化数据（正式环境）
 * 仅写入价格参数、单位换算等默认配置，不再创建任何演示账号或业务数据。
 * 员工、客户等账号统一在 PC 管理后台创建后，由 App 同步拉取。
 */
import { db } from './db.js'
import { T, DEFAULT_SETTINGS, DEFAULT_UNITS } from './schema.js'

// 版本号由 v1（演示数据）升级到 v2（正式环境）：首次进入会清掉历史演示数据残留。
const SEED_FLAG = 'sqms_seeded_v2'

export function ensureSeed(force = false) {
	if (!force && uni.getStorageSync(SEED_FLAG)) return

	// 清空历史演示数据（含 v1 残留），仅保留干净的初始配置
	Object.values(T).forEach((t) => db.setAll(t, [], true))

	// ===== 全局价格参数 / 单位换算默认值 =====
	db.insert(T.SETTINGS, { key: 'pricing', value: { ...DEFAULT_SETTINGS } })
	db.insert(T.SETTINGS, { key: 'units', value: { ...DEFAULT_UNITS } })

	uni.setStorageSync(SEED_FLAG, true)
}

/** 重置为干净的初始数据（仅保留价格/单位配置） */
export function resetData() {
	uni.removeStorageSync(SEED_FLAG)
	ensureSeed(true)
}
