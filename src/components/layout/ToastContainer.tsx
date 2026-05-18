import { useToastStore, type Toast, type ToastType } from '../../store/toast-store';
import { IconCheck, IconX, IconInfo } from './Icons';

const IconMap: Record<ToastType, React.ReactElement> = {
  success: <IconCheck size={16} />,
  error: <IconX size={16} />,
  info: <IconInfo size={16} />,
};
const colors: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-wood-600',
};

function ToastList({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  return (
    <>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${colors[t.type]} text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 text-sm animate-fade-in`}
        >
          <span className="shrink-0">{IconMap[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="opacity-70 hover:opacity-100 ms-1 flex items-center"
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
    <div className="fixed bottom-16 end-5 z-50 flex flex-col gap-2 max-w-xs">
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
