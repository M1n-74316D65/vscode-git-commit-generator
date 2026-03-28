export const es = {
  systemPrompt: `Genera un mensaje de commit de Git usando el formato Gitmoji + Conventional Commits.

Formato: <emoji> <tipo>(<alcance>): <asunto>

Tipos y emojis:
- ✨ feat: Nueva característica
- 🐛 fix: Corrección de error
- ⚡ perf: Mejora de rendimiento
- 📚 docs: Cambios solo en documentación
- ♻️ refactor: Refactorización de código
- ✅ test: Agregar o corregir pruebas
- 🔧 chore: Cambios en proceso de build o herramientas auxiliares

Reglas:
- Asunto máximo 72 caracteres
- Usa modo imperativo ("Agregar" no "Agregado")
- Incluye alcance entre paréntesis cuando sea claro (ej: feat(auth))
- Sé específico pero conciso
- Enfócate en QUÉ cambió y POR QUÉ
- Responde SOLO con el mensaje de commit

Para generación de cuerpo (cuando hay muchos cambios):
- Agrega una línea en blanco después del asunto
- Usa viñetas (-) para cada cambio
- Explica QUÉ cambió y POR QUÉ
- Referencia cambios importantes (breaking changes) si los hay`,

  messages: {
    noStagedChanges: 'No se encontraron cambios preparados (staged). Prepara algunos archivos primero.',
    noGitRepository: 'No se encontró un repositorio Git en el espacio de trabajo actual.',
    noModelsAvailable: 'No hay modelos de lenguaje disponibles. Por favor instala GitHub Copilot.',
    noModelsWithCopilot: 'No hay modelos de lenguaje disponibles. Asegúrate de que GitHub Copilot esté instalado y habilitado.',
    generating: 'Generando mensaje de commit...',
    generated: '¡Mensaje de commit generado!',
    error: 'Error al generar mensaje de commit: {0}',
    gitUnavailable: 'Git Commit Generator: Git no está disponible en el PATH del sistema. Algunas funciones pueden no funcionar.',
    openSettings: 'Abrir configuración',
    welcomeReady: '¡Git Commit Generator está listo! Genera mensajes de commit con IA usando el botón de brillo en el panel de Source Control.',
    generateCommitAction: 'Generar un commit',
    gotIt: 'Entendido',
    llmConsentRequired: 'Por favor concede permiso para usar la API de Modelos de Lenguaje.',
    rateLimited: 'Límite de tasa excedido. Por favor intenta de nuevo más tarde.',
    diffTooLarge: 'El diff es muy grande. Truncando para ajustarse a los límites de tokens.',
    styleChanged: 'Estilo de commit cambiado a: {0}',
    gitmojisEnabled: '✅ Gitmojis activados',
    gitmojisDisabled: '⭕ Gitmojis desactivados',
    enabledLabel: 'ACTIVADOS',
    disabledLabel: 'DESACTIVADOS',
    currentStyle: 'Actual: {0}',
    selectStyle: 'Seleccionar estilo de mensaje de commit',
    selectStyleTitle: 'Seleccionar estilo de commit',
    toggleGitmojis: 'Activar/Desactivar Gitmijos',
    analyzingModel: 'Analizando modelos disponibles...',
    analyzingHistory: 'Analizando historial de commits...',
    fetchingModels: 'Obteniendo modelos disponibles desde la API LLM de VS Code...',
    buildingModelList: 'Construyendo lista de modelos...',
    showingModelSelection: 'Mostrando selección...',
    selectLanguageModel: 'Selecciona un modelo de lenguaje para generar commits',
    modelsAvailableTitle: 'Git Commit Generator - {0} modelo(s) disponible(s)',
    modelSet: '✅ Modelo configurado a {0} ({1})',
    refreshingModels: 'Actualizando modelos de lenguaje disponibles...',
    modelsFoundOpeningSelector: '✅ Se encontraron {0} modelo(s) disponible(s). Abriendo selector...',
    errorFetchingModels: 'Error al obtener modelos: {0}',
    errorRefreshingModels: 'Error al actualizar modelos: {0}',
    installCopilot: 'Instalar Copilot',
    buildingPrompt: 'Construyendo prompt...',
    parsingResponse: 'Analizando respuesta...',
    done: '¡Listo!',
    maxRetriesExceeded: 'Se excedieron los intentos máximos. Por favor intenta de nuevo más tarde.',
    offTopicError: 'Los cambios no son adecuados para generación de mensajes de commit.',
    quotaExceeded: 'Cuota de API excedida. Por favor intenta de nuevo más tarde.',
    activationFailed: 'Git Commit Generator no pudo activarse. Revisa la consola de depuración para más detalles.',
    statusBarTooltip: 'Haz clic para cambiar el estilo de commit\nActual: {0}\nGitmojis: {1}',
  },

  commitTypes: {
    feat: 'feat',
    fix: 'fix',
    perf: 'perf',
    docs: 'docs',
    refactor: 'refactor',
    test: 'test',
    chore: 'chore',
  },

  styles: {
    conventional: 'Conventional Commits',
    angular: 'Angular/Google',
    atom: 'Atom Editor',
    eslint: 'ESLint',
    jquery: 'jQuery',
    ember: 'Ember.js',
    linux: 'Linux Kernel',
    symfony: 'Symfony',
    rails: 'Ruby on Rails',
    graphql: 'GraphQL',
    docker: 'Docker',
    karma: 'Karma Runner',
    semantic: 'Semantic Versioning',
    plain: 'Plain Simple',
    bitbucket: 'Bitbucket',
  },

  styleDescriptions: {
    conventional: 'tipo: descripción',
    angular: 'tipo(alcance): descripción',
    atom: ':emoji: descripción',
    eslint: 'Tag: Descripción',
    jquery: 'Componente: Descripción breve',
    ember: '[TAG] descripción breve',
    linux: 'subsistema: descripción',
    symfony: '[Tipo] Descripción',
    rails: '[Tag] descripción',
    graphql: 'descripción (tipo)',
    docker: 'alcance: descripción',
    karma: 'tipo(alcance): descripción',
    semantic: 'tipo: descripción (cierra #X)',
    plain: 'Descripción',
    bitbucket: 'JIRA-123: descripción',
  },

  categories: {
    popular: '⭐ Popular',
    framework: '🔧 Framework',
    devops: '🛠️ DevOps & Herramientas',
    system: '⚙️ Sistema',
    specialized: '📋 Especializado',
    minimal: '✨ Minimalista',
  },
};
