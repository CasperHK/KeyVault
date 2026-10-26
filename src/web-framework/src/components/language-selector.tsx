import { Languages } from "lucide-react";
import { setLocale, t, useLocale } from "@/lib/i18n";

export function LanguageSelector() {
  const locale = useLocale();
  return (
    <label className="kv-language-selector">
      <Languages size={16} aria-hidden="true" />
      <select
        aria-label={t("Language")}
        value={locale}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "en" || value === "zh-Hant") setLocale(value);
        }}
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="zh-Hant" lang="zh-Hant">
          繁體中文
        </option>
      </select>
    </label>
  );
}
