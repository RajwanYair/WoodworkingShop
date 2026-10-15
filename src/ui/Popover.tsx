import { useId, useState, type ReactNode } from 'react';

interface PopoverProps {
  label: string;
  children: ReactNode;
  content: ReactNode;
}

function popoverSupported(): boolean {
  return typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;
}

export function Popover({ label, children, content }: Readonly<PopoverProps>) {
  const id = useId().replaceAll(':', '');
  const supported = popoverSupported();
  const [open, setOpen] = useState(false);

  if (!supported) {
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          className="min-h-11"
          onClick={() => setOpen((value) => !value)}
        >
          {children}
        </button>
        {open ? (
          <span
            id={id}
            role="tooltip"
            className="bg-wood-900 absolute top-full z-20 mt-1 rounded-lg px-3 py-2 text-sm text-white"
          >
            {content}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="inline-flex">
      <button type="button" className="min-h-11" popoverTarget={id} aria-label={label}>
        {children}
      </button>
      <span id={id} popover="auto" className="bg-wood-900 rounded-lg px-3 py-2 text-sm text-white">
        {content}
      </span>
    </span>
  );
}
