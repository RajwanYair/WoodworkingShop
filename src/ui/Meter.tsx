interface MeterProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
}

export function Meter({ label, value, min = 0, max = 100 }: Readonly<MeterProps>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-wood-700 dark:text-wood-200">{label}</span>
      <meter min={min} max={max} value={value} className="h-3 w-full" aria-label={label}>
        {value}
      </meter>
    </label>
  );
}
