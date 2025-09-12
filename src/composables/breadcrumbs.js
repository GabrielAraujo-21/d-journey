// src/composables/breadcrumbs.js
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function pickUserLabel(u) {
  return u?.name || u?.nome || u?.fullName || u?.email || (u?.id ? `ID ${u.id}` : null)
}

/**
 * Fallback padrão do layout do Gestor.
 * Usado quando a rota atual não define meta.breadcrumb.
 */
export function defaultGestorBreadcrumbs(route) {
  const items = [{ title: 'Gestor', disabled: true }]
  const name = String(route.name || '')
  const isEquipe = name === 'djourney-gestor' || name === 'djourney-gestor-usuario'
  const inMinha = name.startsWith('gestor-minha-')

  if (isEquipe) {
    items.push({
      title: 'Equipe',
      to: { name: 'djourney-gestor', params: { id: route.params.id } },
    })
    if (name === 'djourney-gestor-usuario') {
      const u = route.meta?.selectedUser
      items.push({
        title: pickUserLabel(u) || `ID ${route.params.userId}`,
        disabled: true,
      })
    }
  } else if (inMinha) {
    items.push({
      title: 'Minha jornada',
      to: { name: 'gestor-minha-diario', params: { id: route.params.id } },
    })
    items.push({
      title: name === 'gestor-minha-mensal' ? 'Mensal' : 'Diário',
      disabled: true,
    })
  }

  return items
}

/**
 * Composable genérico:
 * - procura um `meta.breadcrumb` do "match" mais profundo para o mais raso;
 * - se achar função: chama com `route` e usa o retorno;
 * - se achar array: usa o array;
 * - senão, usa o `fallbackFactory(route)`.
 */
export function useBreadcrumbs(fallbackFactory = defaultGestorBreadcrumbs) {
  const route = useRoute()

  const breadcrumbs = computed(() => {
    // procura do filho para o pai (último matched tem precedência)
    for (let i = route.matched.length - 1; i >= 0; i--) {
      const rec = route.matched[i]
      const b = rec?.meta?.breadcrumb
      try {
        if (typeof b === 'function') {
          const items = b(route)
          if (items && items.length) return items
        } else if (Array.isArray(b) && b.length) {
          return b
        }
      } catch (e) {
        console.warn('breadcrumb meta falhou:', e)
      }
    }
    // fallback
    return fallbackFactory ? fallbackFactory(route) : []
  })

  return { breadcrumbs }
}
