import i18next from 'i18next';
import zhTW from './zh-TW.mjs';

export const languages = ['en', 'zh-TW'];
const storageKey = 'dst-guide-language';
let savedLanguage;
try { savedLanguage = window.localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }

const en = {
  "foods_one": "{{count}} food",
  "foods_other": "{{count}} foods",
  "foodsFound_one": "{{count}} food found",
  "foodsFound_other": "{{count}} foods found",
  "recipes_one": "{{count}} recipe",
  "recipes_other": "{{count}} recipes",
  "paths_one": "{{count}} path",
  "paths_other": "{{count}} paths",
  "crafts_one": "{{count}} craft",
  "crafts_other": "{{count}} crafts",
  "servings_one": "{{count}} serving",
  "servings_other": "{{count}} servings",
  "materialItems_one": "For {{count}} item.",
  "materialItems_other": "For {{count}} items."
};

const i18n = i18next.createInstance();
export const i18nReady = i18n.init({
  lng: languages.includes(savedLanguage) ? savedLanguage : 'en',
  fallbackLng: 'en',
  supportedLngs: languages,
  resources: { en: { translation: en }, 'zh-TW': { translation: zhTW } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});

export const language = () => i18n.language;
export const t = (key, values) => i18n.t(key, { defaultValue: key, ...values });

export async function setLanguage(locale) {
  if (!languages.includes(locale)) return;
  await i18n.changeLanguage(locale);
  try { window.localStorage.setItem(storageKey, locale); } catch { /* Apply the choice for this visit. */ }
}
