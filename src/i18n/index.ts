import { en } from './en';
import { es } from './es';

export const translations = {
  en,
  es,
};

export type Language = keyof typeof translations;

export function getTranslation(lang: string): typeof en {
  return translations[lang as Language] || translations.en;
}
