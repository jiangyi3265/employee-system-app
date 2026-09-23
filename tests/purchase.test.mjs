import assert from 'node:assert/strict'
import test from 'node:test'
import { mergePurchaseItemRows, purchaseItemSourceItemIds, purchaseItemSourceRequestIds } from '../utils/purchase-merge.js'
import { toBaseUnitQuantity, unitFactor } from '../utils/units.js'

test('new purchase rows merge without losing cost or source requests', () => {
	const rows = [
		{ productId: 'p', supplierId: 's', unit: '箱', unitFactor: 12, qty: 2, purchasePrice: 10, salePrice: 15, sourcePurchaseRequestId: 'r1', sourcePurchaseRequestItemId: 'i1', customerId: 'c1', customerName: '甲' },
		{ productId: 'p', supplierId: 's', unit: '箱', unitFactor: 12, qty: 3, purchasePrice: 20, salePrice: 30, sourcePurchaseRequestId: 'r2', sourcePurchaseRequestItemId: 'i2', customerId: 'c2', customerName: '乙' }
	]
	const { items } = mergePurchaseItemRows(rows)
	assert.equal(items.length, 1)
	assert.equal(items[0].qty, 5)
	assert.equal(items[0].purchasePrice * items[0].qty, 80)
	assert.equal(items[0].salePrice * items[0].qty, 120)
	assert.deepEqual(purchaseItemSourceRequestIds(items[0]), ['r1', 'r2'])
	assert.deepEqual(purchaseItemSourceItemIds(items[0]), ['i1', 'i2'])
	assert.equal(items[0].customerName, '甲、乙')
	assert.equal(rows[0].qty, 2)
})

test('existing rows and different suppliers are never collapsed', () => {
	const rows = [
		{ _id: 'old1', productId: 'p', supplierId: 's', unit: '箱', unitFactor: 12, qty: 1 },
		{ _id: 'old2', productId: 'p', supplierId: 's', unit: '箱', unitFactor: 12, qty: 1 },
		{ productId: 'p', supplierId: 'another', unit: '箱', unitFactor: 12, qty: 1 }
	]
	assert.equal(mergePurchaseItemRows(rows).items.length, 3)
})

test('stock quantity uses the saved unit factor', () => {
	const product = { unitSmall: '个', unitMedium: '包', unitLarge: '箱', mediumToSmall: 12, largeToMedium: 12 }
	assert.equal(toBaseUnitQuantity(2, product, '箱'), 288)
	assert.equal(toBaseUnitQuantity(2, product, '箱', 10), 20)
	assert.equal(unitFactor(product, '包'), 12)
})
