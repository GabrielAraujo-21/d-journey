// src/services/api.js
// Service fino para JSON Server com fetch + helpers de embed/expand

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') // remove / final

const DEFAULT_HEADERS = { 'Content-Type': 'application/json' }

async function request(path, { method = 'GET', body, headers, search } = {}) {
  const url = new URL(path, API_BASE)

  // Permite repetir _embed e _expand: search: { _embed: ['registros','escalas'], _expand: ['PerfilTipo','tipoContrato'] }
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

  // JSON Server retorna 204 em alguns casos
  return res.status === 204 ? null : res.json()
}

/* ===========================
   USERS
   =========================== */

/**
 * Busca usuário por ID e opcionalmente traz relacionamentos.
 * - embed: coleções que têm FK para users (ex.: ['registros','escalas'])
 * - expand: entidades referenciadas por FK no user (ex.: ['PerfilTipo','tipoContrato'])
 *
 * Observação: o JSON Server usa:
 *  - _embed=colecao (ex.: registros -> adiciona "registros": [...])
 *  - _expand=recurso (singular do recurso plural); ex.: posts?_expand=user -> adiciona "user": {...}
 *    Aqui usamos nomes exatamente como você escrever (respeitando case), e fazemos fallback manual.
 */
export async function getUserById(id, { embed = [], expand = [] } = {}) {
  const user = await request(`/users/${id}`, {
    search: {
      ...(embed.length ? { _embed: embed } : {}),
      ...(expand.length ? { _expand: expand } : {}),
    },
  })

  // Fallback manual caso algum _embed/_expand não volte (diferenças de singular/plural/case).
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

export function getRegistrosByUser(userId, { order = 'desc' } = {}) {
  return request('/registros', { search: { userId, _sort: 'data', _order: order } })
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
