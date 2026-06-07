import { db } from '@/store/db.js'
import { T } from '@/store/schema.js'

export function normalizeArchiveName(name) {
	return String(name || '').trim().toLowerCase()
}

export function normalizeCompetitorName(name) {
	return normalizeArchiveName(name)
}

export function listCompetitors() {
	return db.list(T.COMPETITOR, null, 'name')
}

export function findCompetitorByName(name) {
	const key = normalizeArchiveName(name)
	if (!key) return null
	return listCompetitors().find((item) => normalizeArchiveName(item.name) === key) || null
}

export function filterCompetitors(keyword, limit = 6) {
	const key = normalizeArchiveName(keyword)
	let rows = listCompetitors()
	if (key) {
		rows = rows.filter((item) => {
			const text = [
				item.name,
				item.contact,
				item.phone
			].filter(Boolean).join(' ').toLowerCase()
			return text.indexOf(key) >= 0
		})
	}
	return rows.slice(0, limit)
}

export function listSuppliers() {
	return db.list(T.SUPPLIER, null, 'name')
}

export function findSupplierByName(name) {
	const key = normalizeArchiveName(name)
	if (!key) return null
	return listSuppliers().find((item) => normalizeArchiveName(item.name) === key) || null
}

export function archiveEditUrl(type, seed = {}) {
	const params = [`type=${encodeURIComponent(type)}`]
	const fields = ['name', 'contact', 'phone', 'address']
	fields.forEach((key) => {
		const value = String(seed[key] || '').trim()
		if (value) params.push(`${key}=${encodeURIComponent(value)}`)
	})
	return `/pages/archive/edit?${params.join('&')}`
}

export function ensureCompetitorRecord({ name, contact = '', phone = '' }) {
	const cleanName = String(name || '').trim()
	if (!cleanName) return { ok: false, msg: '请输入同行名称' }
	const exist = findCompetitorByName(cleanName)
	if (exist) return { ok: true, record: exist, created: false }

	const cleanContact = String(contact || '').trim()
	const cleanPhone = String(phone || '').trim()
	if (!cleanContact && !cleanPhone) {
		return { ok: false, msg: '新同行请至少填写联系人或电话' }
	}

	const record = db.insert(T.COMPETITOR, {
		name: cleanName,
		contact: cleanContact,
		phone: cleanPhone
	})
	return { ok: true, record, created: true }
}
