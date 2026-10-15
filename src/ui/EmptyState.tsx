import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: Readonly<EmptyStateProps>) {
  return (
    <div className="border-wood-200 dark:border-wood-700 flex flex-col items-start gap-2 rounded-xl border p-4">
      <h2 className="text-wood-800 dark:text-wood-100 text-base font-semibold">{title}</h2>
      <p className="text-wood-600 dark:text-wood-300 text-sm">{description}</p>
      {action}
    </div>
  );
}
