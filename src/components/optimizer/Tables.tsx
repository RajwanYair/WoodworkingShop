import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
import type { Lang } from '../../engine/types';

export function PartsTable() {
  const { t, i18n } = useTranslation();
  const { parts } = useCabinetStore();
  const lang = i18n.language as Lang;

  return (
    <div className="overflow-x-auto">
      <h3 className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide mb-2">
        {t('parts.title')}
      </h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-300">
            <th className="px-2 py-1 text-start">{t('parts.id')}</th>
            <th className="px-2 py-1 text-start">{t('parts.name')}</th>
            <th className="px-2 py-1 text-end">{t('parts.qty')}</th>
            <th className="px-2 py-1 text-start">{t('parts.material')}</th>
            <th className="px-2 py-1 text-end">{t('parts.length')}</th>
            <th className="px-2 py-1 text-end">{t('parts.width')}</th>
            <th className="px-2 py-1 text-end">{t('parts.thickness')}</th>
            <th className="px-2 py-1 text-start">{t('parts.edge')}</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => {
            const mat = getMaterial(p.material);
            return (
              <tr key={p.id} className="border-b border-wood-100 dark:border-wood-800">
                <td className="px-2 py-1 font-mono">{p.id}</td>
                <td className="px-2 py-1">{p.name[lang]}</td>
                <td className="px-2 py-1 text-end">{p.qty}</td>
                <td className="px-2 py-1">{mat.name[lang]}</td>
                <td className="px-2 py-1 text-end">{p.length}</td>
                <td className="px-2 py-1 text-end">{p.width}</td>
                <td className="px-2 py-1 text-end">{p.thickness}</td>
                <td className="px-2 py-1">{p.edgeBanding[lang]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function HardwareTable() {
  const { t, i18n } = useTranslation();
  const { hardware } = useCabinetStore();
  const lang = i18n.language as Lang;

  return (
    <div className="overflow-x-auto">
      <h3 className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide mb-2">
        {t('hardware.title')}
      </h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-300">
            <th className="px-2 py-1 text-start">{t('hardware.name')}</th>
            <th className="px-2 py-1 text-end">{t('hardware.qty')}</th>
            <th className="px-2 py-1 text-start">{t('hardware.unit')}</th>
          </tr>
        </thead>
        <tbody>
          {hardware.map((h) => (
            <tr key={h.id} className="border-b border-wood-100 dark:border-wood-800">
              <td className="px-2 py-1">{h.name[lang]}</td>
              <td className="px-2 py-1 text-end">{h.qty}</td>
              <td className="px-2 py-1">{h.unit[lang]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
