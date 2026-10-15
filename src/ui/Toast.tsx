interface ToastProps {
  message: string;
  tone?: 'info' | 'success' | 'error';
}

export function Toast({ message, tone = 'info' }: Readonly<ToastProps>) {
  const assertive = tone === 'error';
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      className="bg-wood-900 rounded-lg px-4 py-3 text-sm text-white"
    >
      {message}
    </div>
  );
}
