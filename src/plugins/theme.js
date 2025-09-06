// src/plugins/theme.js
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const djourneyLight = {
  dark: false,
  colors: {
    primary: '#6750A4',
    secondary: '#22D3EE',
    tertiary: '#7C3AED',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#0EA5E9',
    background: '#F7F8FC',
    surface: '#FFFFFF',
    'on-surface': '#1F2937',
    'on-primary': '#FFFFFF',
    outline: '#E5E7EB',
  },
}

const djourneyDark = {
  dark: true,
  colors: {
    primary: '#7C6FCC',
    secondary: '#22D3EE',
    tertiary: '#A78BFA',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#38BDF8',
    background: '#0B0F1A',
    surface: '#111827',
    'on-surface': '#E5E7EB',
    'on-primary': '#FFFFFF',
    outline: '#374151',
  },
}

// opcional: usa último tema salvo (persistência simples)
const saved = localStorage.getItem('themeName')

export default createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  theme: {
    defaultTheme: saved || 'djourneyDark', // 👈 dark como padrão
    themes: { djourneyLight, djourneyDark },
  },
})
