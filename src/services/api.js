// src/services/api.js
// Service fino para JSON Server com fetch + helpers de embed/expand

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') // remove / final

const DEFAULT_HEADERS = { 'Content-Type': 'application/json' }

async function request(path, { method = 'GET', body, headers, search } = {}) {
  const url = new URL(path, API_BASE)

  if (search) {
    Object.entries(search).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((val) => url.searchParams.append(k, String(val)))
      } else if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v))
      }
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

export async function getUserById(id, { embed = [], expand = [] } = {}) {
  const user = await request(`/users/${id}`, {
    search: {
      ...(embed.length ? { _embed: embed } : {}),
      ...(expand.length ? { _expand: expand } : {}),
    },
  })

  const followUps = []

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

/**
 * Gera o ID de registro no formato YYYYMMDD-<userId>
 * Ex.: data "2025-09-01", userId 1 => "20250901-1"
 */
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

/**
 * Busca um registro específico pela combinação (userId, data)
 */
export function getRegistroByDate(userId, data) {
  const id = makeRegistroId(data, userId)
  return request(`/registros/${encodeURIComponent(id)}`)
}

/**
 * Salva (cria/atualiza) um registro com ID composto.
 * - Usa PUT idempotente em /registros/:id
 * - Se não existir, o json-server cria; se existir, atualiza.
 *
 * Exemplo de payload:
 * {
 *   userId: 1,
 *   data: "2025-09-09",
 *   pares: [{ in: "09:00", out: "12:00" }],
 *   totalMin: 180,
 *   createdAt: "...", updatedAt: "..."
 * }
 */
export function saveRegistro(payload) {
  const { userId, data } = payload || {}
  const id = makeRegistroId(data, userId)
  // return request(`/registros/${encodeURIComponent(id)}`, {
  //   method: 'PUT',
  //   body: { ...payload, id },
  // })
  return request(`/registros`, {
    method: 'POST',
    body: { ...payload, id },
  })
}

/**
 * Exclui um registro pela combinação (userId, data)
 */
export function deleteRegistroByDate(userId, data) {
  const id = makeRegistroId(data, userId)
  return request(`/registros/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function getEscalasByUser(userId) {
  return request('/escalas', { search: { userId } })
}

/* ===========================
   Utilidades genéricas
   =========================== */

export const http = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}
