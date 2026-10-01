// src/workers/cost-estimator.worker.ts — Sprint 60 / Phase 17 Comlink RPC
import * as Comlink from 'comlink';
import { estimateCost } from '../engine/cost-estimator';
import type { CostBreakdown } from '../engine/cost-estimator';
import type { OptimizationResult, HardwareItem, Material } from '../engine/types';

export interface CostEstimatorInput {
  optimization: OptimizationResult;
  hardware: HardwareItem[];
  edgeBandingTotal: number;
  materialPriceOverrides: Record<string, number>;
  edgeBandingRate: number;
  hardwarePriceOverrides: Record<string, number>;
  labourRate: number;
  labourHours: number;
  finishCost: number;
  extraMaterials?: Material[];
}

export interface CostEstimatorResult {
  cost: CostBreakdown;
}

export interface CostEstimatorWorkerApi {
  run(input: CostEstimatorInput): CostEstimatorResult;
}

const api: CostEstimatorWorkerApi = {
  run({
    optimization,
    hardware,
    edgeBandingTotal,
    materialPriceOverrides,
    edgeBandingRate,
    hardwarePriceOverrides,
    labourRate,
    labourHours,
    finishCost,
    extraMaterials = [],
  }: CostEstimatorInput): CostEstimatorResult {
    return {
      cost: estimateCost(
        optimization,
        hardware,
        edgeBandingTotal,
        materialPriceOverrides,
        edgeBandingRate,
        hardwarePriceOverrides,
        labourRate,
        labourHours,
        finishCost,
        extraMaterials,
      ),
    };
  },
};

Comlink.expose(api);
