// src/workers/cost-estimator.worker.ts
import { estimateCost } from '../engine/cost-estimator';
import type { OptimizationResult, HardwareItem } from '../engine/types';

export interface CostEstimatorWorkerInput {
  requestId: string;
  optimization: OptimizationResult;
  hardware: HardwareItem[];
  edgeBandingTotal: number;
  materialPriceOverrides: Record<string, number>;
  edgeBandingRate: number;
  hardwarePriceOverrides: Record<string, number>;
  labourRate: number;
  labourHours: number;
  finishCost: number;
}

export interface CostEstimatorWorkerOutput {
  type: 'done' | 'error';
  requestId: string;
  cost?: ReturnType<typeof estimateCost>;
  error?: string;
}

self.onmessage = (e: MessageEvent<CostEstimatorWorkerInput>) => {
  const data = e.data;
  try {
    const cost = estimateCost(
      data.optimization,
      data.hardware,
      data.edgeBandingTotal,
      data.materialPriceOverrides,
      data.edgeBandingRate,
      data.hardwarePriceOverrides,
      data.labourRate,
      data.labourHours,
      data.finishCost,
    );
    self.postMessage({ type: 'done', requestId: data.requestId, cost });
  } catch (error) {
    self.postMessage({ type: 'error', requestId: data.requestId, error: String(error) });
  }
};
