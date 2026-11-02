import { useMemo } from "react";
import en from "../locales/en.json";
import hi from "../locales/hi.json";

type Dictionary = typeof en;

const dictionaries: Record<"en" | "hi", Dictionary> = { en, hi };

function lookup(dictionary: Dictionary, path: string): string | undefined {
  let current: unknown = dictionary;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export type Translate = (key: string, values?: Record<string, string | number>) => string;

export function useTranslation(lang: "en" | "hi" = "en") {
  const t = useMemo<Translate>(() => {
    const dictionary = dictionaries[lang] ?? dictionaries.en;
    return (key, values) => {
      let text = lookup(dictionary, key) ?? key;
      if (values) {
        text = text.replace(/\{(\w+)\}/g, (match, name: string) =>
          name in values ? String(values[name]) : match
        );
      }
      return text;
    };
  }, [lang]);

  return { t };
}
