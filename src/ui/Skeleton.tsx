interface SkeletonProps {
  label: string;
}

export function Skeleton({ label }: Readonly<SkeletonProps>) {
  return (
    <div
      role="status"
      aria-label={label}
      className="border-wood-200 dark:border-wood-700 space-y-3 rounded-lg border p-4"
    >
      <div className="bg-wood-200 dark:bg-wood-700 h-5 w-2/3 animate-pulse rounded" />
      <div className="bg-wood-200 dark:bg-wood-700 h-4 w-full animate-pulse rounded" />
      <div className="bg-wood-200 dark:bg-wood-700 h-4 w-3/4 animate-pulse rounded" />
    </div>
  );
}
