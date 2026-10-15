import type { InputHTMLAttributes, ReactNode } from 'react';
import { FIELD_CONTROL } from './control-classes';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
};

export function Field({ label, hint, id, className = '', ...props }: Readonly<FieldProps>) {
  const fieldId = id ?? label.replaceAll(/\s+/g, '-').toLowerCase();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-wood-700 dark:text-wood-200 text-sm font-medium">
        {label}
      </label>
      <input id={fieldId} className={`${FIELD_CONTROL} ${className}`.trim()} {...props} />
      {hint ? <p className="text-wood-500 text-xs">{hint}</p> : null}
    </div>
  );
}
