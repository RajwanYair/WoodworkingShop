import type { KeyboardEvent, ReactNode } from 'react';

interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

interface TabsProps {
  label: string;
  tabs: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
}

export function Tabs({ label, tabs, value, onChange }: Readonly<TabsProps>) {
  const selected = tabs.findIndex((tab) => tab.id === value);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const last = tabs.length - 1;
    const steps: Record<string, number> = {
      Home: 0,
      End: last,
      ArrowRight: (selected + 1) % tabs.length,
      ArrowLeft: (selected - 1 + tabs.length) % tabs.length,
    };
    const next = steps[event.key];
    onChange(tabs[next].id);
  }

  return (
    <div>
      <div role="tablist" aria-label={label} tabIndex={-1} className="flex gap-1" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              className={`min-h-11 rounded-full px-3 text-sm ${active ? 'bg-accent text-white' : 'text-wood-700 dark:text-wood-200'}`}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== value}
          className="panel-stack pt-3"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
