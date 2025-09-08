# d-journey
d-journey

Aplicativo de gestão de tempo/jornada construído em Vue 3 + Vuetify 3, com auto-rotas e layouts dinâmicos. Este repositório inclui um mock de API com json-server para viabilizar o MVP sem back-end.

Status: MVP em desenvolvimento (https://app-d-journey.netlify.app/)

Stack: Vue 3 • Vite • Vuetify 3 • vue-router/auto • json-server

O d-journey é um app focado em planejamento de jornada, com acompanhamento de tarefas e métricas pessoais.
Este MVP prioriza UX simples, tema claro/escuro, e um login simulado para navegação entre layouts públicos e privados.

Login (MVP): o login é fake. Botões na tela de login autenticam como “Usuário 1” para fins de navegação e testes.

Funcionalidades

🔐 Login simulado (botões → usuário 1)

🎨 Tema claro/escuro (toggle no header)

🗺️ Auto-rotas a partir de src/pages

🧩 Layouts dinâmicos (Landing vs. Usuário)

🗃️ Mock API com json-server (dados locais)

⚡ Vite para dev rápido e HMR

📱 Vuetify 3 para UI responsiva

Arquitetura & Padrões

Vue 3 (Composition API)

Vuetify 3 para componentes e theming

vue-router/auto + virtual:generated-layouts para rotas e layouts automáticos

json-server para simular endpoints REST

Sem alterar nomenclaturas e lógicas já definidas (princípio do projeto)

Pré-requisitos

Node.js 18+ (recomendado)

NPM 9+ (ou PNPM/Yarn, se preferir)

Dica: usar nvm/Volta ajuda a padronizar a versão do Node.
