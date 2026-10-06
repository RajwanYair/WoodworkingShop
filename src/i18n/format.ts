export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatNumberFixed(value: number, locale: string, fractionDigits: number): string {
  return formatNumber(value, locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatUnit(
  value: number,
  unit: NonNullable<Intl.NumberFormatOptions['unit']>,
  locale: string,
  options?: Omit<Intl.NumberFormatOptions, 'style' | 'unit' | 'unitDisplay'>,
): string {
  return new Intl.NumberFormat(locale, { ...options, style: 'unit', unit, unitDisplay: 'short' }).format(value);
}

export function formatMillimeters(value: number, locale: string, fractionDigits: number): string {
  return formatUnit(value, 'millimeter', locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatDate(
  value: Date | number | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}
