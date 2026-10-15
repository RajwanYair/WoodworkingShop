import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { TOOLBAR_ICON_BUTTON, TOOLBAR_ICON_BUTTON_COMPACT } from './control-classes';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: 'toolbar' | 'toolbarCompact';
};

export function IconButton({
  label,
  children,
  variant = 'toolbar',
  className = '',
  type = 'button',
  ...props
}: Readonly<IconButtonProps>) {
  const variantClass = variant === 'toolbarCompact' ? TOOLBAR_ICON_BUTTON_COMPACT : TOOLBAR_ICON_BUTTON;
  return (
    <button type={type} className={`${variantClass} ${className}`.trim()} aria-label={label} {...props}>
      {children}
    </button>
  );
}
