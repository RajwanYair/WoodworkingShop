import { expect, test } from './fixtures/app';
import { calculateBoxJoint } from '../../src/engine/box-joint';
import { calculateCabinetDoor } from '../../src/engine/cabinet-door';
import { calculateCoveCut } from '../../src/engine/cove-cut';
import { calculateCrownMoulding } from '../../src/engine/crown-moulding';
import { calculateDadoRabbet } from '../../src/engine/dado-rabbet';
import { calculateDrawerBox } from '../../src/engine/drawer-box';
import { calculateFaceFrame } from '../../src/engine/face-frame';
import { calculateFinish, computeFinishAreaM2 } from '../../src/engine/finish-calculator';
import { calculateFinishingCoat } from '../../src/engine/finishing-coat';
import { calculateFramePanel } from '../../src/engine/frame-panel';
import { calculateGlueCoverage, GLUE_COVERAGE_LIMITS } from '../../src/engine/glue-coverage';
import { calculateHalfLap } from '../../src/engine/half-lap';
import { calculateHoningGuide } from '../../src/engine/honing-guide';
import { calculateKerfBending } from '../../src/engine/kerf-bending';
import { calculateMoistureShrinkage } from '../../src/engine/moisture-shrinkage';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { calculatePlanerPasses } from '../../src/engine/planer-passes';
import { generateParts } from '../../src/engine/parts';
import { calculateRafterLength } from '../../src/engine/rafter-length';
import { calculateRouterCircle } from '../../src/engine/router-circle';
import { calculateRouterTemplate } from '../../src/engine/router-template';
import { calculateScrewPullout } from '../../src/engine/screw-pullout';
import { calculateSplineJoint } from '../../src/engine/spline-joint';
import { calculateStairStringer } from '../../src/engine/stair-stringer';
import { calculateTaperJig } from '../../src/engine/taper-jig';
import { calculateWoodTurning } from '../../src/engine/wood-turning';

const calculatorNames = [
  'Finish Calculator',
  'Face Frame Calculator',
  'Cabinet Door Sizing Calculator',
  'Drawer Box Sizing Calculator',
  'Screw Pull-Out Strength Estimator',
  'Kerf Bending Calculator',
  'Dado / Rabbet Joint Calculator',
  'Finishing Coat Calculator',
  'Wood Turning Speed Calculator',
  'Frame and Panel Calculator',
  'Taper Jig Calculator',
  'Stair Stringer Calculator',
  'Box Joint Calculator',
  'Wood Glue Coverage Calculator',
  'Lumber Planer Pass Calculator',
  'Honing Guide Calculator',
  'Crown Moulding Cut Calculator',
  'Router Circle Jig Calculator',
  'Cove Cut (Table Saw)',
  'Moisture Content & Shrinkage',
  'Rafter Length & Birdsmouth',
  'Router Template Offset',
  'Half-Lap Joint',
  'Spline Joint',
] as const;

const finishOptions = [
  ['Primer', 'primer', 'Apply primer before top coats for better adhesion.'],
  ['Stain', 'stain', 'Sand lightly between stain coats. Wipe excess immediately.'],
  ['Paint', 'paint', 'Use a foam roller for panels; brush for edges and details.'],
  ['Varnish', 'varnish', 'Allow each varnish coat to cure fully before sanding back.'],
  ['Oil', 'oil', 'Danish oil penetrates the grain; wipe off surplus after 20 min.'],
  ['Lacquer', 'lacquer', 'Apply lacquer in thin, even passes in a dust-free environment.'],
] as const;

async function openCalculator(page: import('@playwright/test').Page, name: string) {
  await page.keyboard.press('Alt+6');
  await page.getByRole('button', { name }).click();
  return page.getByRole('region', { name });
}

test('every calculator expands to a numeric result with units and collapses again', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+6');
  await expect(page.getByRole('heading', { name: 'Calculators' })).toBeVisible();

  for (const name of calculatorNames) {
    const toggle = page.getByRole('button', { name });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();

    const calculator = page.getByRole('region', { name });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(calculator).toContainText(/\d/);
    await expect(calculator).toContainText(/(?:mm|cm|m[²³]|rpm|mL|°|%|L)/i);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(calculator).toHaveCount(0);
  }
});

test('finish options reconcile area, required volume, and can sizes with the engine', async ({ appPage: page }) => {
  const areaM2 = computeFinishAreaM2(generateParts(DEFAULT_CONFIG));
  const calculator = await openCalculator(page, 'Finish Calculator');
  const litres = calculator.getByText(/^\d+\.\d{2} L$/);
  const recommendation = calculator.locator('p.italic');
  let previousRecommendation = await recommendation.textContent();

  for (const [label, finishType, expectedRecommendation] of finishOptions) {
    const option = calculator.getByRole('button', { name: label });
    await option.click();

    const expected = calculateFinish(areaM2, finishType);
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    await expect(calculator).toContainText(`${areaM2.toFixed(2)} m²`);
    await expect(litres).toHaveText(`${expected.litresNeeded.toFixed(2)} L`);
    await expect(recommendation).toHaveText(expectedRecommendation);
    for (const can of expected.canSizes) {
      await expect(calculator.getByText(`${can.count}×${can.size}L`, { exact: true })).toBeVisible();
    }
    await expect(calculator).toContainText(`total ${expected.totalCanLitres.toFixed(2)} L`);
    if (label !== 'Paint') expect(await recommendation.textContent()).not.toBe(previousRecommendation);
    previousRecommendation = expectedRecommendation;
  }

  await calculator.getByRole('button', { name: 'Paint' }).click();
  const coats = calculator.getByRole('slider', { name: /coats/i });
  await coats.focus();
  await coats.press('Home');
  for (const coatCount of [1, 2, 3, 4, 5]) {
    const expected = calculateFinish(areaM2, 'paint', coatCount);
    await expect(coats).toHaveValue(String(coatCount));
    await expect(litres).toHaveText(`${expected.litresNeeded.toFixed(2)} L`);
    if (coatCount < 5) await coats.press('ArrowRight');
  }
});

test('face frame widths reconcile opening dimensions with the engine', async ({ appPage: page }) => {
  const expectedInitial = calculateFaceFrame({ cabinetWidthMm: 600, cabinetHeightMm: 720 });
  const expectedWide = calculateFaceFrame({ cabinetWidthMm: 700, cabinetHeightMm: 720 });
  const calculator = await openCalculator(page, 'Face Frame Calculator');
  const width = calculator.getByRole('spinbutton', { name: /cabinet width/i });
  await expect(calculator).toContainText(`${expectedInitial.openingWidthMm.toFixed(1)} mm`);

  await width.fill('700');

  await expect(width).toHaveValue('700');
  await expect(calculator).toContainText(`${expectedWide.openingWidthMm.toFixed(1)} mm`);

  const openingCount = calculator.getByRole('slider');
  for (const count of [1, 2, 3, 4]) {
    const expected = calculateFaceFrame({ cabinetWidthMm: 700, cabinetHeightMm: 720, openingCount: count });
    await openingCount.fill(String(count));
    await expect(calculator).toContainText(`${expected.openingHeightMm.toFixed(1)} mm`);
  }
});

test('numeric input typing, arrow stepping, and clearing never leak invalid results', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Face Frame Calculator');
  const width = calculator.getByRole('spinbutton', { name: /cabinet width/i });

  await width.press('Control+A');
  await width.pressSequentially('700');
  await expect(width).toHaveValue('700');
  await expect(calculator).toContainText(
    `${calculateFaceFrame({ cabinetWidthMm: 700, cabinetHeightMm: 720 }).openingWidthMm.toFixed(1)} mm`,
  );
  await expect(calculator).not.toContainText(/NaN|Infinity/);

  await width.press('ArrowUp');
  await expect(width).toHaveValue('701');
  await expect(calculator).toContainText(
    `${calculateFaceFrame({ cabinetWidthMm: 701, cabinetHeightMm: 720 }).openingWidthMm.toFixed(1)} mm`,
  );
  await width.press('ArrowDown');
  await expect(width).toHaveValue('700');
  await expect(calculator).toContainText(
    `${calculateFaceFrame({ cabinetWidthMm: 700, cabinetHeightMm: 720 }).openingWidthMm.toFixed(1)} mm`,
  );

  await width.press('Control+A');
  await width.press('Backspace');
  await expect(width).toHaveValue('0');
  await expect(calculator.getByRole('alert')).toContainText('cabinetWidthMm must be > 0');
  await expect(calculator).not.toContainText(/NaN|Infinity/);
});

test('glue quantity and type reconcile volume and cure schedule with the engine', async ({ appPage: page }) => {
  const initial = calculateGlueCoverage({ surfaceAreaMm2: 50000, jointCount: 1, glueType: 'pva' });
  const polyurethane = calculateGlueCoverage({ surfaceAreaMm2: 50000, jointCount: 2, glueType: 'polyurethane' });
  const calculator = await openCalculator(page, 'Wood Glue Coverage Calculator');
  await expect(calculator).toContainText(`${initial.netVolumeMl} mL`);

  await calculator.getByRole('spinbutton', { name: /number of joints/i }).fill('2');
  await calculator.getByRole('combobox', { name: /glue type/i }).selectOption('polyurethane');

  await expect(calculator).toContainText(`${polyurethane.netVolumeMl} mL`);
  await expect(calculator).toContainText(`${polyurethane.recommendedVolumeMl} mL`);
  await expect(calculator).toContainText(`${polyurethane.openTimeMin} min`);
  await expect(calculator).toContainText(`${polyurethane.cureTimeHours} h`);

  for (const glueType of ['pva', 'polyurethane', 'epoxy', 'hide', 'ca'] as const) {
    const expected = calculateGlueCoverage({ surfaceAreaMm2: 50000, jointCount: 2, glueType });
    await calculator.getByRole('combobox', { name: /glue type/i }).selectOption(glueType);
    await expect(calculator).toContainText(`${expected.netVolumeMl} mL`);
    await expect(calculator).toContainText(`${expected.recommendedVolumeMl} mL`);
    await expect(calculator).toContainText(`${expected.openTimeMin} min`);
    await expect(calculator).toContainText(`${expected.cureTimeHours} h`);
  }

  const surfaceArea = calculator.getByRole('spinbutton', { name: /surface area/i });
  const jointCount = calculator.getByRole('spinbutton', { name: /number of joints/i });
  const invalidInputs = [
    [surfaceArea, String(GLUE_COVERAGE_LIMITS.surfaceAreaMm2.min - 1)],
    [surfaceArea, String(GLUE_COVERAGE_LIMITS.surfaceAreaMm2.max + 1)],
    [jointCount, String(GLUE_COVERAGE_LIMITS.jointCount.max + 1)],
    [jointCount, String(GLUE_COVERAGE_LIMITS.jointCount.min + 0.5)],
  ] as const;

  for (const [input, value] of invalidInputs) {
    await input.fill(value);
    await expect(calculator.getByRole('alert')).toBeVisible();
    await expect(calculator).not.toContainText(/NaN|Infinity/);
  }

  await surfaceArea.fill('50000');
  await jointCount.fill('2');
  await calculator.getByRole('combobox', { name: /glue type/i }).selectOption('polyurethane');
  await expect(calculator.getByRole('alert')).toHaveCount(0);
  await expect(calculator).toContainText(`${polyurethane.netVolumeMl} mL`);
});

test('kerf material selection reconciles kerf geometry with the engine', async ({ appPage: page }) => {
  const plywood = calculateKerfBending({ thicknessMm: 18, bendRadiusMm: 150, kerfWidthMm: 3.2, material: 'plywood' });
  const hardwood = calculateKerfBending({ thicknessMm: 18, bendRadiusMm: 150, kerfWidthMm: 3.2, material: 'hardwood' });
  const calculator = await openCalculator(page, 'Kerf Bending Calculator');
  await expect(calculator.getByText(String(plywood.kerfCount), { exact: true })).toBeVisible();
  await calculator.getByRole('button', { name: 'Hardwood' }).click();
  await expect(calculator.getByText(String(hardwood.kerfCount), { exact: true })).toBeVisible();
  await expect(calculator).toContainText(`${hardwood.kerfSpacingMm.toFixed(1)} mm`);

  for (const [material, label] of [
    ['plywood', 'Plywood'],
    ['mdf', 'MDF'],
    ['softwood', 'Softwood'],
    ['hardwood', 'Hardwood'],
  ] as const) {
    const expected = calculateKerfBending({ thicknessMm: 18, bendRadiusMm: 150, kerfWidthMm: 3.2, material });
    await calculator.getByRole('button', { name: label }).click();
    await expect(calculator.getByText(String(expected.kerfCount), { exact: true })).toBeVisible();
    await expect(calculator).toContainText(`${expected.kerfSpacingMm.toFixed(1)} mm`);
  }

  await calculator.getByRole('spinbutton', { name: 'Panel Thickness (mm)' }).fill('3');
  await expect(calculator.getByRole('alert')).toContainText('Bend radius too tight');
  await expect(calculator.getByText('Number of Kerfs')).toHaveCount(0);
});

test('grain direction reconciles shrinkage and invalid dimensions report an error', async ({ appPage: page }) => {
  const tangential = calculateMoistureShrinkage({
    initialMCPct: 25,
    targetMCPct: 8,
    species: 'oak',
    dimensionMm: 200,
    grain: 'tangential',
  });
  const radial = calculateMoistureShrinkage({
    initialMCPct: 25,
    targetMCPct: 8,
    species: 'oak',
    dimensionMm: 200,
    grain: 'radial',
  });
  const calculator = await openCalculator(page, 'Moisture Content & Shrinkage');
  await expect(calculator).toContainText(`${tangential.finalDimensionMm.toFixed(2)} mm`);
  await calculator.getByLabel(/grain direction/i).selectOption('radial');
  await expect(calculator).toContainText(`${radial.finalDimensionMm.toFixed(2)} mm`);

  for (const species of [
    'oak',
    'maple',
    'cherry',
    'walnut',
    'pine',
    'douglas_fir',
    'cedar',
    'generic_hardwood',
    'generic_softwood',
  ] as const) {
    const expected = calculateMoistureShrinkage({
      initialMCPct: 25,
      targetMCPct: 8,
      species,
      dimensionMm: 200,
      grain: 'radial',
    });
    await calculator.getByLabel(/species/i).selectOption(species);
    await expect(calculator).toContainText(`${expected.finalDimensionMm.toFixed(2)} mm`);
  }

  const spinbuttons = calculator.getByRole('spinbutton');
  const initialMC = spinbuttons.nth(0);
  const targetMC = spinbuttons.nth(1);
  const dimension = spinbuttons.nth(2);

  await initialMC.fill('101');
  await expect(calculator.getByRole('alert')).toContainText('initialMCPct must be >= 0 and <= 100');
  await initialMC.fill('25');
  await expect(calculator.getByRole('alert')).toHaveCount(0);

  await targetMC.fill('101');
  await expect(calculator.getByRole('alert')).toContainText('targetMCPct must be >= 0 and <= 100');
  await targetMC.fill('8');
  await expect(calculator.getByRole('alert')).toHaveCount(0);

  await dimension.fill('3001');
  await expect(calculator.getByRole('alert')).toContainText('dimensionMm must be >= 1 and <= 3000');
  await dimension.fill('200');
  await calculator.getByLabel(/species/i).selectOption('oak');
  await expect(calculator.getByRole('alert')).toHaveCount(0);
  await expect(calculator).toContainText(`${radial.finalDimensionMm.toFixed(2)} mm`);

  await calculator.getByLabel(/dimension/i).fill('0');
  await expect(calculator.getByRole('alert')).toContainText('dimensionMm must be >= 1 and <= 3000');
  await expect(calculator).not.toContainText(`${radial.finalDimensionMm.toFixed(2)} mm`);
});

test('cabinet door count and overlay reconcile dimensions and hinges with the engine', async ({ appPage: page }) => {
  const fullOverlay = calculateCabinetDoor({
    openingWidthMm: 550,
    openingHeightMm: 700,
    doorCount: 1,
    overlay: 'full',
  });
  const doubleFull = calculateCabinetDoor({
    openingWidthMm: 550,
    openingHeightMm: 700,
    doorCount: 2,
    overlay: 'full',
  });
  const doubleInset = calculateCabinetDoor({
    openingWidthMm: 550,
    openingHeightMm: 700,
    doorCount: 2,
    overlay: 'inset',
  });
  const calculator = await openCalculator(page, 'Cabinet Door Sizing Calculator');
  await expect(calculator).toContainText(`${fullOverlay.doorLeaf.widthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(String(fullOverlay.hingeCount));

  await calculator.getByRole('button', { name: '2 doors' }).click();
  await expect(calculator).toContainText(`${doubleFull.doorLeaf.widthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(String(doubleFull.hingeCount));
  await calculator.getByRole('button', { name: 'Inset' }).click();
  await expect(calculator).toContainText(`${doubleInset.doorLeaf.widthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(`${doubleInset.doorLeaf.heightMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(String(doubleInset.hingeCount));
});

test('every cabinet door count and overlay combination reconciles with the engine', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Cabinet Door Sizing Calculator');
  for (const doorCount of [1, 2] as const) {
    await calculator.getByRole('button', { name: `${doorCount} ${doorCount === 1 ? 'door' : 'doors'}` }).click();
    for (const [overlay, label] of [
      ['full', 'Full Overlay'],
      ['half', 'Half Overlay'],
      ['inset', 'Inset'],
    ] as const) {
      const expected = calculateCabinetDoor({ openingWidthMm: 550, openingHeightMm: 700, doorCount, overlay });
      const option = calculator.getByRole('button', { name: label });
      await option.click();
      await expect(option).toHaveAttribute('aria-pressed', 'true');
      await expect(calculator).toContainText(`${expected.doorLeaf.widthMm.toFixed(1)} mm`);
      await expect(calculator).toContainText(`${expected.doorLeaf.heightMm.toFixed(1)} mm`);
      await expect(calculator).toContainText(String(expected.hingeCount));
    }
  }
});

test('wood turning operation and diameter reconcile advisory RPM with the engine', async ({ appPage: page }) => {
  const finishing = calculateWoodTurning({ blankDiameterMm: 100, operation: 'finishing' });
  const roughing = calculateWoodTurning({ blankDiameterMm: 100, operation: 'roughing' });
  const largeRoughing = calculateWoodTurning({ blankDiameterMm: 200, operation: 'roughing' });
  const calculator = await openCalculator(page, 'Wood Turning Speed Calculator');
  await expect(calculator.getByText('Min RPM (advisory)')).toBeVisible();
  await expect(calculator.getByText('Max RPM (advisory)')).toBeVisible();
  await expect(calculator).toContainText('Follow your lathe manual');
  await expect(calculator.getByText(`${finishing.recommendedRpm.toLocaleString('en-US')} RPM`)).toBeVisible();
  await calculator.getByRole('button', { name: 'Roughing' }).click();
  await expect(calculator.getByText(`${roughing.recommendedRpm.toLocaleString('en-US')} RPM`)).toBeVisible();
  await calculator.getByRole('spinbutton', { name: 'Blank Diameter (mm)' }).fill('200');
  await expect(calculator.getByText(`${largeRoughing.recommendedRpm.toLocaleString('en-US')} RPM`)).toBeVisible();
  const sanding = calculateWoodTurning({ blankDiameterMm: 200, operation: 'sanding' });
  await calculator.getByRole('button', { name: 'Sanding' }).click();
  await expect(calculator.getByText(`${sanding.recommendedRpm.toLocaleString('en-US')} RPM`)).toBeVisible();
});

test('shed-roof mode reconciles rafter geometry with the engine', async ({ appPage: page }) => {
  const standardRoof = calculateRafterLength({
    totalSpanMm: 6000,
    pitchRatio: 0.5,
    plateWidthMm: 89,
    overhangMm: 450,
    shedRoof: false,
  });
  const shedRoof = calculateRafterLength({
    totalSpanMm: 6000,
    pitchRatio: 0.5,
    plateWidthMm: 89,
    overhangMm: 450,
    shedRoof: true,
  });
  const calculator = await openCalculator(page, 'Rafter Length & Birdsmouth');
  await expect(calculator).toContainText(`${standardRoof.runMm.toFixed(0)} mm`);
  await calculator.getByRole('checkbox', { name: /shed roof/i }).check();
  await expect(calculator).toContainText(`${shedRoof.runMm.toFixed(0)} mm`);
  await expect(calculator).toContainText(`${shedRoof.totalLengthMm.toFixed(1)} mm`);
});

test('taper face selection reconciles material removal with the engine', async ({ appPage: page }) => {
  const singleFace = calculateTaperJig({ workpieceLengthMm: 700, startWidthMm: 70, endWidthMm: 40 });
  const doubleFace = calculateTaperJig({
    workpieceLengthMm: 700,
    startWidthMm: 70,
    endWidthMm: 40,
    taperedFaces: 2,
  });
  const calculator = await openCalculator(page, 'Taper Jig Calculator');
  await expect(calculator).toContainText(`${singleFace.materialRemovedPerFaceMm} mm`);
  await expect(calculator).not.toContainText('Flip workpiece after first pass for symmetric taper');
  await calculator.getByRole('combobox', { name: /tapered faces/i }).selectOption('2');
  await expect(calculator).toContainText(`${doubleFace.materialRemovedPerFaceMm} mm`);
  await expect(calculator).toContainText('Flip workpiece after first pass for symmetric taper');
});

test('frame panel float reconciles dimensions with the engine and validates frame width', async ({ appPage: page }) => {
  const defaultPanel = calculateFramePanel({
    frameWidthMm: 600,
    frameHeightMm: 900,
    stileWidthMm: 60,
    railWidthMm: 70,
    grooveDepthMm: 9.5,
    panelFloatMm: 3,
  });
  const floatingPanel = calculateFramePanel({
    frameWidthMm: 600,
    frameHeightMm: 900,
    stileWidthMm: 60,
    railWidthMm: 70,
    grooveDepthMm: 9.5,
    panelFloatMm: 5,
  });
  const calculator = await openCalculator(page, 'Frame and Panel Calculator');
  await expect(calculator).toContainText(`${defaultPanel.panelWidthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(`${defaultPanel.panelHeightMm.toFixed(1)} mm`);
  await calculator.getByLabel(/panel float/i).fill('5');
  await expect(calculator).toContainText(`${floatingPanel.panelWidthMm.toFixed(1)} mm`);
  await calculator.getByLabel(/frame width/i).fill('100');
  await expect(calculator.getByRole('alert')).toContainText('stiles are wider than the frame allows');
});

test('crown-moulding cutting method reconciles bevel with engine and validates angle', async ({ appPage: page }) => {
  const flatCut = calculateCrownMoulding({ cornerAngleDeg: 90, springAngleDeg: 38, cuttingMethod: 'flat' });
  const inPositionCut = calculateCrownMoulding({
    cornerAngleDeg: 90,
    springAngleDeg: 38,
    cuttingMethod: 'in_position',
  });
  const calculator = await openCalculator(page, 'Crown Moulding Cut Calculator');
  const method = calculator.getByLabel(/cutting method/i);
  await expect(method).toHaveValue('flat');
  await expect(calculator).toContainText(`${flatCut.bevelAngleDeg.toFixed(1)}°`);
  await method.selectOption('in_position');
  await expect(calculator).toContainText(`${inPositionCut.bevelAngleDeg.toFixed(1)}°`);
  await calculator.getByLabel(/corner angle/i).fill('180');
  await expect(calculator.getByRole('alert')).toContainText('cornerAngleDeg must be between 0° and 180° (exclusive)');
});

test('cove cut angle and pass count reconcile with the engine', async ({ appPage: page }) => {
  const expected = calculateCoveCut({ copeWidthMm: 100, copeDepthMm: 15, bladeDiameterMm: 250, maxPassDepthMm: 1.5 });
  const calculator = await openCalculator(page, 'Cove Cut (Table Saw)');
  await expect(calculator).toContainText(`${expected.fenceAngleDeg.toFixed(1)}°`);
  await expect(calculator).toContainText(String(expected.passCount));
  await calculator.getByLabel(/cove width/i).fill('0');
  await expect(calculator.getByRole('alert')).toContainText('copeWidthMm must be greater than 0');
});

test('rabbet geometry reconciles with engine and validates mating thickness', async ({ appPage: page }) => {
  const expected = calculateDadoRabbet({
    jointType: 'rabbet',
    matingThicknessMm: 18,
    boardThicknessMm: 19,
    offsetFromEdgeMm: 8,
  });
  const calculator = await openCalculator(page, 'Dado / Rabbet Joint Calculator');
  await expect(calculator.getByRole('spinbutton', { name: /offset from edge/i })).toHaveCount(0);
  await calculator.getByRole('button', { name: 'Rabbet' }).click();
  await calculator.getByRole('spinbutton', { name: /offset from edge/i }).fill('8');
  await expect(calculator).toContainText(`${expected.cutWidthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(`${expected.cutDepthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(expected.bitsRecommendation);
  for (const [jointType, label] of [
    ['dado', 'Dado'],
    ['rabbet', 'Rabbet'],
    ['throughDado', 'Through Dado'],
  ] as const) {
    const joint = calculateDadoRabbet({
      jointType,
      matingThicknessMm: 18,
      boardThicknessMm: 19,
      offsetFromEdgeMm: 8,
    });
    await calculator.getByRole('button', { name: label, exact: true }).click();
    await expect(calculator).toContainText(`${joint.cutWidthMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(`${joint.cutDepthMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(joint.bitsRecommendation);
  }
  await calculator.getByRole('button', { name: 'Rabbet' }).click();
  await calculator.getByRole('spinbutton', { name: /mating panel thickness/i }).fill('19');
  await expect(calculator.getByRole('alert')).toContainText('matingThicknessMm must be less than boardThicknessMm');
  await expect(calculator.getByText('Cut Width')).toHaveCount(0);
});

test('finishing-coat type reconciles volume and drying schedule with the engine', async ({ appPage: page }) => {
  const polyurethane = calculateFinishingCoat({ surfaceAreaM2: 2, coatCount: 3, finishType: 'polyurethane' });
  const lacquer = calculateFinishingCoat({ surfaceAreaM2: 2, coatCount: 3, finishType: 'lacquer' });
  const calculator = await openCalculator(page, 'Finishing Coat Calculator');
  await expect(calculator).toContainText(`${polyurethane.volumeLitres.toFixed(2)} L`);
  await expect(calculator).toContainText(`${polyurethane.dryTimeBetweenCoatsMin} min`);
  await expect(calculator).toContainText(`${polyurethane.totalDryTimeHours} h`);
  await calculator.getByRole('button', { name: 'Lacquer' }).click();
  await expect(calculator).toContainText(`${lacquer.volumeLitres.toFixed(2)} L`);
  await expect(calculator).toContainText(`${lacquer.dryTimeBetweenCoatsMin} min`);
  await expect(calculator).toContainText(`${lacquer.totalDryTimeHours} h`);

  for (const finishType of ['polyurethane', 'lacquer', 'shellac', 'waterbased', 'oil'] as const) {
    const expected = calculateFinishingCoat({ surfaceAreaM2: 2, coatCount: 3, finishType });
    const label = {
      polyurethane: 'Polyurethane',
      lacquer: 'Lacquer',
      shellac: 'Shellac',
      waterbased: 'Water-Based',
      oil: 'Oil / Danish Oil',
    }[finishType];
    await calculator.getByRole('button', { name: label }).click();
    await expect(calculator).toContainText(`${expected.volumeLitres.toFixed(2)} L`);
    await expect(calculator).toContainText(`${expected.dryTimeBetweenCoatsMin} min`);
    await expect(calculator).toContainText(`${expected.totalDryTimeHours} h`);
  }
});

test('box-joint finger count reconciles with the engine and rejects zero', async ({ appPage: page }) => {
  const expected = calculateBoxJoint({ boardWidthMm: 150, fingerWidthMm: 12, depthMm: 18 });
  const calculator = await openCalculator(page, 'Box Joint Calculator');
  await expect(calculator).toContainText(String(expected.fingerCount));
  await calculator.getByLabel(/desired finger width/i).fill('0');
  await expect(calculator.getByRole('alert')).toContainText('fingerWidthMm must be positive');
});

test('router-circle mode reconciles arm length with the engine and validates bit diameter', async ({
  appPage: page,
}) => {
  const disc = calculateRouterCircle({
    targetDiameterMm: 300,
    bitDiameterMm: 12,
    pivotHoleDiameterMm: 6,
    cutMode: 'disc',
  });
  const hole = calculateRouterCircle({
    targetDiameterMm: 300,
    bitDiameterMm: 12,
    pivotHoleDiameterMm: 6,
    cutMode: 'hole',
  });
  const calculator = await openCalculator(page, 'Router Circle Jig Calculator');
  await expect(calculator).toContainText(`${disc.armLengthMm.toFixed(1)} mm`);
  await calculator.getByLabel(/cut mode/i).selectOption('hole');
  await expect(calculator).toContainText(`${hole.armLengthMm.toFixed(1)} mm`);
  await calculator.getByLabel(/bit diameter/i).fill('300');
  await expect(calculator.getByRole('alert')).toContainText('bitDiameterMm must be less than targetDiameterMm');
});

test('drawer slide and depth reconcile box dimensions with the engine', async ({ appPage: page }) => {
  const sideMount = calculateDrawerBox({
    openingWidthMm: 500,
    openingHeightMm: 150,
    openingDepthMm: 550,
    slideType: 'side',
    sideThicknessMm: 12,
  });
  const bottomMount = calculateDrawerBox({
    openingWidthMm: 500,
    openingHeightMm: 150,
    openingDepthMm: 550,
    slideType: 'bottom',
    sideThicknessMm: 12,
  });
  const centerMount = calculateDrawerBox({
    openingWidthMm: 500,
    openingHeightMm: 150,
    openingDepthMm: 550,
    slideType: 'center',
    sideThicknessMm: 12,
  });
  const shortDepth = calculateDrawerBox({
    openingWidthMm: 500,
    openingHeightMm: 150,
    openingDepthMm: 300,
    slideType: 'bottom',
    sideThicknessMm: 12,
  });
  const calculator = await openCalculator(page, 'Drawer Box Sizing Calculator');
  await expect(calculator).toContainText(`${sideMount.boxWidthMm.toFixed(1)} mm`);
  await calculator.getByRole('button', { name: 'Bottom Mount' }).click();
  await expect(calculator).toContainText(`${bottomMount.boxWidthMm.toFixed(1)} mm`);
  await calculator.getByRole('button', { name: 'Centre Mount' }).click();
  await expect(calculator).toContainText(`${centerMount.boxWidthMm.toFixed(1)} mm`);
  await calculator.getByRole('button', { name: 'Bottom Mount' }).click();
  await calculator.getByRole('spinbutton', { name: 'Cabinet Depth (mm)' }).fill('300');
  await expect(calculator).toContainText(`${shortDepth.boxDepthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(/Box depth is short — verify slide length/);
});

test('screw density reconciles pullout force with engine and validates diameter', async ({ appPage: page }) => {
  const medium = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass: 'medium' });
  const high = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass: 'high' });
  const calculator = await openCalculator(page, 'Screw Pull-Out Strength Estimator');
  const force = calculator.getByText(/^\d+\.\d+ N$/);
  await expect(calculator).toContainText('USDA equation 8-10a estimates short-term ultimate load');
  await expect(force).toHaveText(`${medium.pulloutForceN.toFixed(1)} N`);
  await calculator.getByRole('button', { name: 'High Density (Hickory, Teak)' }).click();
  await expect(force).toHaveText(`${high.pulloutForceN.toFixed(1)} N`);
  expect(high.pulloutForceN).toBeGreaterThan(medium.pulloutForceN);
  for (const [densityClass, label] of [
    ['low', 'Low Density (Pine, Cedar)'],
    ['medium', 'Medium Density (Maple, Oak)'],
    ['high', 'High Density (Hickory, Teak)'],
    ['sheet', 'Sheet Goods (Plywood, MDF)'],
  ] as const) {
    const expected = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass });
    await calculator.getByRole('button', { name: label }).click();
    await expect(force).toHaveText(`${expected.pulloutForceN.toFixed(1)} N`);
    await expect(calculator).toContainText(`${expected.pulloutForceLbf.toFixed(1)} lbf`);
    await expect(calculator).toContainText(`${expected.withdrawalResistanceMPa.toFixed(3)} MPa`);
  }
  const diameter = calculator.getByRole('spinbutton', { name: 'Screw Diameter (mm)' });
  const threadLength = calculator.getByRole('spinbutton', { name: /thread length/i });
  await calculator.getByRole('button', { name: 'Medium Density (Maple, Oak)' }).click();
  for (const [screwDiameterMm, threadLengthMm] of [
    [1, 5],
    [12, 100],
  ] as const) {
    const expected = calculateScrewPullout({ screwDiameterMm, threadLengthMm, densityClass: 'medium' });
    await diameter.fill(String(screwDiameterMm));
    await threadLength.fill(String(threadLengthMm));
    await expect(force).toHaveText(`${expected.pulloutForceN.toFixed(1)} N`);
  }
  await expect(calculator).toContainText('Adequate');
  await diameter.fill('');
  await expect(calculator.getByRole('alert')).toContainText('screwDiameterMm must be >= 1 and <= 12, got 0');
  await diameter.fill('12.5');
  await expect(calculator.getByRole('alert')).toContainText('screwDiameterMm must be >= 1 and <= 12, got 12.5');
  await diameter.fill('4');
  await threadLength.fill('101');
  await expect(calculator.getByRole('alert')).toContainText('threadLengthMm must be >= 5 and <= 100, got 101');
});

test('stair stringer geometry reconciles with engine and validates tread depth', async ({ appPage: page }) => {
  const expected = calculateStairStringer({ totalRiseMm: 2800, treadDepthMm: 280, idealRiserMm: 175 });
  const calculator = await openCalculator(page, 'Stair Stringer Calculator');
  await expect(calculator).toContainText(String(expected.riserCount));
  await expect(calculator).toContainText(`${expected.totalRunMm} mm`);
  await expect(calculator).toContainText('Passes IRC 2021 riser and tread limits');
  await calculator.getByRole('spinbutton', { name: /tread depth/i }).fill('200');
  await expect(calculator.getByRole('alert')).toContainText('Tread depth below IRC minimum 10" (254 mm)');
  await expect(calculator).not.toContainText('Passes IRC 2021 riser and tread limits');
});

test('planer target thickness reconciles pass outputs with the engine', async ({ appPage: page }) => {
  const expected = calculatePlanerPasses({
    initialThicknessMm: 50,
    targetThicknessMm: 44,
    maxPassDepthMm: 1.5,
    boardLengthMm: 1000,
    snipeLengthMm: 50,
  });
  const calculator = await openCalculator(page, 'Lumber Planer Pass Calculator');
  const target = calculator.getByLabel(/target thickness/i);
  await target.fill('44');
  await expect(calculator).toContainText(String(expected.passCount));
  await expect(calculator).toContainText(`${expected.depthPerPassMm} mm`);
  await target.fill('50');
  await expect(calculator.getByRole('alert')).toContainText('targetThicknessMm must be less than initialThicknessMm');
});

test('honing micro-bevel projection reconciles with engine and rejects invalid angle', async ({ appPage: page }) => {
  const standard = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 0 });
  const microbevelResult = calculateHoningGuide({ bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 3 });
  const calculator = await openCalculator(page, 'Honing Guide Calculator');
  const microbevel = calculator.getByLabel(/micro-bevel angle/i);
  await expect(calculator).toContainText(`${standard.projectionMm.toFixed(1)} mm`);
  await microbevel.fill('3');
  await expect(calculator).toContainText(`${microbevelResult.projectionMm.toFixed(1)} mm`);
  await microbevel.fill('45');
  await expect(calculator.getByRole('alert')).toContainText('microbevelDeg must be less than 45°');
  await expect(calculator).not.toContainText(`${standard.projectionMm.toFixed(1)} mm`);
});

test('router-template cut type reconciles dimension adjustments with the engine', async ({ appPage: page }) => {
  const inside = calculateRouterTemplate({
    bushingODMm: 20,
    bitDiameterMm: 12,
    cutType: 'inside',
    nominalDimensionMm: 100,
  });
  const outside = calculateRouterTemplate({
    bushingODMm: 20,
    bitDiameterMm: 12,
    cutType: 'outside',
    nominalDimensionMm: 100,
  });
  const calculator = await openCalculator(page, 'Router Template Offset');
  await calculator.getByLabel(/nominal feature dimension/i).fill('100');
  await expect(calculator).toContainText(`${inside.adjustedDimensionMm?.toFixed(3)} mm`);
  await expect(calculator).toContainText(`+${inside.templateAdjustmentPerSideMm.toFixed(3)} mm`);
  await calculator.getByLabel(/cut type/i).selectOption('outside');
  await expect(calculator).toContainText(`${outside.templateAdjustmentPerSideMm.toFixed(3)} mm`);
  await expect(calculator).toContainText(`${outside.adjustedDimensionMm?.toFixed(3)} mm`);
});

test('half-lap board thickness reconciles notch dimensions with engine and rejects zero', async ({ appPage: page }) => {
  const expected = calculateHalfLap({
    board1ThicknessMm: 20,
    board1WidthMm: 90,
    board2ThicknessMm: 19,
    board2WidthMm: 90,
    lapType: 'end_lap',
  });
  const calculator = await openCalculator(page, 'Half-Lap Joint');
  const thickness = calculator.getByLabel(/board 1 thickness/i);
  await thickness.fill('20');
  await expect(calculator).toContainText(`${expected.board1NotchDepthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(`${expected.board1NotchWidthMm.toFixed(1)} mm`);
  for (const lapType of ['end_lap', 't_lap', 'cross_lap'] as const) {
    const joint = calculateHalfLap({
      board1ThicknessMm: 20,
      board1WidthMm: 90,
      board2ThicknessMm: 19,
      board2WidthMm: 90,
      lapType,
    });
    await calculator.getByLabel(/lap type/i).selectOption(lapType);
    await expect(calculator).toContainText(`${joint.board1NotchDepthMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(`${joint.board2NotchDepthMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(`${joint.finishedThicknessMm.toFixed(1)} mm`);
  }
  await thickness.fill('0');
  await expect(calculator.getByRole('alert')).toContainText('board1ThicknessMm must be greater than 0');
});

test('spline count reconciles joint dimensions with engine and validates slot depth', async ({ appPage: page }) => {
  const expected = calculateSplineJoint({
    boardThicknessMm: 19,
    splineThicknessMm: 3,
    slotDepthPerBoardMm: 6,
    jointLengthMm: 120,
    splineCount: 3,
  });
  const calculator = await openCalculator(page, 'Spline Joint');
  await calculator.getByLabel(/number of splines/i).fill('3');
  await expect(calculator).toContainText(`${expected.totalSplineLengthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(`${expected.totalGlueAreaMm2.toFixed(0)} mm²`);
  await calculator.getByLabel(/slot depth per board/i).fill('19');
  await expect(calculator.getByRole('alert')).toContainText('slotDepthPerBoardMm must be < boardThicknessMm');
});
