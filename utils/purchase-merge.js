function uniqueValues(values) {
	return [...new Set(values.filter(Boolean))]
}

function numeric(value) {
	const number = Number(value)
	return Number.isFinite(number) ? number : 0
}

function round6(value) {
	return Math.round(numeric(value) * 1000000) / 1000000
}

function weightedAverage(firstValue, firstQty, secondValue, secondQty) {
	const totalQty = firstQty + secondQty
	if (totalQty <= 0) return round6(firstValue || secondValue)
	return round6((numeric(firstValue) * firstQty + numeric(secondValue) * secondQty) / totalQty)
}

export function purchaseItemSourceItemIds(item = {}) {
	const ids = Array.isArray(item.sourcePurchaseRequestItemIds) ? item.sourcePurchaseRequestItemIds : []
	return uniqueValues(ids.concat(item.sourcePurchaseRequestItemId || []))
}

export function purchaseItemSourceRequestIds(item = {}) {
	const ids = Array.isArray(item.sourcePurchaseRequestIds) ? item.sourcePurchaseRequestIds : []
	return uniqueValues(ids.concat(item.sourcePurchaseRequestId || []))
}

function itemValues(item, listField, singleField) {
	const values = Array.isArray(item[listField]) ? item[listField] : []
	return uniqueValues(values.concat(item[singleField] || []))
}

function mergeKey(item) {
	const product = item.productId || `${item.productName || ''}|${item.spec || ''}`
	const supplier = item.supplierId || item.supplierName || ''
	const factor = numeric(item.unitFactor) > 0 ? numeric(item.unitFactor) : 1
	return `${supplier}|${product}|${item.unit || ''}|${factor}`
}

function normalizeSources(item) {
	const sourcePurchaseRequestItemIds = purchaseItemSourceItemIds(item)
	const sourcePurchaseRequestIds = purchaseItemSourceRequestIds(item)
	const customerIds = itemValues(item, 'customerIds', 'customerId')
	const customerNames = itemValues(item, 'customerNames', 'customerName')
	return {
		...item,
		sourcePurchaseRequestItemIds,
		sourcePurchaseRequestIds,
		sourcePurchaseRequestItemId: sourcePurchaseRequestItemIds[0] || '',
		sourcePurchaseRequestId: sourcePurchaseRequestIds[0] || '',
		customerIds,
		customerNames,
		customerId: customerIds[0] || '',
		customerName: customerNames.join('、')
	}
}

// 仅合并尚未入库的新草稿；已有 _id 的历史明细保留原样，避免查看页面时改写旧单。
export function mergePurchaseItemRows(rows = []) {
	const itemMap = new Map()
	const items = []
	rows.forEach((raw) => {
		const row = normalizeSources(raw)
		if (row._id) {
			items.push(row)
			return
		}
		const key = mergeKey(row)
		const current = itemMap.get(key)
		if (!current) {
			itemMap.set(key, row)
			items.push(row)
			return
		}

		const currentQty = Math.max(0, numeric(current.qty))
		const rowQty = Math.max(0, numeric(row.qty))
		current.purchasePrice = weightedAverage(current.purchasePrice, currentQty, row.purchasePrice, rowQty)
		current.salePrice = weightedAverage(current.salePrice, currentQty, row.salePrice, rowQty)
		current.freightShare = weightedAverage(current.freightShare, currentQty, row.freightShare, rowQty)
		current.qty = round6(currentQty + rowQty)
		current.sourcePurchaseRequestItemIds = uniqueValues(current.sourcePurchaseRequestItemIds.concat(row.sourcePurchaseRequestItemIds))
		current.sourcePurchaseRequestIds = uniqueValues(current.sourcePurchaseRequestIds.concat(row.sourcePurchaseRequestIds))
		current.sourcePurchaseRequestItemId = current.sourcePurchaseRequestItemIds[0] || ''
		current.sourcePurchaseRequestId = current.sourcePurchaseRequestIds[0] || ''
		current.customerIds = uniqueValues(current.customerIds.concat(row.customerIds))
		current.customerNames = uniqueValues(current.customerNames.concat(row.customerNames))
		current.customerId = current.customerIds[0] || ''
		current.customerName = current.customerNames.join('、')
	})
	return { items }
}
