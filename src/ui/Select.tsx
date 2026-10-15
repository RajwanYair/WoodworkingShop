import type { ReactNode, SelectHTMLAttributes } from 'react';
import { FIELD_CONTROL } from './control-classes';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
};

export function Select({ label, id, className = '', children, ...props }: Readonly<SelectProps>) {
  const fieldId = id ?? label.replaceAll(/\s+/g, '-').toLowerCase();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-wood-700 dark:text-wood-200 text-sm font-medium">
        {label}
      </label>
      <select id={fieldId} className={`${FIELD_CONTROL} ${className}`.trim()} {...props}>
        {children}
      </select>
    </div>
  );
}
