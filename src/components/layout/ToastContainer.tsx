import { useToastStore, type ToastType } from '../../store/toast-store';

const icons: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };
const colors: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-wood-600',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 right-5 z-50 flex flex-col gap-2 max-w-xs" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${colors[t.type]} text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 text-sm animate-fade-in`}
        >
          <span className="font-bold text-base">{icons[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100 ml-1" aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
