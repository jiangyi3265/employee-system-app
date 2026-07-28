const PRICE_FIELDS = ['price', 'costPrice', 'purchasePrice', 'salePrice', 'customerExpect']

function positiveNumber(value, fallback = 1) {
	const number = Number(value)
	return Number.isFinite(number) && number > 0 ? number : fallback
}

function roundPrice(value) {
	const number = Number(value) || 0
	return Math.round(number * 1000000) / 1000000
}

export function productUnitOptions(product = {}) {
	const mediumToSmall = positiveNumber(product.mediumToSmall)
	const largeToMedium = positiveNumber(product.largeToMedium)
	const small = String(product.unitSmall || '个').trim() || '个'
	const rows = [
		{ label: small, value: small, factor: 1 },
		{ label: String(product.unitMedium || '').trim(), value: String(product.unitMedium || '').trim(), factor: mediumToSmall },
		{ label: String(product.unitLarge || '').trim(), value: String(product.unitLarge || '').trim(), factor: mediumToSmall * largeToMedium }
	].filter((row) => row.value)

	const seen = new Set()
	return rows.filter((row) => {
		if (seen.has(row.value)) return false
		seen.add(row.value)
		return true
	})
}

export function unitFactor(product = {}, unit, storedFactor) {
	const snapshot = Number(storedFactor)
	if (Number.isFinite(snapshot) && snapshot > 0) return snapshot
	const matched = productUnitOptions(product).find((row) => row.value === unit)
	return matched ? matched.factor : 1
}

export function defaultUnit(product = {}) {
	const first = productUnitOptions(product)[0]
	return first ? first.value : '个'
}

export function toBaseUnitPrice(price, product = {}, unit, storedFactor) {
	return roundPrice((Number(price) || 0) / unitFactor(product, unit, storedFactor))
}

export function fromBaseUnitPrice(price, product = {}, unit, storedFactor) {
	return roundPrice((Number(price) || 0) * unitFactor(product, unit, storedFactor))
}

export function convertUnitPrice(price, product = {}, fromUnit, toUnit, fromStoredFactor, toStoredFactor) {
	const basePrice = toBaseUnitPrice(price, product, fromUnit, fromStoredFactor)
	return fromBaseUnitPrice(basePrice, product, toUnit, toStoredFactor)
}

export function convertRecordUnit(record = {}, product = {}, nextUnit, fields = PRICE_FIELDS) {
	const next = nextUnit || defaultUnit(product)
	const nextFactor = unitFactor(product, next)
	const patch = { unit: next, unitFactor: nextFactor }
	fields.forEach((field) => {
		if (record[field] == null || record[field] === '') return
		patch[field] = convertUnitPrice(record[field], product, record.unit, next, record.unitFactor, nextFactor)
	})
	return patch
}

export function recordBasePrice(record = {}, product = {}, field = 'price') {
	return toBaseUnitPrice(record[field], product, record.unit, record.unitFactor)
}
