import type { CabinetConfig } from '../engine/types';
import { idbLoadConfigs, idbSaveConfigs } from './indexed-db-storage';

export interface SavedConfig {
  id: string;
  name: string;
  config: CabinetConfig;
  savedAt: string; // ISO date
}

async function loadAll(): Promise<SavedConfig[]> {
  return idbLoadConfigs<SavedConfig>();
}

async function saveAll(configs: SavedConfig[]): Promise<void> {
  await idbSaveConfigs(configs);
}

/** Load all saved configurations */
export async function loadSavedConfigs(): Promise<SavedConfig[]> {
  return loadAll();
}

/** Save a configuration with a name */
export async function saveConfig(name: string, config: CabinetConfig): Promise<SavedConfig> {
  const configs = await loadAll();
  const entry: SavedConfig = {
    id: crypto.randomUUID(),
    name,
    config,
    savedAt: new Date().toISOString(),
  };
  configs.push(entry);
  await saveAll(configs);
  return entry;
}

/** Delete a saved configuration by ID */
export async function deleteSavedConfig(id: string): Promise<void> {
  const configs = (await loadAll()).filter((c) => c.id !== id);
  await saveAll(configs);
}
