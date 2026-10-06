import { useToastStore, type Toast, type ToastType } from '../../store/toast-store';
import { IconCheck, IconX, IconInfo } from './Icons';

const IconMap: Record<ToastType, React.ReactElement> = {
  success: <IconCheck size={16} />,
  error: <IconX size={16} />,
  info: <IconInfo size={16} />,
};
const iconColors: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-accent-text-dark',
};

function ToastList({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  return (
    <>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-fade-in bg-wood-900/90 flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-white shadow-[0_10px_30px_rgb(0_0_0/0.25)] ring-1 ring-white/10 backdrop-blur-xl"
        >
          <span className={`shrink-0 ${iconColors[t.type]}`}>{IconMap[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="ms-1 flex items-center opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <IconX size={14} />
          </button>
        </div>
      ))}
    </>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  if (toasts.length === 0) return null;

  const errorToasts = toasts.filter((t) => t.type === 'error');
  const otherToasts = toasts.filter((t) => t.type !== 'error');

  return (
    <div className="fixed inset-e-5 bottom-16 z-50 flex max-w-xs flex-col gap-2">
      {/* Errors announced immediately — assertive interrupts the screen reader */}
      <div role="alert" aria-live="assertive" aria-atomic="true">
        <ToastList toasts={errorToasts} removeToast={removeToast} />
      </div>
      {/* Success / info announced politely when the reader is idle */}
      <div role="status" aria-live="polite" aria-atomic="false">
        <ToastList toasts={otherToasts} removeToast={removeToast} />
      </div>
    </div>
  );
}
