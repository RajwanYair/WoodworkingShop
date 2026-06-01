import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';

export function ActiveCabinetSwitcher() {
  const { t } = useTranslation();
  const { cabinets, activeCabinetIndex, setActiveCabinet } = useCabinetStore();

  if (cabinets.length <= 1) return null;

  return (
    <div className="border-wood-200 dark:border-wood-700 mb-4 flex flex-wrap items-center gap-1 rounded border p-2">
      <span className="text-wood-600 dark:text-wood-300 me-1 text-xs font-semibold uppercase">
        {t('project.title')}
      </span>
      {cabinets.map((cab, i) => (
        <button
          key={`${cab.name}-${i}`}
          onClick={() => setActiveCabinet(i)}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            i === activeCabinetIndex
              ? 'bg-wood-600 text-white'
              : 'bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700'
          }`}
          aria-current={i === activeCabinetIndex ? 'true' : undefined}
          title={cab.name}
        >
          {cab.name}
        </button>
      ))}
    </div>
  );
}
