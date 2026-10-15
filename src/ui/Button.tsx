import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { BUTTON_PRIMARY, BUTTON_QUIET } from './control-classes';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'quiet';
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: Readonly<ButtonProps>) {
  const variantClass = variant === 'quiet' ? BUTTON_QUIET : BUTTON_PRIMARY;
  return (
    <button type={type} className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
