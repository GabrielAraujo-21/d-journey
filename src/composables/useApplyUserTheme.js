// src/composables/useApplyUserTheme.js
import { useTheme } from 'vuetify'

export function useApplyUserTheme() {
  const theme = useTheme()

  function resolveThemeName(themeColor) {
    // aceite tanto 'dark'/'light' quanto nomes diretos ('djourneyDark', 'djourneyLight')
    if (themeColor === 'dark') return 'djourneyDark'
    if (themeColor === 'light') return 'djourneyLight'
    if (themeColor === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? 'djourneyDark' : 'djourneyLight'
    }
    // fallback: se vier um nome de tema já existente
    return themeColor || 'djourneyDark'
  }

  function applyUserTheme(themeColor) {
    const name = resolveThemeName(themeColor)
    theme.global.name.value = name
    localStorage.setItem('themeName', name) // persiste para próximos loads
  }

  return { applyUserTheme }
}
