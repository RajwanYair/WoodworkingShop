import type { CabinetConfig } from '../engine/types';

const STORAGE_KEY = 'cabinet-planner-saved-configs';

export interface SavedConfig {
  id: string;
  name: string;
  config: CabinetConfig;
  savedAt: string; // ISO date
}

/** Load all saved configurations */
export function loadSavedConfigs(): SavedConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** Save a configuration with a name */
export function saveConfig(name: string, config: CabinetConfig): SavedConfig {
  const configs = loadSavedConfigs();
  const entry: SavedConfig = {
    id: crypto.randomUUID(),
    name,
    config,
    savedAt: new Date().toISOString(),
  };
  configs.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  return entry;
}

/** Delete a saved configuration by ID */
export function deleteSavedConfig(id: string): void {
  const configs = loadSavedConfigs().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}
