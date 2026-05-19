// src/workers/assembly.worker.ts
import { generateAssemblySteps } from '../engine/assembly';
import type { CabinetConfig } from '../engine/types';

export interface AssemblyWorkerInput {
  requestId: string;
  config: CabinetConfig;
}

export interface AssemblyWorkerOutput {
  type: 'done' | 'error';
  requestId: string;
  steps?: ReturnType<typeof generateAssemblySteps>;
  error?: string;
}

self.onmessage = (e: MessageEvent<AssemblyWorkerInput>) => {
  const data = e.data;
  try {
    const steps = generateAssemblySteps(data.config);
    self.postMessage({ type: 'done', requestId: data.requestId, steps });
  } catch (error) {
    self.postMessage({ type: 'error', requestId: data.requestId, error: String(error) });
  }
};
