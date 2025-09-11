// src/services/api.js
// Service fino compatível com json-server (dev) e localStorage (prod)

import createLocalStorageAdapter from './adapters/localStorageAdapter'

// Base para dev (json-server). Em prod, é ignorado.
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  ''
).replace(/\/+$/, '')

const IS_PROD = import.meta.env.MODE === 'production'

// Adapter localStorage (somente prod)
const local = IS_PROD
  ? createLocalStorageAdapter({
      // Usa src/mocks/db.json como seed inicial
      seed: () => import('@/mocks/db.json'),
    })
  : null

const DEFAULT_HEADERS = { 'Content-Type': 'application/json' }

/** Implementação de request unificada */
async function request(path, { method = 'GET', body, headers, search } = {}) {
  // ===== PROD: localStorage =====
  if (IS_PROD) {
    const opts = { headers, search }
    switch (method) {
      case 'GET':
        return local.get(path, opts)
      case 'POST':
        return local.post(path, body ?? {})
      case 'PUT':
        return local.put(path, body ?? {})
      case 'PATCH':
        return local.patch(path, body ?? {})
      case 'DELETE':
        return local.delete(path)
      default:
        throw new Error(`Método não suportado: ${method}`)
    }
  }

  // ===== DEV: json-server por fetch =====
  const url = new URL(path, API_BASE)

  if (search) {
    Object.entries(search).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((val) => url.searchParams.append(k, String(val)))
      else if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    })
  }
  const res = await fetch(url.toString(), {
    method,
    headers: { ...DEFAULT_HEADERS, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`)
  }
  return res.status === 204 ? null : res.json()
}

/* ===========================
   USERS
   =========================== */

export async function getUserById(id, { embed = ['escalas', 'registros'], expand = ['PerfilTipo', 'tipoContrato'] } = {}) {
  const user = await request(`/users/${id}`, {
    search: {
      ...(embed.length ? { _embed: embed } : {}),
      ...(expand.length ? { _expand: expand } : {}),
    },
  })

  const followUps = []

  // Mantém sua lógica de follow-ups igual ao json-server
  if (embed.includes('registros') && !user.registros) {
    followUps.push(
      request('/registros', { search: { userId: id, _sort: 'data', _order: 'desc' } }).then(
        (list) => {
          user.registros = list
        },
      ),
    )
  }
  if (embed.includes('escalas') && !user.escalas) {
    followUps.push(
      request('/escalas', { search: { userId: id } }).then((list) => {
        user.escalas = list
      }),
    )
  }

  if (expand.includes('PerfilTipo') && !user.PerfilTipo && user.PerfilTipoId != null) {
    followUps.push(
      request(`/PerfilTipos/${user.PerfilTipoId}`).then((v) => {
        user.PerfilTipo = v
      }),
    )
  }
  if (expand.includes('tipoContrato') && !user.tipoContrato && user.tipoContratoId != null) {
    followUps.push(
      request(`/tipoContratos/${user.tipoContratoId}`).then((v) => {
        user.tipoContrato = v
      }),
    )
  }

  if (followUps.length) await Promise.all(followUps)
  return user
}

export function patchUser(id, payload) {
  return request(`/users/${id}`, { method: 'PATCH', body: payload })
}

/* ===========================
   REGISTROS / ESCALAS
   =========================== */

/** Gera ID determinístico YYYYMMDD-<userId> */
export function makeRegistroId(data, userId) {
  const ymd = String(data ?? '')
    .slice(0, 10)
    .replaceAll('-', '')
  if (!ymd || !userId) throw new Error('makeRegistroId: data e userId são obrigatórios')
  return `${ymd}-${userId}`
}

export function getRegistrosByUser(userId, { order = 'desc' } = {}) {
  return request('/registros', { search: { userId, _sort: 'data', _order: order } })
}

export function getRegistroByDate(userId, data) {
  const id = makeRegistroId(data, userId)
  return request(`/registros/${encodeURIComponent(id)}`)
}

export function saveRegistro(payload) {
  const { userId, data } = payload || {}
  const id = makeRegistroId(data, userId)
  // Mantém sua opção atual (POST com id explícito)
  return request(`/registros`, { method: 'POST', body: { ...payload, id } })
}

export function deleteRegistroByDate(userId, data) {
  const id = makeRegistroId(data, userId)
  return request(`/registros/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function getEscalasByUser(userId) {
  return request('/escalas', { search: { userId } })
}

/* ===========================
   Util genérico (compatível)
   =========================== */

export const http = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}
