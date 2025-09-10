// src/services/adapters/localStorageAdapter.js
const LOCAL_KEY = 'appdb'

function load() {
  const raw = localStorage.getItem(LOCAL_KEY)
  return raw ? JSON.parse(raw) : { _meta: { nextId: {} } }
}
function save(db) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(db))
}
function ensureCollection(db, name) {
  if (!db[name]) db[name] = []
  if (!db._meta) db._meta = { nextId: {} }
  if (db._meta.nextId[name] == null) {
    const maxId = db[name].reduce((m, o) => {
      const n = Number(o?.id)
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 0)
    db._meta.nextId[name] = maxId + 1
  }
}
function nextId(db, name) {
  ensureCollection(db, name)
  const id = db._meta.nextId[name]++
  return id
}
function parseUrl(path) {
  const clean = String(path || '')
    .replace(/^\//, '')
    .split('?')[0]
  const [collection, ...rest] = clean.split('/')
  const id = rest.length ? rest.join('/') : null // mantém string (pode ter '-')
  return { collection, id }
}
function cmp(a, b) {
  if (a === b) return 0
  return a > b ? 1 : -1
}
function matchByParams(item, params = {}) {
  for (const [key, val] of Object.entries(params || {})) {
    if (['_sort', '_order', '_page', '_limit', 'q'].includes(key)) continue
    if (key.endsWith('_gte')) {
      const k = key.slice(0, -4)
      if (cmp(String(item[k] ?? ''), String(val)) < 0) return false
    } else if (key.endsWith('_lte')) {
      const k = key.slice(0, -4)
      if (cmp(String(item[k] ?? ''), String(val)) > 0) return false
    } else {
      // igualdade simples
      if (Array.isArray(val)) {
        if (!val.map(String).includes(String(item[key]))) return false
      } else if (String(item[key]) !== String(val)) {
        return false
      }
    }
  }
  if (params.q != null) {
    const q = String(params.q).toLowerCase()
    const ok = Object.values(item).some((v) => v != null && String(v).toLowerCase().includes(q))
    if (!ok) return false
  }
  return true
}
function sortItems(items, params = {}) {
  if (!params._sort) return items
  const field = params._sort
  const order = (params._order || 'asc').toLowerCase()
  return [...items].sort((a, b) => {
    const r = cmp(a?.[field], b?.[field])
    return order === 'desc' ? -r : r
  })
}
function paginate(items, params = {}) {
  const page = Number(params._page) || 1
  const limit = Number(params._limit) || items.length
  const start = (page - 1) * limit
  return items.slice(start, start + limit)
}

export default function createLocalStorageAdapter({ seed } = {}) {
  let db = load()

  async function ensureSeed() {
    if (seed && Object.keys(db).filter((k) => k !== '_meta').length === 0) {
      const json = (await seed()).default ?? (await seed())
      db = { _meta: { nextId: {} }, ...json }
      save(db)
    }
  }

  /* ========== Métodos (retornam "data" direto, como fetch.json()) ========== */
  async function get(path, { search } = {}) {
    await ensureSeed()
    const { collection, id } = parseUrl(path)
    if (!collection) throw new Error('GET: collection inválida')
    ensureCollection(db, collection)

    if (id != null) {
      const item = db[collection].find((o) => String(o.id) === String(id))
      if (!item) throw new Error('404 Not Found')
      return item
    }

    let arr = db[collection].filter((o) => matchByParams(o, search))
    arr = sortItems(arr, search)
    arr = paginate(arr, search)
    return arr
  }

  async function post(path, body = {}) {
    await ensureSeed()
    const { collection } = parseUrl(path)
    if (!collection) throw new Error('POST: collection inválida')
    ensureCollection(db, collection)

    const now = new Date().toISOString()
    const hasId = body?.id != null
    const id = hasId ? body.id : nextId(db, collection)
    const item = { ...body, id, createdAt: body.createdAt ?? now, updatedAt: body.updatedAt ?? now }

    // não duplica IDs
    const exists = db[collection].some((o) => String(o.id) === String(id))
    if (exists) throw new Error('409 Conflict')

    db[collection].push(item)
    save(db)
    return item
  }

  async function put(path, body = {}) {
    await ensureSeed()
    const { collection, id } = parseUrl(path)
    if (!collection || id == null) throw new Error('PUT: path inválido')
    ensureCollection(db, collection)

    const idx = db[collection].findIndex((o) => String(o.id) === String(id))
    const now = new Date().toISOString()
    const next = { ...body, id, updatedAt: now }

    if (idx === -1) {
      // cria se não existir
      next.createdAt = body.createdAt ?? now
      db[collection].push(next)
    } else {
      next.createdAt = db[collection][idx].createdAt ?? body.createdAt ?? now
      db[collection][idx] = next
    }
    save(db)
    return next
  }

  async function patch(path, body = {}) {
    await ensureSeed()
    const { collection, id } = parseUrl(path)
    if (!collection || id == null) throw new Error('PATCH: path inválido')
    ensureCollection(db, collection)

    const idx = db[collection].findIndex((o) => String(o.id) === String(id))
    if (idx === -1) throw new Error('404 Not Found')
    const now = new Date().toISOString()
    const merged = { ...db[collection][idx], ...body, id, updatedAt: now }
    db[collection][idx] = merged
    save(db)
    return merged
  }

  async function del(path) {
    await ensureSeed()
    const { collection, id } = parseUrl(path)
    if (!collection || id == null) throw new Error('DELETE: path inválido')
    ensureCollection(db, collection)

    const before = db[collection].length
    db[collection] = db[collection].filter((o) => String(o.id) !== String(id))
    if (db[collection].length === before) throw new Error('404 Not Found')
    save(db)
    return {}
  }

  return { get, post, put, patch, delete: del }
}
