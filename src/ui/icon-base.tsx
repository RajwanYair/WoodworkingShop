import type { ReactNode } from 'react';

export type IconProps = {
  className?: string;
  size?: number;
  'aria-label'?: string;
};

export function Icon({
  children,
  className = '',
  size = 16,
  'aria-label': ariaLabel,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaLabel ? undefined : 'true'}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      {children}
    </svg>
  );
}
