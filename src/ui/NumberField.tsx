import type { InputHTMLAttributes } from 'react';
import { formatDim, type UnitSystem } from '../utils/units';
import { Field } from './Field';

type NumberFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  label: string;
  value: number;
  units: UnitSystem;
  onValueChange: (value: number) => void;
};

export function NumberField({ label, value, units, onValueChange, ...props }: Readonly<NumberFieldProps>) {
  return (
    <Field
      {...props}
      label={label}
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : ''}
      hint={formatDim(value, units)}
      onChange={(event) => {
        const next = event.currentTarget.valueAsNumber;
        if (Number.isFinite(next)) onValueChange(next);
      }}
    />
  );
}
