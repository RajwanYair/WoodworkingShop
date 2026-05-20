import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import type { CabinetConfig } from '../../engine/types';
import { IconKitchen, IconWallUnit, IconWardrobe, IconBookshelf, IconBathroom } from '../layout/Icons';

interface Preset {
  key: string;
  icon: React.ReactElement;
  nameEn: string;
  nameHe: string;
  descEn: string;
  descHe: string;
  config: Partial<CabinetConfig>;
}

const PRESETS: Preset[] = [
  {
    key: 'kitchen-base',
    icon: <IconKitchen size={20} />,
    nameEn: 'Kitchen Base',
    nameHe: 'ארון בסיס מטבח',
    descEn: '600×720×550 mm — standard base unit with toe kick',
    descHe: '600×720×550 מ"מ — ארון בסיס עם כיכר רגל',
    config: {
      furnitureType: 'cabinet',
      width: 600,
      height: 720,
      depth: 550,
      shelfCount: 1,
      doorStyle: 'flat',
      doorCount: 1,
      drawerCount: 0,
      kickHeight: 100,
      handleStyle: 'bar',
      edgeBanding: 'all-visible',
      carcassMaterial: 'melamine-18',
      hasBack: true,
    },
  },
  {
    key: 'kitchen-wall',
    icon: <IconWallUnit size={20} />,
    nameEn: 'Kitchen Wall Unit',
    nameHe: 'ארון עליון מטבח',
    descEn: '600×700×300 mm — standard overhead cabinet',
    descHe: '600×700×300 מ"מ — ארון קיר תקני',
    config: {
      furnitureType: 'cabinet',
      width: 600,
      height: 700,
      depth: 300,
      shelfCount: 2,
      doorStyle: 'flat',
      doorCount: 2,
      drawerCount: 0,
      kickHeight: 0,
      handleStyle: 'bar',
      edgeBanding: 'all-visible',
      carcassMaterial: 'melamine-18',
      hasBack: true,
    },
  },
  {
    key: 'tall-pantry',
    icon: <IconWardrobe size={20} />,
    nameEn: 'Tall Pantry',
    nameHe: 'ארון מזווה גבוה',
    descEn: '600×2000×550 mm — full-height storage',
    descHe: '600×2000×550 מ"מ — ארון אחסון גובה מלא',
    config: {
      furnitureType: 'cabinet',
      width: 600,
      height: 2000,
      depth: 550,
      shelfCount: 4,
      doorStyle: 'flat',
      doorCount: 2,
      drawerCount: 0,
      kickHeight: 100,
      handleStyle: 'bar',
      edgeBanding: 'all-visible',
      carcassMaterial: 'melamine-18',
      hasBack: true,
    },
  },
  {
    key: 'bookcase',
    icon: <IconBookshelf size={20} />,
    nameEn: 'Bookcase',
    nameHe: 'כוננית ספרים',
    descEn: '800×1800×300 mm — open bookshelf',
    descHe: '800×1800×300 מ"מ — כוננית פתוחה',
    config: {
      furnitureType: 'bookshelf',
      width: 800,
      height: 1800,
      depth: 300,
      shelfCount: 5,
      doorStyle: 'none',
      doorCount: 1,
      drawerCount: 0,
      kickHeight: 0,
      handleStyle: 'none',
      edgeBanding: 'all-visible',
      carcassMaterial: 'plywood-18',
      hasBack: true,
    },
  },
  {
    key: 'wardrobe-double',
    icon: <IconWardrobe size={20} />,
    nameEn: 'Double Wardrobe',
    nameHe: 'ארון בגדים כפול',
    descEn: '1200×2200×600 mm — two-door hanging wardrobe',
    descHe: '1200×2200×600 מ"מ — ארון תלייה דו-דלתי',
    config: {
      furnitureType: 'wardrobe',
      width: 1200,
      height: 2200,
      depth: 600,
      shelfCount: 1,
      doorStyle: 'flat',
      doorCount: 2,
      drawerCount: 0,
      kickHeight: 100,
      handleStyle: 'bar',
      edgeBanding: 'all-visible',
      carcassMaterial: 'melamine-18',
      hasBack: true,
    },
  },
  {
    key: 'bathroom-vanity',
    icon: <IconBathroom size={20} />,
    nameEn: 'Bathroom Vanity',
    nameHe: 'ארון אמבטיה',
    descEn: '800×850×450 mm — with drawers, soft-close',
    descHe: '800×850×450 מ"מ — עם מגירות, סגירה רכה',
    config: {
      furnitureType: 'cabinet',
      width: 800,
      height: 850,
      depth: 450,
      shelfCount: 0,
      doorStyle: 'flat',
      doorCount: 2,
      drawerCount: 2,
      kickHeight: 150,
      handleStyle: 'knob',
      edgeBanding: 'all-visible',
      carcassMaterial: 'mdf-18',
      hasBack: true,
    },
  },
];

export function PresetsPanel() {
  const { i18n } = useTranslation();
  const { setConfig } = useCabinetStore();
  const isHe = i18n.language === 'he';

  return (
    <fieldset className="space-y-3">
      <legend className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        {isHe ? 'תבניות מהירות' : 'Quick Presets'}
      </legend>

      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setConfig(p.config)}
            className="border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-800 hover:bg-wood-100 dark:hover:bg-wood-700 flex flex-col items-start gap-0.5 rounded border px-3 py-2 text-left transition-colors"
            title={isHe ? p.descHe : p.descEn}
          >
            <span className="text-wood-600 dark:text-wood-300 leading-none">{p.icon}</span>
            <span className="text-wood-700 dark:text-wood-200 mt-1 text-xs leading-tight font-medium">
              {isHe ? p.nameHe : p.nameEn}
            </span>
            <span className="text-wood-600 dark:text-wood-300 text-[10px] leading-tight">
              {isHe ? p.descHe : p.descEn}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
