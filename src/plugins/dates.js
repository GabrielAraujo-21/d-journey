// src/plugins/dates.js
// -----------------------------------------------------------------------------
// Utilitários de datas com suporte a fuso IANA usando date-fns v3 + date-fns-tz v3
// - Foco em "America/Sao_Paulo"
// - Evita "Invalid time value" garantindo que sempre formatamos um Date válido
// - Mantém as mesmas assinaturas que você já utiliza no projeto
// -----------------------------------------------------------------------------
//
// Instalar com:
//   npm i -E date-fns@^3 date-fns-tz@^3
//
// Observação importante (v3):
//   utcToZonedTime  -> toZonedTime
//   zonedTimeToUtc  -> fromZonedTime
// -----------------------------------------------------------------------------

import {
  addDays as addDaysFn,
  startOfWeek,
  differenceInMinutes,
  startOfMonth,
  endOfMonth,
  addMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

/** Fuso padrão do app */
export const ZONE = 'America/Sao_Paulo'

/** Converte entrada para Date e valida; evita "Invalid time value" em format(). */
function asDate(input, ctx = 'date') {
  // Se vier "YYYY-MM-DD", trata como data local no fuso ZONE (00:00 daquele dia)
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const dLocal = fromZonedTime(`${input}T00:00:00`, ZONE)
    if (Number.isNaN(dLocal.valueOf())) throw new RangeError(`Invalid time value: ${ctx}`)
    return dLocal
  }
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.valueOf())) {
    throw new RangeError(`Invalid time value: ${ctx}`)
  }
  return d
}

/** Normaliza para 00:00:00.000 (no fuso local do objeto Date) */
function normalizeStartOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// -----------------------------------------------------------------------------
// Básico (sem alterar seus fluxos atuais)
// -----------------------------------------------------------------------------

/** Retorna "hoje" em ISO (yyyy-MM-dd) no fuso ZONE. */
export const todayISO = () => formatInTimeZone(new Date(), ZONE, 'yyyy-MM-dd')

/** Formata uma data em ISO (yyyy-MM-dd) no fuso ZONE. Aceita Date ou parseável por new Date(). */
export const toISODate = (d) => formatInTimeZone(asDate(d, 'toISODate'), ZONE, 'yyyy-MM-dd')

/** Retorna a hora/minuto atual (HH:mm) no fuso ZONE. */
export const nowHM = () => formatInTimeZone(new Date(), ZONE, 'HH:mm')

/** Soma dias preservando o tipo Date; aceita Date ou string parseável. */
export const addDays = (date, days) => addDaysFn(asDate(date, 'addDays'), days)

/**
 * Início da semana da data informada, respeitando início na segunda se desejado.
 * Retorna um Date ancorado no ZONE com horário 00:00:00.000.
 */
export const getWeekStart = (date, startOnMonday = true) => {
  const base = asDate(date, 'getWeekStart')
  const zoned = toZonedTime(base, ZONE)
  const start = startOfWeek(zoned, { weekStartsOn: startOnMonday ? 1 : 0 })
  start.setHours(0, 0, 0, 0)
  return start
}

/** Formata data curta dd/MM no fuso ZONE (ex.: "09/09"). */
export const formatShort = (d) =>
  formatInTimeZone(asDate(d, 'formatShort'), ZONE, 'dd/MM', { locale: ptBR })

/** Rótulo de semana no formato "dd/MM – dd/MM". */
export const weekLabel = (start) => {
  const s = asDate(start, 'weekLabel(start)')
  const end = addDaysFn(s, 6)
  return `${formatShort(s)} – ${formatShort(end)}`
}

/**
 * Constrói a data ISO (yyyy-MM-dd) para o índice (0..6) em relação ao início da semana.
 * baseStart pode ser Date ou string; o cálculo respeita o fuso ZONE.
 */
export const dateISOAtWeekOffset = (baseStart, dayIdx) => {
  const base = asDate(baseStart, 'dateISOAtWeekOffset(baseStart)')
  const d = addDaysFn(base, dayIdx)
  return formatInTimeZone(d, ZONE, 'yyyy-MM-dd')
}

// -----------------------------------------------------------------------------
// Helpers de pares HH:mm (mantêm suas assinaturas/UX atuais)
// -----------------------------------------------------------------------------

/** Converte "HH:mm" em minutos desde 00:00. Retorna NaN se inválido. */
export function toMinutes(hm) {
  if (!hm || !/^\d{2}:\d{2}$/.test(hm)) return NaN
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}

/** Calcula minutos entre p.in e p.out (HH:mm), considerando cruzar meia-noite. */
export function pairMinutes(p) {
  const a = toMinutes(p?.in)
  const b = toMinutes(p?.out)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  let diff = b - a
  if (diff < 0) diff += 24 * 60 // cruza a meia-noite
  return Math.max(0, diff)
}

/** Detecta se o par cruza a meia-noite. */
export const isCrossMidnight = (p) => {
  const a = toMinutes(p?.in)
  const b = toMinutes(p?.out)
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  return b - a < 0
}

/** Formata minutos em "Xh YYm". */
export const formatMinutes = (mins) => {
  const m = Math.max(0, Math.round(mins || 0))
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return `${h}h ${mm}m`
}

// -----------------------------------------------------------------------------
// Versão "TZ precisa" (opcional) para calcular a duração usando a DATA do registro
// -----------------------------------------------------------------------------

/**
 * Calcula a duração entre p.in e p.out ancorando no dia do registro (isoDate: yyyy-MM-dd)
 * no fuso ZONE. Útil se regras futuras dependerem de horário de verão, etc.
 */
export function pairMinutesTz(p, isoDate) {
  if (!p?.in || !p?.out || !isoDate) return 0

  // Constrói datas no fuso ZONE (interpreta "09:00" naquele fuso) e converte para UTC
  // para comparações aritméticas estáveis.
  const start = fromZonedTime(`${isoDate}T${p.in}:00`, ZONE)
  let end = fromZonedTime(`${isoDate}T${p.out}:00`, ZONE)

  // Se o "out" ficar antes do "in", consideramos que cruzou a meia-noite.
  if (end < start) end = addDaysFn(end, 1)

  return Math.max(0, differenceInMinutes(end, start))
}

// -----------------------------------------------------------------------------
// ADIÇÕES para eliminar duplicações em registros/HistoricoMensal (mantendo nomes):
// -----------------------------------------------------------------------------

// Alias para manter nomenclatura usada em registros.js
export const weekStart = (d, startOnMonday = true) => getWeekStart(d, startOnMonday)

// Rótulos de dias por índice (0..6)
export const weekdayLabelByIndex = (idx, startOnMonday = true) => {
  const listMon = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const listSun = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return (startOnMonday ? listMon : listSun)[idx]
}

// Rótulo pelo Date
export const weekdayLabelByDate = (d) => {
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const dd = asDate(d, 'weekdayLabelByDate')
  return names[dd.getDay()]
}

// Conveniência (mesma assinatura já usada)
export const weekdayLabel = weekdayLabelByDate

// -----------------------------------------------------------------------------
// NOVOS HELPERS MENSAIS (para Histórico Mensal)
// -----------------------------------------------------------------------------

/**
 * Retorna { start, end } do mês corrente com base em `d`.
 * - start: 1º dia do mês de `d`
 * - end: se o mês é o mês atual -> hoje (00:00); senão -> último dia do mês
 */
export function monthRangeCurrent(d = new Date()) {
  const base = toZonedTime(asDate(d, 'monthRangeCurrent'), ZONE)
  const start = normalizeStartOfDay(startOfMonth(base))

  const now = toZonedTime(new Date(), ZONE)
  const sameMonth = start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth()

  const end = sameMonth
    ? normalizeStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    : normalizeStartOfDay(endOfMonth(start))

  return { start, end }
}

/**
 * Retorna { start, end } do mês anterior ao de `d`.
 * - start: 1º dia do mês anterior
 * - end: último dia do mês anterior
 */
export function monthRangePrevious(d = new Date()) {
  const base = toZonedTime(asDate(d, 'monthRangePrevious'), ZONE)
  const prevStart = normalizeStartOfDay(addMonths(startOfMonth(base), -1))
  const prevEnd = normalizeStartOfDay(endOfMonth(prevStart))
  return { start: prevStart, end: prevEnd }
}

/** Rótulo do mês no formato "mmmm yyyy" no fuso ZONE (ex.: "setembro 2025"). */
export function monthLabel(d) {
  return formatInTimeZone(asDate(d, 'monthLabel'), ZONE, 'LLLL yyyy', { locale: ptBR })
}
