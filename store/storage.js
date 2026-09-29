// Keep each entry well below the mini-program per-key limit, including JSON escaping.
const CHUNK_CHARS = 96 * 1024
const FORMAT = 'sqms-chunks-v1'

function chunkKeys(value) {
	return value && value.format === FORMAT && Array.isArray(value.keys) ? value.keys : []
}

function removeChunks(keys) {
	keys.forEach((key) => {
		try { uni.removeStorageSync(key) } catch (_) { /* Old cache cleanup can be retried later. */ }
	})
}

export function readStoredValue(key) {
	const value = uni.getStorageSync(key)
	if (!value || value.format !== FORMAT) return value
	const parts = chunkKeys(value).map((partKey) => {
		const part = uni.getStorageSync(partKey)
		if (typeof part !== 'string' || !part.length) throw new Error('本机缓存不完整，请联网重试同步')
		return part
	})
	const json = parts.join('')
	if (json.length !== value.length) throw new Error('本机缓存不完整，请联网重试同步')
	return JSON.parse(json)
}

export function writeStoredValue(key, value) {
	const previous = uni.getStorageSync(key)
	const json = JSON.stringify(value)
	const created = []
	try {
		if (json.length <= CHUNK_CHARS) {
			uni.setStorageSync(key, value)
		} else {
			const generation = Date.now().toString(36) + Math.random().toString(36).slice(2)
			for (let offset = 0; offset < json.length; offset += CHUNK_CHARS) {
				const partKey = `${key}__chunk_${generation}_${created.length}`
				created.push(partKey)
				uni.setStorageSync(partKey, json.slice(offset, offset + CHUNK_CHARS))
			}
			// Switch the manifest only after every part is durable. A failed write retains the old data.
			uni.setStorageSync(key, { format: FORMAT, keys: created, length: json.length })
		}
	} catch (error) {
		removeChunks(created)
		throw new Error('本机存储写入失败，原有记录已保留：' + ((error && (error.errMsg || error.message)) || '存储空间不足'))
	}
	removeChunks(chunkKeys(previous))
}

export function removeStoredValue(key) {
	const previous = uni.getStorageSync(key)
	uni.removeStorageSync(key)
	removeChunks(chunkKeys(previous))
}
