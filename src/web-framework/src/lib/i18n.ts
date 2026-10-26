import { useCallback, useSyncExternalStore } from "react";
import { zhHant } from "./messages/zh-Hant";

export type Locale = "en" | "zh-Hant";
const storageKey = "keyvault.language";
const listeners = new Set<() => void>();
const isLocale = (value: unknown): value is Locale => value === "en" || value === "zh-Hant";

export function browserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    if (/^en(?:-|$)/i.test(language)) return "en";
    if (/^zh(?:$|-Hant(?:-|$)|-TW(?:-|$)|-HK(?:-|$)|-MO(?:-|$))/i.test(language)) {
      return "zh-Hant";
    }
  }
  return "en";
}

function initialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (isLocale(saved)) return saved;
  } catch (error) {
    console.warn("Unable to read the saved KeyVault language preference.", error);
  }
  return browserLocale(navigator.languages);
}

let locale = initialLocale();

function notify(next: Locale) {
  locale = next;
  for (const listener of listeners) listener();
}

export function setLocale(next: Locale) {
  try {
    window.localStorage.setItem(storageKey, next);
  } catch (error) {
    console.warn(
      "Unable to save the KeyVault language preference; using it for this session.",
      error
    );
  }
  notify(next);
}

function onStorage(event: StorageEvent) {
  if (
    event.storageArea === window.localStorage &&
    (event.key === storageKey || event.key === null)
  ) {
    notify(isLocale(event.newValue) ? event.newValue : browserLocale(navigator.languages));
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useLocale() {
  return useSyncExternalStore(
    subscribe,
    () => locale,
    (): Locale => "en"
  );
}

export function formatLocale(): string {
  return locale === "zh-Hant" ? "zh-TW" : "en";
}

export function t(message: string, values?: Record<string, string | number>): string {
  return translate(locale, message, values);
}

export function useT() {
  const language = useLocale();
  return useCallback(
    (message: string, values?: Record<string, string | number>) =>
      translate(language, message, values),
    [language]
  );
}

function translate(
  language: Locale,
  message: string,
  values?: Record<string, string | number>
): string {
  const translated = language === "zh-Hant" ? zhHant[message] : undefined;
  const text = typeof translated === "string" ? translated : message;
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.keys(values).includes(name) ? String(values[name]) : placeholder
  );
}
