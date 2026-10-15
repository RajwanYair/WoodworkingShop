import type { ButtonHTMLAttributes } from 'react';

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'role' | 'aria-checked' | 'onChange'> & {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({ label, checked, onCheckedChange, className = '', ...props }: Readonly<SwitchProps>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`border-wood-300 dark:border-wood-600 inline-flex min-h-11 items-center gap-3 rounded-full border px-3 py-1 text-sm ${className}`.trim()}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={`h-5 w-9 rounded-full ${checked ? 'bg-accent' : 'bg-wood-300 dark:bg-wood-600'}`}
      />
      {label}
    </button>
  );
}
