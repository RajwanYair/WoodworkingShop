/**
 * Sprint 75 — Machine profile selector drop-down + spec summary card.
 * Exported by WebSerialPanel to let users choose their CNC machine before
 * connecting. Profile selection is persisted in localStorage.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MACHINE_PROFILES,
  MACHINE_PROFILE_IDS,
  getDefaultMachineProfile,
  type MachineProfile,
} from '../../engine/machine-profiles';

const LS_KEY = 'cabinet-planner:machine-profile';

function loadSavedProfile(): MachineProfile {
  try {
    const id = localStorage.getItem(LS_KEY);
    if (id && id in MACHINE_PROFILES) return MACHINE_PROFILES[id as keyof typeof MACHINE_PROFILES];
  } catch {
    // localStorage unavailable (SSR / private mode)
  }
  return getDefaultMachineProfile();
}

function saveProfile(id: string) {
  try {
    localStorage.setItem(LS_KEY, id);
  } catch {
    // ignore
  }
}

interface Props {
  /** Called whenever the user selects a different profile. */
  onSelect: (profile: MachineProfile) => void;
}

export function MachineProfileSelector({ onSelect }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<MachineProfile>(loadSavedProfile);

  const handleChange = (id: string) => {
    const profile = MACHINE_PROFILES[id as keyof typeof MACHINE_PROFILES];
    if (!profile) return;
    setSelected(profile);
    saveProfile(id);
    onSelect(profile);
  };

  return (
    <div className="space-y-3">
      {/* Selector */}
      <label className="flex flex-col gap-1">
        <span className="text-wood-600 dark:text-wood-300 text-xs font-medium">{t('machine.selectProfile')}</span>
        <select
          value={selected.id}
          onChange={(e) => handleChange(e.target.value)}
          className="border-wood-300 dark:border-wood-600 dark:bg-wood-700 dark:text-wood-200 text-wood-800 focus:ring-wood-500 w-full rounded border bg-white px-2 py-1 text-sm focus:ring-2 focus:outline-none"
        >
          {MACHINE_PROFILE_IDS.map((id) => (
            <option key={id} value={id}>
              {MACHINE_PROFILES[id].name}
            </option>
          ))}
        </select>
      </label>

      {/* Spec summary */}
      <div className="bg-wood-50 dark:bg-wood-800/50 rounded p-3 text-xs">
        <p className="text-wood-500 dark:text-wood-400 mb-2">{selected.description}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-wood-400 dark:text-wood-500">{t('machine.firmware')}</dt>
          <dd className="text-wood-700 dark:text-wood-200 font-medium">{selected.firmware}</dd>

          <dt className="text-wood-400 dark:text-wood-500">{t('machine.baudRate')}</dt>
          <dd className="text-wood-700 dark:text-wood-200 font-medium">{selected.baudRate}</dd>

          <dt className="text-wood-400 dark:text-wood-500">{t('machine.feedRate')}</dt>
          <dd className="text-wood-700 dark:text-wood-200 font-medium">{selected.feedRate}</dd>

          <dt className="text-wood-400 dark:text-wood-500">{t('machine.plungeRate')}</dt>
          <dd className="text-wood-700 dark:text-wood-200 font-medium">{selected.plungeRate}</dd>

          <dt className="text-wood-400 dark:text-wood-500">{t('machine.spindleRpm')}</dt>
          <dd className="text-wood-700 dark:text-wood-200 font-medium">
            {selected.spindleRpm === 0 ? '—' : selected.spindleRpm.toLocaleString()}
          </dd>

          <dt className="text-wood-400 dark:text-wood-500">{t('machine.toolDiameter')}</dt>
          <dd className="text-wood-700 dark:text-wood-200 font-medium">{selected.toolDiameter} mm</dd>

          <dt className="text-wood-400 dark:text-wood-500">{t('machine.passDepth')}</dt>
          <dd className="text-wood-700 dark:text-wood-200 font-medium">{selected.passDepth} mm</dd>

          <dt className="text-wood-400 dark:text-wood-500">{t('machine.workHolding')}</dt>
          <dd className="text-wood-700 dark:text-wood-200 font-medium">{selected.workHolding}</dd>
        </dl>
      </div>
    </div>
  );
}
