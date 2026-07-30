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
    noStagedChanges: 'No hay cambios preparados. Prepara archivos e inténtalo de nuevo.',
    noChanges: 'No hay cambios en el repositorio.',
    alreadyInProgress: 'Ya se está generando un mensaje de commit.',
    promptTooLarge: 'El modelo seleccionado no puede procesar el prompt de commit.',
    compressingPrompt: 'Reduciendo el prompt para ajustarlo al contexto del modelo.',
    generatingChars: 'Generando mensaje de commit ({0} caracteres).',
    noGitRepository: 'No hay un repositorio Git en este espacio de trabajo.',
    selectRepository: 'Selecciona el repositorio cuyos cambios se analizarán',
    selectRepositoryTitle: 'Seleccionar repositorio Git',
    noModelsAvailable: 'No hay un modelo de lenguaje disponible. Instala GitHub Copilot.',
    noModelsWithCopilot: 'No hay un modelo de lenguaje disponible. Habilita GitHub Copilot e inténtalo de nuevo.',
    generating: 'Generando mensaje de commit.',
    error: 'No se puede generar el mensaje de commit. Abre los registros para ver más información.',
    gitUnavailable: 'Git no está en el PATH del sistema. Algunas funciones de la extensión no funcionarán.',
    openSettings: 'Abrir configuración',
    openLogs: 'Abrir registros',
    llmConsentRequired: 'Permite el acceso a la API de Modelos de Lenguaje.',
    rateLimited: 'Se alcanzó el límite de solicitudes del modelo. Inténtalo de nuevo más tarde.',
    diffTooLarge: 'El diff es grande. La extensión lo redujo para ajustarlo al contexto del modelo.',
    invalidModelResponse: 'El modelo devolvió un mensaje de commit no válido. Inténtalo de nuevo.',
    currentStyle: 'Actual: {0}',
    selectStyle: 'Seleccionar estilo de mensaje de commit',
    selectStyleTitle: 'Seleccionar estilo de commit',
    analyzingModel: 'Comprobando modelos disponibles.',
    analyzingHistory: 'Leyendo commits recientes.',
    fetchingModels: 'Buscando modelos de lenguaje disponibles.',
    buildingModelList: 'Preparando la lista de modelos.',
    showingModelSelection: 'Abriendo la lista de modelos.',
    selectLanguageModel: 'Selecciona un modelo de lenguaje para generar commits',
    modelsAvailableTitle: 'Git Commit Generator: {0} modelos disponibles',
    refreshingModels: 'Actualizando modelos de lenguaje disponibles.',
    errorFetchingModels: 'No se pueden obtener los modelos de lenguaje disponibles.',
    errorRefreshingModels: 'No se pueden actualizar los modelos de lenguaje disponibles.',
    installCopilot: 'Instalar Copilot',
    buildingPrompt: 'Preparando el prompt.',
    parsingResponse: 'Leyendo la respuesta del modelo.',
    done: 'Listo.',
    maxRetriesExceeded: 'Se alcanzó el número máximo de intentos. Inténtalo de nuevo más tarde.',
    offTopicError: 'El modelo no puede crear un mensaje de commit para estos cambios.',
    quotaExceeded: 'Se alcanzó la cuota del modelo de lenguaje. Inténtalo de nuevo más tarde.',
    activationFailed: 'Git Commit Generator no se inició. Abre los registros para ver más información.',
    requestJustification: 'Generar un mensaje de commit de Git a partir de los cambios seleccionados del repositorio.',
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

  categories: {
    popular: 'Popular',
    framework: 'Framework',
    devops: 'DevOps y herramientas',
    system: 'Sistema',
    specialized: 'Especializado',
    minimal: 'Minimalista',
  },
};
