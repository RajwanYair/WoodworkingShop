// src/workers/assembly.worker.ts — Sprint 60 / Phase 17 Comlink RPC
import * as Comlink from 'comlink';
import { generateAssemblySteps } from '../engine/assembly/assembly';
import type { AssemblyStep } from '../engine/assembly/assembly';
import type { CabinetConfig } from '../engine/core/types';

export interface AssemblyInput {
  config: CabinetConfig;
}

export interface AssemblyResult {
  steps: AssemblyStep[];
}

export interface AssemblyWorkerApi {
  run(input: AssemblyInput): AssemblyResult;
}

const api: AssemblyWorkerApi = {
  run({ config }: AssemblyInput): AssemblyResult {
    return { steps: generateAssemblySteps(config) };
  },
};

Comlink.expose(api);
