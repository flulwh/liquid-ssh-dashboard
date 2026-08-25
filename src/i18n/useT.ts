import { useTranslation } from 'react-i18next';
import { getCurrentLanguage, setLanguage, type SupportedLanguage } from './index';

export { setLanguage, getCurrentLanguage };
export type { SupportedLanguage };
export { SUPPORTED_LANGUAGES } from './index';

/**
 * Typed wrapper around react-i18next's useTranslation. Returns a `t` function
 * with a flat key string (e.g. t('dashboard.title')) and a `i18n` instance.
 *
 * The keys are NOT type-checked at runtime, but the namespaces are kept in
 * lockstep between the two locale files for IDE-friendliness.
 */
export function useT() {
  const { t, i18n } = useTranslation();
  return { t, i18n };
}