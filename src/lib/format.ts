import type { Locale } from "../../shared/types";

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "az" ? "az-AZ" : "en-US").format(
    value,
  );
}

export function formatTime(
  value: string | null,
  locale: Locale,
  empty: string,
) {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale === "az" ? "az-AZ" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function compactNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "az" ? "az-AZ" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
