export interface CuratedBarrelPlan {
  barrelTexts: Map<string, string>;
  rootText: string;
  explicitResolutions: string[];
}

export function buildCuratedBarrelPlan(
  rootText: string,
  existingBarrels?: Readonly<Record<string, string>>,
): CuratedBarrelPlan;
