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
    generating: 'Generando mensaje de commit...',
    generated: '¡Mensaje de commit generado!',
    error: 'Error al generar mensaje de commit: {0}',
    llmConsentRequired: 'Por favor concede permiso para usar la API de Modelos de Lenguaje.',
    rateLimited: 'Límite de tasa excedido. Por favor intenta de nuevo más tarde.',
    diffTooLarge: 'El diff es muy grande. Truncando para ajustarse a los límites de tokens.',
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
};
