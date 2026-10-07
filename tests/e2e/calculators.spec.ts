import { expect, test } from './fixtures/app';
import type { Locator } from '@playwright/test';
import { calculateBoxJoint } from '../../src/engine/box-joint';
import { calculateCabinetDoor } from '../../src/engine/cabinet-door';
import { calculateCoveCut } from '../../src/engine/cove-cut';
import { calculateCrownMoulding } from '../../src/engine/crown-moulding';
import type { CrownCutMethod } from '../../src/engine/crown-moulding';
import { calculateDadoRabbet } from '../../src/engine/dado-rabbet';
import { calculateDowelJoint } from '../../src/engine/dowel-joint';
import { calculateDeflection } from '../../src/engine/shelf-deflection';
import { calculateDovetailLayout } from '../../src/engine/dovetail-layout';
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
import { formatMillimeters, formatNumber } from '../../src/i18n/format';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { calculatePlanerPasses } from '../../src/engine/planer-passes';
import { calculateMortiseTenon } from '../../src/engine/mortise-tenon';
import { generateParts } from '../../src/engine/parts';
import { calculateRafterLength } from '../../src/engine/rafter-length';
import { calculateRouterCircle } from '../../src/engine/router-circle';
import type { CircleCutMode } from '../../src/engine/router-circle';
import { calculateRouterTemplate } from '../../src/engine/router-template';
import { calculateScrewPullout } from '../../src/engine/screw-pullout';
import { calculateSplineJoint } from '../../src/engine/spline-joint';
import { calculateStairStringer } from '../../src/engine/stair-stringer';
import { calculateTaperJig } from '../../src/engine/taper-jig';
import { calculateWoodTurning } from '../../src/engine/wood-turning';
import { calculatePocketHole } from '../../src/engine/pocket-hole';
import CALCULATOR_CONTROL_INVENTORY from '../fixtures/calculator-control-inventory.json' with { type: 'json' };
import WOODGEARS_COVE_CUT_ORACLE from '../fixtures/oracles/woodgears-cove-cut.json' with { type: 'json' };

const calculatorNames = CALCULATOR_CONTROL_INVENTORY.panels.map(({ name }) => name);

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
  const toggle = page.getByRole('button', { name, exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const calculator = page.getByRole('region', { name });
  await expect(calculator.locator('input, select, textarea, button').first()).toBeVisible();
  return calculator;
}

function getAccessibleControl(panel: Locator, role: string, accessibleName: string) {
  const options = { name: accessibleName, exact: true };
  switch (role) {
    case 'button':
      return panel.getByRole('button', options);
    case 'checkbox':
      return panel.getByRole('checkbox', options);
    case 'combobox':
      return panel.getByRole('combobox', options);
    case 'slider':
      return panel.getByRole('slider', options);
    case 'spinbutton':
      return panel.getByRole('spinbutton', options);
    default:
      throw new Error(`Unsupported calculator control role: ${role}`);
  }
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

test('rendered calculator controls match the accessible control inventory', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+6');
  const accordionToggles = page.locator('main section[aria-label="Calculators"] button[aria-expanded]');
  await expect(accordionToggles).toHaveCount(CALCULATOR_CONTROL_INVENTORY.panels.length);

  for (const inventory of CALCULATOR_CONTROL_INVENTORY.panels) {
    const toggle = page.getByRole('button', { name: inventory.name, exact: true });
    await expect(toggle).toHaveCount(1);
    await toggle.click();
    const panel = page.getByRole('region', { name: inventory.name, exact: true });

    for (const control of inventory.controls) {
      await expect(getAccessibleControl(panel, control.role, control.accessibleName)).toHaveCount(1);
    }

    for (const control of inventory.conditionalControls ?? []) {
      if (control.when === 'Rabbet selected') await panel.getByRole('button', { name: 'Rabbet', exact: true }).click();
      await expect(getAccessibleControl(panel, control.role, control.accessibleName)).toHaveCount(1);
    }

    const expectedControls = [...inventory.controls, ...(inventory.conditionalControls ?? [])];
    for (const role of ['button', 'checkbox', 'combobox', 'slider', 'spinbutton'] as const) {
      const expectedCount = expectedControls.filter((control) => control.role === role).length;
      await expect(panel.getByRole(role)).toHaveCount(expectedCount);
    }
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
    for (const [otherLabel] of finishOptions) {
      await expect(calculator.getByRole('button', { name: otherLabel, exact: true })).toHaveAttribute(
        'aria-pressed',
        String(otherLabel === label),
      );
    }
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
  await coats.press('ArrowLeft');
  await expect(coats).toHaveValue('1');
  for (const coatCount of [1, 2, 3, 4, 5]) {
    const expected = calculateFinish(areaM2, 'paint', coatCount);
    await expect(coats).toHaveValue(String(coatCount));
    await expect(litres).toHaveText(`${expected.litresNeeded.toFixed(2)} L`);
    if (coatCount < 5) await coats.press('ArrowRight');
  }
  await coats.press('ArrowRight');
  await expect(coats).toHaveValue('5');
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

  await openingCount.focus();
  await openingCount.press('Home');
  await openingCount.press('ArrowLeft');
  await expect(openingCount).toHaveValue('1');
  await openingCount.press('End');
  await openingCount.press('ArrowRight');
  await expect(openingCount).toHaveValue('4');
});

test('face frame height and member widths update results and reject zero', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Face Frame Calculator');
  const scenarios = [
    {
      accessibleName: 'Cabinet Height (mm)',
      initialValue: '720',
      validValue: '800',
      expectedValue: `${calculateFaceFrame({ cabinetWidthMm: 600, cabinetHeightMm: 800 }).stileLengthMm.toFixed(1)} mm`,
      invalidMessage: 'cabinetHeightMm must be > 0',
    },
    {
      accessibleName: 'Stile Width (mm)',
      initialValue: '38',
      validValue: '50',
      expectedValue: `${calculateFaceFrame({ cabinetWidthMm: 600, cabinetHeightMm: 720, stileWidthMm: 50 }).openingWidthMm.toFixed(1)} mm`,
      invalidMessage: 'stileWidthMm must be > 0',
    },
    {
      accessibleName: 'Rail Width (mm)',
      initialValue: '38',
      validValue: '50',
      expectedValue: `${calculateFaceFrame({ cabinetWidthMm: 600, cabinetHeightMm: 720, railWidthMm: 50 }).openingHeightMm.toFixed(1)} mm`,
      invalidMessage: 'railWidthMm must be > 0',
    },
  ] as const;

  for (const scenario of scenarios) {
    const field = calculator.getByRole('spinbutton', { name: scenario.accessibleName, exact: true });
    await field.fill(scenario.validValue);
    await expect(calculator).toContainText(scenario.expectedValue);
    await field.fill('0');
    await expect(calculator.getByRole('alert')).toContainText(scenario.invalidMessage);
    await field.fill(scenario.initialValue);
    await expect(calculator.getByRole('alert')).toHaveCount(0);
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
  const glueTypeControl = calculator.getByRole('combobox', { name: /glue type/i });
  const availableGlueTypes = await glueTypeControl
    .locator('option')
    .evaluateAll((options) => options.map((option) => option.getAttribute('value')));
  expect(availableGlueTypes).toEqual(['pva', 'polyurethane', 'epoxy', 'hide', 'ca']);
  await expect(calculator).toContainText(`${initial.netVolumeMl} mL`);

  await calculator.getByRole('spinbutton', { name: /number of joints/i }).fill('2');
  await glueTypeControl.selectOption('polyurethane');

  await expect(calculator).toContainText(`${polyurethane.netVolumeMl} mL`);
  await expect(calculator).toContainText(`${polyurethane.recommendedVolumeMl} mL`);
  await expect(calculator).toContainText(`${polyurethane.openTimeMin} min`);
  await expect(calculator).toContainText(`${polyurethane.cureTimeHours} h`);

  for (const glueType of ['pva', 'polyurethane', 'epoxy', 'hide', 'ca'] as const) {
    const expected = calculateGlueCoverage({ surfaceAreaMm2: 50000, jointCount: 2, glueType });
    await glueTypeControl.selectOption(glueType);
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
  await glueTypeControl.selectOption('polyurethane');
  await expect(calculator.getByRole('alert')).toHaveCount(0);
  await expect(calculator).toContainText(`${polyurethane.netVolumeMl} mL`);
});

test('kerf controls recompute geometry, reject invalid values, and select one material', async ({ appPage: page }) => {
  const parameters = { thicknessMm: 18, bendRadiusMm: 150, kerfWidthMm: 3.2, material: 'plywood' as const };
  const calculator = await openCalculator(page, 'Kerf Bending Calculator');

  const dimensionCases = [
    { label: 'Panel Thickness (mm)', field: 'thicknessMm', value: 20, error: 'thicknessMm must be positive' },
    { label: 'Target Bend Radius (mm)', field: 'bendRadiusMm', value: 180, error: 'bendRadiusMm must be positive' },
    { label: 'Kerf Width (saw blade) (mm)', field: 'kerfWidthMm', value: 4.2, error: 'kerfWidthMm must be positive' },
  ] as const;
  for (const controlCase of dimensionCases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));
    const expected = calculateKerfBending(parameters);
    await expect(calculator.getByText(String(expected.kerfCount), { exact: true })).toBeVisible();
    await expect(calculator).toContainText(`${expected.kerfSpacingMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(`${expected.kerfDepthMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(`${expected.remainingThicknessMm.toFixed(1)} mm`);

    await field.fill('0');
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator).not.toContainText(/NaN|Infinity/);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
  }

  const materialOptions = [
    ['plywood', 'Plywood'],
    ['mdf', 'MDF'],
    ['softwood', 'Softwood'],
    ['hardwood', 'Hardwood'],
  ] as const;
  for (const [material, label] of materialOptions) {
    const expected = calculateKerfBending({ ...parameters, material });
    await calculator.getByRole('button', { name: label }).click();
    await expect(calculator.getByText(String(expected.kerfCount), { exact: true })).toBeVisible();
    await expect(calculator).toContainText(`${expected.kerfSpacingMm.toFixed(1)} mm`);
    await expect(calculator.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    for (const [, otherLabel] of materialOptions) {
      if (otherLabel !== label) {
        await expect(calculator.getByRole('button', { name: otherLabel })).toHaveAttribute('aria-pressed', 'false');
      }
    }
  }

  await calculator.getByRole('spinbutton', { name: 'Panel Thickness (mm)' }).fill('3');
  await expect(calculator.getByRole('alert')).toContainText('Bend radius too tight');
  await expect(calculator.getByText('Number of Kerfs')).toHaveCount(0);
});

test('grain direction reconciles shrinkage and invalid dimensions report an error', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Moisture Content & Shrinkage');
  const speciesControl = calculator.getByRole('combobox', { name: 'Species', exact: true });
  const grainControl = calculator.getByRole('combobox', { name: 'Grain Direction', exact: true });

  const expectShrinkage = async (
    species: Parameters<typeof calculateMoistureShrinkage>[0]['species'],
    grain: Parameters<typeof calculateMoistureShrinkage>[0]['grain'],
  ) => {
    const expected = calculateMoistureShrinkage({
      initialMCPct: 25,
      targetMCPct: 8,
      species,
      dimensionMm: 200,
      grain,
    });
    const results = calculator.locator('dl dd');
    await expect(results.nth(0)).toHaveText(`${expected.effectiveMCChangePct.toFixed(1)} %`);
    await expect(results.nth(1)).toHaveText(`${expected.changeAmountMm.toFixed(2)} mm`);
    await expect(results.nth(2)).toHaveText(`${expected.finalDimensionMm.toFixed(2)} mm`);
    await expect(results.nth(3)).toHaveText(`${expected.shrinkageCoefficient.toFixed(5)}`);
  };

  const speciesOptions = [
    'oak',
    'maple',
    'cherry',
    'walnut',
    'pine',
    'douglas_fir',
    'cedar',
    'generic_hardwood',
    'generic_softwood',
  ] as const;

  for (const species of speciesOptions) {
    await speciesControl.selectOption(species);
    for (const grain of ['tangential', 'radial'] as const) {
      await grainControl.selectOption(grain);
      await expect(speciesControl).toHaveValue(species);
      await expect(grainControl).toHaveValue(grain);
      await expectShrinkage(species, grain);
    }
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
  await speciesControl.selectOption('oak');
  await expect(calculator.getByRole('alert')).toHaveCount(0);
  await expectShrinkage('oak', 'radial');

  await calculator.getByLabel(/dimension/i).fill('0');
  await expect(calculator.getByRole('alert')).toContainText('dimensionMm must be >= 1 and <= 3000');
  await expect(calculator.locator('dl')).toHaveCount(0);
});

test('cabinet door opening dimensions update outputs and recover from nonpositive values', async ({
  appPage: page,
}) => {
  const calculator = await openCalculator(page, 'Cabinet Door Sizing Calculator');
  const openingWidth = calculator.getByRole('spinbutton', { name: 'Opening Width (mm)', exact: true });
  const openingHeight = calculator.getByRole('spinbutton', { name: 'Opening Height (mm)', exact: true });
  const dimensions = [
    { field: openingWidth, value: 600, error: 'openingWidthMm must be > 0' },
    { field: openingHeight, value: 800, error: 'openingHeightMm must be > 0' },
  ] as const;

  for (const { field, value, error } of dimensions) {
    await field.fill(String(value));
    const expected = calculateCabinetDoor({
      openingWidthMm: Number(await openingWidth.inputValue()),
      openingHeightMm: Number(await openingHeight.inputValue()),
      doorCount: 1,
      overlay: 'full',
    });
    await expect(calculator).toContainText(`${expected.doorLeaf.widthMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(`${expected.doorLeaf.heightMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(String(expected.hingeCount));

    await field.fill('0');
    await expect(calculator.getByRole('alert')).toContainText(error);
    await expect(calculator).not.toContainText(/NaN|Infinity/);
    await field.fill(field === openingWidth ? '550' : '700');
    await expect(calculator.getByRole('alert')).toHaveCount(0);
  }
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
    const doorCountButton = calculator.getByRole('button', {
      name: `${doorCount} ${doorCount === 1 ? 'door' : 'doors'}`,
    });
    await doorCountButton.click();
    await expect(doorCountButton).toHaveAttribute('aria-pressed', 'true');
    await expect(
      calculator.getByRole('button', { name: `${doorCount === 1 ? '2 doors' : '1 door'}`, exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');
    for (const [overlay, label] of [
      ['full', 'Full Overlay'],
      ['half', 'Half Overlay'],
      ['inset', 'Inset'],
    ] as const) {
      const expected = calculateCabinetDoor({ openingWidthMm: 550, openingHeightMm: 700, doorCount, overlay });
      const option = calculator.getByRole('button', { name: label });
      await option.click();
      await expect(option).toHaveAttribute('aria-pressed', 'true');
      for (const otherLabel of ['Full Overlay', 'Half Overlay', 'Inset']) {
        if (otherLabel !== label) {
          await expect(calculator.getByRole('button', { name: otherLabel, exact: true })).toHaveAttribute(
            'aria-pressed',
            'false',
          );
        }
      }
      await expect(calculator).toContainText(`${expected.doorLeaf.widthMm.toFixed(1)} mm`);
      await expect(calculator).toContainText(`${expected.doorLeaf.heightMm.toFixed(1)} mm`);
      await expect(calculator).toContainText(String(expected.hingeCount));
    }
  }
});

test('wood turning controls reconcile advisory RPM, recover from invalid diameters, and select one operation', async ({
  appPage: page,
}) => {
  const calculator = await openCalculator(page, 'Wood Turning Speed Calculator');
  await expect(calculator.getByText('Min RPM (advisory)')).toBeVisible();
  await expect(calculator.getByText('Max RPM (advisory)')).toBeVisible();
  await expect(calculator).toContainText('Follow your lathe manual');
  const operationLabels = ['Roughing', 'Finishing', 'Sanding'] as const;
  for (const operation of ['roughing', 'finishing', 'sanding'] as const) {
    const label = operation[0].toUpperCase() + operation.slice(1);
    const option = calculator.getByRole('button', { name: label, exact: true });
    await option.click();
    const expected = calculateWoodTurning({ blankDiameterMm: 100, operation });
    await expect(calculator.getByText(`${expected.recommendedRpm.toLocaleString('en-US')} RPM`)).toBeVisible();
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    for (const otherLabel of operationLabels) {
      if (otherLabel !== label) {
        await expect(calculator.getByRole('button', { name: otherLabel, exact: true })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      }
    }
  }

  const diameter = calculator.getByRole('spinbutton', { name: 'Blank Diameter (mm)', exact: true });
  const largeSanding = calculateWoodTurning({ blankDiameterMm: 200, operation: 'sanding' });
  await diameter.fill('200');
  await expect(calculator.getByText(`${largeSanding.recommendedRpm.toLocaleString('en-US')} RPM`)).toBeVisible();

  await diameter.fill('0');
  await expect(calculator.getByRole('alert')).toContainText('blankDiameterMm must be positive and finite');
  await expect(calculator.getByText(`${largeSanding.recommendedRpm.toLocaleString('en-US')} RPM`)).toHaveCount(0);
  await expect(calculator).not.toContainText(/NaN|Infinity/);

  await diameter.fill('200');
  await expect(calculator.getByRole('alert')).toHaveCount(0);
  await expect(calculator.getByText(`${largeSanding.recommendedRpm.toLocaleString('en-US')} RPM`)).toBeVisible();
});

test('shed-roof mode reconciles rafter geometry with the engine', async ({ appPage: page }) => {
  const parameters: Parameters<typeof calculateRafterLength>[0] = {
    totalSpanMm: 6000,
    pitchRatio: 0.5,
    plateWidthMm: 89,
    overhangMm: 450,
    shedRoof: false,
  };
  const calculator = await openCalculator(page, 'Rafter Length & Birdsmouth');

  const expectResults = async (overrides: Partial<typeof parameters> = {}) => {
    const expected = calculateRafterLength({ ...parameters, ...overrides });
    const results = calculator.locator('dl dd');
    await expect(results.nth(0)).toHaveText(formatMillimeters(expected.runMm, 'en', 0));
    await expect(results.nth(1)).toHaveText(formatMillimeters(expected.riseMm, 'en', 1));
    await expect(results.nth(2)).toHaveText(formatMillimeters(expected.rafterLengthMm, 'en', 1));
    await expect(results.nth(3)).toHaveText(formatMillimeters(expected.totalLengthMm, 'en', 1));
    await expect(results.nth(4)).toHaveText(
      `${formatNumber(expected.plumbCutAngleDeg, 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}°`,
    );
    await expect(results.nth(5)).toHaveText(
      `${formatNumber(expected.seatCutAngleDeg, 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}°`,
    );
    await expect(results.nth(6)).toHaveText(formatMillimeters(expected.birdsmouthDepthMm, 'en', 1));
  };

  await expectResults();

  const inputCases = [
    {
      label: 'Total Building Span (mm)',
      value: 8000,
      invalidValue: 0,
      error: 'totalSpanMm must be > 0',
      input: { totalSpanMm: 8000 },
    },
    {
      label: 'Pitch Ratio (rise/run)',
      value: 0.75,
      invalidValue: 0,
      error: 'pitchRatio must be > 0',
      input: { pitchRatio: 0.75 },
    },
    {
      label: 'Wall Plate Width (mm)',
      value: 140,
      invalidValue: 0,
      error: 'plateWidthMm must be > 0',
      input: { plateWidthMm: 140 },
    },
    {
      label: 'Overhang (mm)',
      value: 600,
      invalidValue: -1,
      error: 'overhangMm must be >= 0',
      input: { overhangMm: 600 },
    },
  ] as const;

  for (const inputCase of inputCases) {
    Object.assign(parameters, inputCase.input);
    const field = calculator.getByRole('spinbutton', { name: inputCase.label, exact: true });
    await field.fill(String(inputCase.value));
    await expectResults();

    await field.fill(String(inputCase.invalidValue));
    await expect(calculator.getByRole('alert')).toContainText(inputCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);

    await field.fill(String(inputCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectResults();
  }

  const shedRoof = calculator.getByRole('checkbox', { name: /shed roof/i });
  await shedRoof.check();
  await expect(shedRoof).toBeChecked();
  await expectResults({ shedRoof: true });
  await shedRoof.uncheck();
  await expect(shedRoof).not.toBeChecked();
  await expectResults({ shedRoof: false });
});

test('taper jig dimensions update outputs, reject invalid values, and recover', async ({ appPage: page }) => {
  const parameters = { workpieceLengthMm: 700, startWidthMm: 70, endWidthMm: 40 };
  const calculator = await openCalculator(page, 'Taper Jig Calculator');

  const expectResults = async (taperedFaces: 1 | 2) => {
    const expected = calculateTaperJig({ ...parameters, taperedFaces });
    await expect(calculator).toContainText(`${expected.taperAngleDeg}°`);
    await expect(calculator).toContainText(`${expected.jigOffsetMm} mm`);
    await expect(calculator).toContainText(`${expected.materialRemovedPerFaceMm} mm`);
    await expect(calculator).toContainText(`${expected.taperPerFootMm} mm/ft`);
  };

  await expectResults(1);
  await expect(calculator).not.toContainText('Flip workpiece after first pass for symmetric taper');

  const dimensionCases = [
    {
      label: 'Workpiece Length (mm)',
      field: 'workpieceLengthMm',
      value: 900,
      invalidValue: 0,
      error: 'workpieceLengthMm must be > 0',
    },
    {
      label: 'Start Width (wide end) (mm)',
      field: 'startWidthMm',
      value: 80,
      invalidValue: 0,
      error: 'startWidthMm must be > 0',
    },
    {
      label: 'End Width (narrow end) (mm)',
      field: 'endWidthMm',
      value: 45,
      invalidValue: 80,
      error: 'endWidthMm must be < 80',
    },
  ] as const;

  for (const controlCase of dimensionCases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));
    await expectResults(1);

    await field.fill(String(controlCase.invalidValue));
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectResults(1);
  }

  await calculator.getByRole('combobox', { name: /tapered faces/i }).selectOption('2');
  await expectResults(2);
  await expect(calculator).toContainText('Flip workpiece after first pass for symmetric taper');
});

test('frame panel dimensions update geometry, reject invalid inputs, and recover', async ({ appPage: page }) => {
  const parameters = {
    frameWidthMm: 600,
    frameHeightMm: 900,
    stileWidthMm: 60,
    railWidthMm: 70,
    grooveDepthMm: 9.5,
    panelFloatMm: 3,
  };
  const calculator = await openCalculator(page, 'Frame and Panel Calculator');

  const dimensionCases = [
    { label: 'Frame Width (mm)', field: 'frameWidthMm', value: 700, invalidValue: 0, error: 'frameWidthMm' },
    { label: 'Frame Height (mm)', field: 'frameHeightMm', value: 1000, invalidValue: 0, error: 'frameHeightMm' },
    { label: 'Stile Width (mm)', field: 'stileWidthMm', value: 65, invalidValue: 0, error: 'stileWidthMm' },
    { label: 'Rail Width (mm)', field: 'railWidthMm', value: 80, invalidValue: 0, error: 'railWidthMm' },
    { label: 'Groove Depth (mm)', field: 'grooveDepthMm', value: 12, invalidValue: 0, error: 'grooveDepthMm' },
    { label: 'Panel Float (each side) (mm)', field: 'panelFloatMm', value: 5, invalidValue: -1, error: 'panelFloatMm' },
  ] as const;

  for (const controlCase of dimensionCases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));
    const expected = calculateFramePanel(parameters);
    await expect(calculator).toContainText(`${expected.panelWidthMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(`${expected.panelHeightMm.toFixed(1)} mm`);
    await expect(calculator).toContainText(`W: ${expected.widthFloatMm} mm · H: ${expected.heightFloatMm} mm`);
    await expect(calculator).toContainText(formatMillimeters(expected.grooveDepthMm, 'en', 1));

    await field.fill(String(controlCase.invalidValue));
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator).not.toContainText(/NaN|Infinity/);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
  }

  await calculator.getByLabel(/frame width/i).fill('100');
  await expect(calculator.getByRole('alert')).toContainText('stiles are wider than the frame allows');
  await calculator.getByLabel(/frame width/i).fill('700');
  await expect(calculator.getByRole('alert')).toHaveCount(0);
});

test('crown-moulding angles and cutting methods update results, reject invalid values, and recover', async ({
  appPage: page,
}) => {
  const parameters = { cornerAngleDeg: 90, springAngleDeg: 38, cuttingMethod: 'flat' as CrownCutMethod };
  const calculator = await openCalculator(page, 'Crown Moulding Cut Calculator');

  const expectCut = async () => {
    const expected = calculateCrownMoulding(parameters);
    const results = calculator.locator('dl dd');
    await expect(results.nth(0)).toHaveText(`${expected.miterAngleDeg.toFixed(1)}°`);
    await expect(results.nth(1)).toHaveText(`${expected.bevelAngleDeg.toFixed(1)}°`);
  };

  const method = calculator.getByLabel(/cutting method/i);
  await expect(method).toHaveValue('flat');
  await expectCut();

  const dimensionCases = [
    {
      label: 'Corner Angle (°)',
      field: 'cornerAngleDeg',
      value: 100,
      invalidValue: 180,
      error: 'cornerAngleDeg must be between 0° and 180° (exclusive)',
    },
    {
      label: 'Spring Angle (°)',
      field: 'springAngleDeg',
      value: 45,
      invalidValue: 90,
      error: 'springAngleDeg must be between 0° and 90° (exclusive)',
    },
  ] as const;

  for (const controlCase of dimensionCases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));
    await expectCut();

    await field.fill(String(controlCase.invalidValue));
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectCut();
  }

  parameters.cuttingMethod = 'in_position';
  await method.selectOption('in_position');
  await expectCut();
  parameters.cuttingMethod = 'flat';
  await method.selectOption('flat');
  await expectCut();
});

test('cove cut inputs reconcile with the Woodgears reference, recompute outputs, and recover from invalid values', async ({
  appPage: page,
}) => {
  const reference = WOODGEARS_COVE_CUT_ORACLE.sourceValues;
  const parameters = {
    copeWidthMm: reference.copeWidthMm,
    copeDepthMm: reference.copeDepthMm,
    bladeDiameterMm: reference.bladeDiameterMm,
    bladeKerfMm: reference.bladeKerfMm,
    maxPassDepthMm: 1.5,
  };
  const calculator = await openCalculator(page, 'Cove Cut (Table Saw)');
  for (const [label, value] of [
    [/cove width/i, parameters.copeWidthMm],
    [/cove depth/i, parameters.copeDepthMm],
    [/blade diameter/i, parameters.bladeDiameterMm],
    [/blade kerf/i, parameters.bladeKerfMm],
    [/max depth per pass/i, parameters.maxPassDepthMm],
  ] as const) {
    await calculator.getByLabel(label).fill(String(value));
  }

  const referenceResult = calculateCoveCut(parameters);
  const roundedFenceDistanceMm = Math.round(
    reference.fenceLengthMm * Math.tan((referenceResult.fenceAngleDeg * Math.PI) / 180),
  );
  expect(
    Math.abs(roundedFenceDistanceMm - WOODGEARS_COVE_CUT_ORACLE.derivedValues.fenceDistanceMm),
  ).toBeLessThanOrEqual(1);

  const controls: {
    label: RegExp;
    field: keyof typeof parameters;
    value: number;
    error: string;
  }[] = [
    { label: /cove width/i, field: 'copeWidthMm', value: 50, error: 'copeWidthMm must be greater than 0' },
    { label: /cove depth/i, field: 'copeDepthMm', value: 25, error: 'copeDepthMm must be greater than 0' },
    {
      label: /blade diameter/i,
      field: 'bladeDiameterMm',
      value: 260,
      error: 'bladeDiameterMm must be greater than 0',
    },
    { label: /blade kerf/i, field: 'bladeKerfMm', value: 3, error: 'bladeKerfMm must be greater than 0' },
    {
      label: /max depth per pass/i,
      field: 'maxPassDepthMm',
      value: 2,
      error: 'maxPassDepthMm must be greater than 0',
    },
  ];

  for (const controlCase of controls) {
    const control = calculator.getByLabel(controlCase.label);
    parameters[controlCase.field] = controlCase.value;
    await control.fill(String(controlCase.value));
    const expected = calculateCoveCut(parameters);
    await expect(calculator).toContainText(`${expected.fenceAngleDeg.toFixed(1)}°`);
    await expect(calculator).toContainText(String(expected.passCount));
    await expect(calculator).toContainText(`${expected.depthPerPassMm.toFixed(2)} mm`);
    await expect(calculator).toContainText(`${expected.bladeHeightMm} mm`);

    await control.fill('0');
    await expect(calculator.getByRole('alert')).toHaveText(controlCase.error);
    await control.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
  }
});

test('dado and rabbet controls reconcile geometry, recover from errors, and select one joint type', async ({
  appPage: page,
}) => {
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

  const jointOptions = [
    ['dado', 'Dado'],
    ['rabbet', 'Rabbet'],
    ['throughDado', 'Through Dado'],
  ] as const;
  for (const [jointType, label] of jointOptions) {
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
    await expect(calculator.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    for (const [, otherLabel] of jointOptions) {
      if (otherLabel !== label) {
        await expect(calculator.getByRole('button', { name: otherLabel, exact: true })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      }
    }
    if (jointType !== 'rabbet') {
      await expect(calculator.getByRole('spinbutton', { name: /offset from edge/i })).toHaveCount(0);
    }
  }

  await calculator.getByRole('button', { name: 'Rabbet' }).click();
  const offset = calculator.getByRole('spinbutton', { name: /offset from edge/i });
  await offset.fill('-1');
  await expect(calculator.getByRole('alert')).toContainText('offsetFromEdgeMm must be non-negative and finite');
  await offset.fill('8');
  await expect(calculator.getByRole('alert')).toHaveCount(0);

  const matingThickness = calculator.getByRole('spinbutton', { name: /mating panel thickness/i });
  await matingThickness.fill('16');
  const thinnerJoint = calculateDadoRabbet({
    jointType: 'rabbet',
    matingThicknessMm: 16,
    boardThicknessMm: 19,
    offsetFromEdgeMm: 8,
  });
  await expect(calculator).toContainText(`${thinnerJoint.cutWidthMm.toFixed(1)} mm`);
  await matingThickness.fill('19');
  await expect(calculator.getByRole('alert')).toContainText('matingThicknessMm must be less than boardThicknessMm');
  await expect(calculator.getByText('Cut Width')).toHaveCount(0);
  await matingThickness.fill('16');
  await expect(calculator.getByRole('alert')).toHaveCount(0);

  const boardThickness = calculator.getByRole('spinbutton', { name: /receiving board thickness/i });
  await boardThickness.fill('25');
  const thickerBoard = calculateDadoRabbet({
    jointType: 'rabbet',
    matingThicknessMm: 16,
    boardThicknessMm: 25,
    offsetFromEdgeMm: 8,
  });
  await expect(calculator).toContainText(`${thickerBoard.cutDepthMm.toFixed(1)} mm`);
  await boardThickness.fill('0');
  await expect(calculator.getByRole('alert')).toContainText('boardThicknessMm must be positive and finite');
  await boardThickness.fill('25');
  await expect(calculator.getByRole('alert')).toHaveCount(0);
});

test('finishing-coat controls reconcile output, recover from invalid values, and select one finish', async ({
  appPage: page,
}) => {
  const calculator = await openCalculator(page, 'Finishing Coat Calculator');
  const surfaceArea = calculator.getByRole('spinbutton', { name: 'Surface Area (m²)', exact: true });
  const coatCount = calculator.getByRole('spinbutton', { name: 'Number of Coats', exact: true });

  for (const inputCase of [
    { field: surfaceArea, value: 3.2, error: 'surfaceAreaM2 must be positive and finite' },
    { field: coatCount, value: 4, error: 'coatCount must be a positive integer' },
  ]) {
    await inputCase.field.fill(String(inputCase.value));
    const expected = calculateFinishingCoat({
      surfaceAreaM2: Number(await surfaceArea.inputValue()),
      coatCount: Number(await coatCount.inputValue()),
      finishType: 'polyurethane',
    });
    await expect(calculator).toContainText(`${expected.volumeLitres.toFixed(2)} L`);
    await expect(calculator).toContainText(`${expected.dryTimeBetweenCoatsMin} min`);
    await expect(calculator).toContainText(`${expected.totalDryTimeHours} h`);

    await inputCase.field.fill('0');
    await expect(calculator.getByRole('alert')).toContainText(inputCase.error);
    await expect(calculator).not.toContainText(`${expected.volumeLitres.toFixed(2)} L`);
    await expect(calculator).not.toContainText(/NaN|Infinity/);

    await inputCase.field.fill(String(inputCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expect(calculator).toContainText(`${expected.volumeLitres.toFixed(2)} L`);
  }

  const finishLabels = ['Polyurethane', 'Lacquer', 'Shellac', 'Water-Based', 'Oil / Danish Oil'] as const;
  for (const finishType of ['polyurethane', 'lacquer', 'shellac', 'waterbased', 'oil'] as const) {
    const label = {
      polyurethane: 'Polyurethane',
      lacquer: 'Lacquer',
      shellac: 'Shellac',
      waterbased: 'Water-Based',
      oil: 'Oil / Danish Oil',
    }[finishType];
    const option = calculator.getByRole('button', { name: label, exact: true });
    await option.click();
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    for (const otherLabel of finishLabels) {
      if (otherLabel !== label) {
        await expect(calculator.getByRole('button', { name: otherLabel, exact: true })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      }
    }

    const expected = calculateFinishingCoat({
      surfaceAreaM2: Number(await surfaceArea.inputValue()),
      coatCount: Number(await coatCount.inputValue()),
      finishType,
    });
    await expect(calculator).toContainText(`${expected.volumeLitres.toFixed(2)} L`);
    await expect(calculator).toContainText(`${expected.dryTimeBetweenCoatsMin} min`);
    await expect(calculator).toContainText(`${expected.totalDryTimeHours} h`);
  }
});

test('box-joint inputs update the layout and reject zero values', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Box Joint Calculator');
  const parameters = { boardWidthMm: 150, fingerWidthMm: 12, depthMm: 18 };
  const cases = [
    { label: 'Board Width (mm)', field: 'boardWidthMm', value: 180, error: 'boardWidthMm must be positive' },
    {
      label: 'Desired Finger Width (mm)',
      field: 'fingerWidthMm',
      value: 15,
      error: 'fingerWidthMm must be positive',
    },
    {
      label: 'Joint Depth (board thickness) (mm)',
      field: 'depthMm',
      value: 22,
      error: 'depthMm must be positive',
    },
  ] as const;

  for (const controlCase of cases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));
    const expected = calculateBoxJoint(parameters);
    await expect(calculator).toContainText(String(expected.fingerCount));
    await expect(calculator).toContainText(`${expected.actualFingerWidthMm} mm`);
    await expect(calculator).toContainText(String(expected.socketCount));
    await expect(calculator).toContainText(`${expected.glueSurfaceMm2} mm²`);

    await field.fill('0');
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator).not.toContainText(/NaN|Infinity/);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
  }
});

test('router-circle dimensions and cut modes update geometry, reject invalid values, and recover', async ({
  appPage: page,
}) => {
  const parameters = {
    targetDiameterMm: 300,
    bitDiameterMm: 12,
    pivotHoleDiameterMm: 6,
    cutMode: 'disc' as CircleCutMode,
  };
  const calculator = await openCalculator(page, 'Router Circle Jig Calculator');

  const expectGeometry = async () => {
    const expected = calculateRouterCircle(parameters);
    const results = calculator.locator('dl dd');
    await expect(results.nth(0)).toHaveText(formatMillimeters(expected.armLengthMm, 'en', 1));
    await expect(results.nth(1)).toHaveText(formatMillimeters(expected.circumferenceMm, 'en', 1));
    await expect(results.nth(2)).toHaveText(
      `${formatNumber(expected.areaMm2, 'en', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm²`,
    );
    await expect(results.nth(3)).toHaveText(formatMillimeters(expected.pivotOffsetMm, 'en', 1));
  };

  const dimensionCases = [
    {
      label: 'Target Diameter (mm)',
      field: 'targetDiameterMm',
      value: 400,
      invalidValue: 0,
      error: 'targetDiameterMm must be greater than 0',
    },
    {
      label: 'Bit Diameter (mm)',
      field: 'bitDiameterMm',
      value: 15,
      invalidValue: 400,
      error: 'bitDiameterMm must be less than targetDiameterMm',
    },
    {
      label: 'Pivot Hole Diameter (mm)',
      field: 'pivotHoleDiameterMm',
      value: 8,
      invalidValue: 0,
      error: 'pivotHoleDiameterMm must be greater than 0',
    },
  ] as const;

  for (const controlCase of dimensionCases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));
    await expectGeometry();

    await field.fill(String(controlCase.invalidValue));
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectGeometry();
  }

  const cutMode = calculator.getByRole('combobox', { name: 'Cut Mode', exact: true });
  parameters.cutMode = 'hole';
  await cutMode.selectOption('hole');
  await expectGeometry();
  parameters.cutMode = 'disc';
  await cutMode.selectOption('disc');
  await expectGeometry();
});

test('drawer box controls recalculate dimensions, reject invalid values, and recover', async ({ appPage: page }) => {
  const parameters = {
    openingWidthMm: 500,
    openingHeightMm: 150,
    openingDepthMm: 550,
    slideType: 'side' as const,
    sideThicknessMm: 12,
  };
  const calculator = await openCalculator(page, 'Drawer Box Sizing Calculator');

  const dimensionCases = [
    { label: 'Opening Width (mm)', field: 'openingWidthMm', value: 600, error: 'openingWidthMm must be > 0' },
    { label: 'Opening Height (mm)', field: 'openingHeightMm', value: 180, error: 'openingHeightMm must be > 0' },
    { label: 'Cabinet Depth (mm)', field: 'openingDepthMm', value: 400, error: 'openingDepthMm must be > 0' },
    { label: 'Side Thickness (mm)', field: 'sideThicknessMm', value: 18, error: 'sideThicknessMm must be > 0' },
  ] as const;

  for (const controlCase of dimensionCases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));

    const expected = calculateDrawerBox(parameters);
    for (const dimension of [
      expected.boxWidthMm,
      expected.boxHeightMm,
      expected.boxDepthMm,
      expected.falseFrontWidthMm,
      expected.falseFrontHeightMm,
    ]) {
      await expect(calculator).toContainText(`${dimension.toFixed(1)} mm`);
    }

    await field.fill('0');
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator).not.toContainText(/NaN|Infinity/);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
  }

  const slideOptions = [
    ['Side Mount', 'side'],
    ['Bottom Mount', 'bottom'],
    ['Centre Mount', 'center'],
  ] as const;
  for (const [label, slideType] of slideOptions) {
    await calculator.getByRole('button', { name: label }).click();
    const expected = calculateDrawerBox({ ...parameters, slideType });
    await expect(calculator.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    await expect(calculator).toContainText(`${expected.boxWidthMm.toFixed(1)} mm`);
    for (const [otherLabel] of slideOptions) {
      if (otherLabel !== label) {
        await expect(calculator.getByRole('button', { name: otherLabel })).toHaveAttribute('aria-pressed', 'false');
      }
    }
  }

  await calculator.getByRole('button', { name: 'Bottom Mount' }).click();
  await calculator.getByRole('spinbutton', { name: 'Cabinet Depth (mm)' }).fill('300');
  const shortDepth = calculateDrawerBox({ ...parameters, openingDepthMm: 300, slideType: 'bottom' });
  await expect(calculator).toContainText(`${shortDepth.boxDepthMm.toFixed(1)} mm`);
  await expect(calculator).toContainText(/Box depth is short — verify slide length/);
});

test('screw density reconciles pullout force with engine and validates diameter', async ({ appPage: page }) => {
  const medium = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass: 'medium' });
  const high = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass: 'high' });
  const calculator = await openCalculator(page, 'Screw Pull-Out Strength Estimator');
  const force = calculator.locator('dl dd').first();
  await expect(calculator).toContainText('USDA equation 8-10a estimates short-term ultimate load');
  const formatForce = (value: number) =>
    `${formatNumber(value, 'en', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} N`;
  await expect(force).toHaveText(formatForce(medium.pulloutForceN));
  await calculator.getByRole('button', { name: 'High Density (Hickory, Teak)' }).click();
  await expect(force).toHaveText(formatForce(high.pulloutForceN));
  expect(high.pulloutForceN).toBeGreaterThan(medium.pulloutForceN);
  const densityOptions = [
    ['low', 'Low Density (Pine, Cedar)'],
    ['medium', 'Medium Density (Maple, Oak)'],
    ['high', 'High Density (Hickory, Teak)'],
    ['sheet', 'Sheet Goods (Plywood, MDF)'],
  ] as const;
  for (const [densityClass, label] of densityOptions) {
    const expected = calculateScrewPullout({ screwDiameterMm: 4, threadLengthMm: 30, densityClass });
    await calculator.getByRole('button', { name: label }).click();
    await expect(force).toHaveText(formatForce(expected.pulloutForceN));
    await expect(calculator).toContainText(
      `${formatNumber(expected.pulloutForceLbf, 'en', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} lbf`,
    );
    await expect(calculator).toContainText(
      `${formatNumber(expected.withdrawalResistanceMPa, 'en', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MPa`,
    );
    await expect(calculator.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    for (const [, otherLabel] of densityOptions) {
      if (otherLabel !== label) {
        await expect(calculator.getByRole('button', { name: otherLabel })).toHaveAttribute('aria-pressed', 'false');
      }
    }
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
    await expect(force).toHaveText(formatForce(expected.pulloutForceN));
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

test('stair stringer dimensions update geometry, reject invalid values, and recover', async ({ appPage: page }) => {
  const parameters = { totalRiseMm: 2800, treadDepthMm: 280, idealRiserMm: 175 };
  const calculator = await openCalculator(page, 'Stair Stringer Calculator');

  const expectGeometry = async () => {
    const expected = calculateStairStringer(parameters);
    await expect(calculator).toContainText(String(expected.riserCount));
    await expect(calculator).toContainText(`${expected.actualRiserMm} mm`);
    await expect(calculator).toContainText(String(expected.treadCount));
    await expect(calculator).toContainText(`${expected.totalRunMm} mm`);
    await expect(calculator).toContainText(`${expected.stringerLengthMm} mm`);
    await expect(calculator).toContainText(`${expected.stringerAngleDeg}°`);
  };

  const dimensionCases = [
    { label: 'Total Rise (mm)', field: 'totalRiseMm', value: 3000, error: 'totalRiseMm must be > 0' },
    { label: 'Tread Depth (mm)', field: 'treadDepthMm', value: 300, error: 'treadDepthMm must be > 0' },
    {
      label: 'Ideal Riser Height (mm)',
      field: 'idealRiserMm',
      value: 180,
      error: 'idealRiserMm must be > 0',
    },
  ] as const;

  for (const controlCase of dimensionCases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));
    await expectGeometry();
    await expect(calculator).toContainText('Passes IRC 2021 riser and tread limits');

    await field.fill('0');
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectGeometry();
  }

  parameters.treadDepthMm = 200;
  await calculator.getByRole('spinbutton', { name: 'Tread Depth (mm)', exact: true }).fill('200');
  await expectGeometry();
  await expect(calculator.getByRole('alert')).toContainText('Tread depth below IRC minimum 10" (254 mm)');
  await expect(calculator).not.toContainText('Passes IRC 2021 riser and tread limits');
});

test('planer dimensions update passes, reject invalid values, and recover', async ({ appPage: page }) => {
  const parameters = {
    initialThicknessMm: 50,
    targetThicknessMm: 45,
    maxPassDepthMm: 1.5,
    boardLengthMm: 1000,
    snipeLengthMm: 50,
  };
  const calculator = await openCalculator(page, 'Lumber Planer Pass Calculator');

  const expectPlan = async () => {
    const expected = calculatePlanerPasses(parameters);
    const results = calculator.locator('dl dd');
    await expect(results.nth(0)).toHaveText(String(expected.passCount));
    await expect(results.nth(1)).toHaveText(`${expected.depthPerPassMm} mm`);
    await expect(results.nth(2)).toHaveText(`${expected.totalRemovalMm} mm`);
    await expect(results.nth(3)).toHaveText(`${expected.snipeAllowanceMm} mm`);
    await expect(results.nth(4)).toHaveText(`${expected.effectiveLengthMm} mm`);
  };

  const dimensionCases = [
    {
      label: 'Initial Thickness (mm)',
      field: 'initialThicknessMm',
      value: 55,
      invalidValue: 0,
      error: 'initialThicknessMm must be positive',
    },
    {
      label: 'Target Thickness (mm)',
      field: 'targetThicknessMm',
      value: 43,
      invalidValue: 55,
      error: 'targetThicknessMm must be less than initialThicknessMm',
    },
    {
      label: 'Max Pass Depth (mm)',
      field: 'maxPassDepthMm',
      value: 2,
      invalidValue: 0,
      error: 'maxPassDepthMm must be positive',
    },
    {
      label: 'Snipe Length (each end) (mm)',
      field: 'snipeLengthMm',
      value: 60,
      invalidValue: -1,
      error: 'snipeLengthMm must be non-negative',
    },
    {
      label: 'Board Length (mm)',
      field: 'boardLengthMm',
      value: 1500,
      invalidValue: 0,
      error: 'boardLengthMm must be positive',
    },
  ] as const;

  for (const controlCase of dimensionCases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));
    await expectPlan();

    await field.fill(String(controlCase.invalidValue));
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectPlan();
  }
});

test('honing guide dimensions update projections, reject invalid values, and recover', async ({ appPage: page }) => {
  const parameters = { bevelAngleDeg: 25, guideHeightMm: 25, microbevelDeg: 0 };
  const calculator = await openCalculator(page, 'Honing Guide Calculator');

  const expectProjection = async () => {
    const expected = calculateHoningGuide(parameters);
    const results = calculator.locator('dl dd');
    await expect(results.nth(0)).toHaveText(`${expected.projectionMm.toFixed(1)} mm`);
    if (expected.microbevelProjectionMm === null) {
      await expect(results).toHaveCount(2);
      await expect(results.nth(1)).toHaveText(`${expected.actualBevelAngleDeg}°`);
      return;
    }

    await expect(results).toHaveCount(3);
    await expect(results.nth(1)).toHaveText(`${expected.microbevelProjectionMm.toFixed(1)} mm`);
    await expect(results.nth(2)).toHaveText(`${expected.actualBevelAngleDeg}°`);
  };

  const dimensionCases = [
    {
      label: 'Bevel Angle (°)',
      field: 'bevelAngleDeg',
      value: 35,
      invalidValue: 90,
      error: 'bevelAngleDeg must be between 0° and 90° (exclusive)',
    },
    {
      label: 'Guide Height (mm)',
      field: 'guideHeightMm',
      value: 30,
      invalidValue: 0,
      error: 'guideHeightMm must be greater than 0',
    },
  ] as const;

  for (const controlCase of dimensionCases) {
    parameters[controlCase.field] = controlCase.value;
    const field = calculator.getByRole('spinbutton', { name: controlCase.label, exact: true });
    await field.fill(String(controlCase.value));
    await expectProjection();

    await field.fill(String(controlCase.invalidValue));
    await expect(calculator.getByRole('alert')).toContainText(controlCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);
    await field.fill(String(controlCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectProjection();
  }

  parameters.microbevelDeg = 3;
  const microbevel = calculator.getByRole('spinbutton', { name: 'Micro-Bevel Angle (°)', exact: true });
  await microbevel.fill('3');
  await expectProjection();
  await microbevel.fill('45');
  await expect(calculator.getByRole('alert')).toContainText('microbevelDeg must be less than 45°');
  await expect(calculator.locator('dl')).toHaveCount(0);
  await microbevel.fill('3');
  await expect(calculator.getByRole('alert')).toHaveCount(0);
  await expectProjection();
});

test('router-template controls reconcile offsets and recover from invalid dimensions', async ({ appPage: page }) => {
  const parameters: Parameters<typeof calculateRouterTemplate>[0] = {
    bushingODMm: 20,
    bitDiameterMm: 12,
    cutType: 'inside',
    nominalDimensionMm: 100,
  };
  const calculator = await openCalculator(page, 'Router Template Offset');

  const expectResults = async () => {
    const expected = calculateRouterTemplate(parameters);
    const results = calculator.locator('dl dd');
    await expect(results.nth(0)).toHaveText(`${expected.offsetMm.toFixed(3)} mm`);
    await expect(results.nth(1)).toHaveText(
      `${expected.templateAdjustmentPerSideMm > 0 ? '+' : ''}${expected.templateAdjustmentPerSideMm.toFixed(3)} mm`,
    );
    await expect(results.nth(2)).toHaveText(
      `${expected.totalTemplateAdjustmentMm > 0 ? '+' : ''}${expected.totalTemplateAdjustmentMm.toFixed(3)} mm`,
    );
    await expect(results.nth(3)).toHaveText(`${expected.adjustedDimensionMm?.toFixed(3)} mm`);
  };

  await calculator.getByRole('spinbutton', { name: 'Nominal Feature Dimension (mm)', exact: true }).fill('100');
  await expectResults();

  const dimensionCases = [
    {
      label: 'Bushing OD (mm)',
      value: 24,
      invalidValue: 0,
      error: 'bushingODMm must be greater than 0',
      field: 'bushingODMm',
    },
    {
      label: 'Bit Diameter (mm)',
      value: 16,
      invalidValue: 24,
      error: 'bushingODMm must be greater than bitDiameterMm',
      field: 'bitDiameterMm',
    },
    {
      label: 'Nominal Feature Dimension (mm)',
      value: 120,
      invalidValue: 0,
      error: 'nominalDimensionMm must be greater than 0',
      field: 'nominalDimensionMm',
    },
  ] as const;

  for (const dimensionCase of dimensionCases) {
    const field = calculator.getByRole('spinbutton', { name: dimensionCase.label, exact: true });
    Object.assign(parameters, { [dimensionCase.field]: dimensionCase.value });
    await field.fill(String(dimensionCase.value));
    await expectResults();

    await field.fill(String(dimensionCase.invalidValue));
    await expect(calculator.getByRole('alert')).toContainText(dimensionCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);

    await field.fill(String(dimensionCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectResults();
  }

  const cutType = calculator.getByRole('combobox', { name: 'Cut Type', exact: true });
  for (const value of ['inside', 'outside'] as const) {
    parameters.cutType = value;
    await cutType.selectOption(value);
    await expect(cutType).toHaveValue(value);
    await expectResults();
  }
});

test('half-lap dimensions reconcile with the engine and recover from invalid values', async ({ appPage: page }) => {
  const parameters: Parameters<typeof calculateHalfLap>[0] = {
    board1ThicknessMm: 19,
    board1WidthMm: 90,
    board2ThicknessMm: 19,
    board2WidthMm: 90,
    lapType: 'end_lap',
  };
  const calculator = await openCalculator(page, 'Half-Lap Joint');

  const expectResults = async () => {
    const expected = calculateHalfLap(parameters);
    const results = calculator.locator('dl dd');
    await expect(results.nth(0)).toHaveText(`${expected.board1NotchDepthMm.toFixed(1)} mm`);
    await expect(results.nth(1)).toHaveText(`${expected.board1NotchWidthMm.toFixed(1)} mm`);
    await expect(results.nth(2)).toHaveText(`${expected.board2NotchDepthMm.toFixed(1)} mm`);
    await expect(results.nth(3)).toHaveText(`${expected.board2NotchWidthMm.toFixed(1)} mm`);
    await expect(results.nth(4)).toHaveText(
      `${formatNumber(expected.totalGlueAreaMm2, 'en', { maximumFractionDigits: 0 })} mm²`,
    );
    await expect(results.nth(5)).toHaveText(`${expected.finishedThicknessMm.toFixed(1)} mm`);
  };

  await expectResults();

  const dimensionCases = [
    {
      label: 'Board 1 Thickness (mm)',
      field: 'board1ThicknessMm',
      value: 20,
      error: 'board1ThicknessMm must be greater than 0',
    },
    {
      label: 'Board 1 Width (mm)',
      field: 'board1WidthMm',
      value: 120,
      error: 'board1WidthMm must be greater than 0',
    },
    {
      label: 'Board 2 Thickness (mm)',
      field: 'board2ThicknessMm',
      value: 22,
      error: 'board2ThicknessMm must be greater than 0',
    },
    {
      label: 'Board 2 Width (mm)',
      field: 'board2WidthMm',
      value: 130,
      error: 'board2WidthMm must be greater than 0',
    },
  ] as const;

  for (const dimensionCase of dimensionCases) {
    const field = calculator.getByRole('spinbutton', { name: dimensionCase.label, exact: true });
    Object.assign(parameters, { [dimensionCase.field]: dimensionCase.value });
    await field.fill(String(dimensionCase.value));
    await expectResults();

    await field.fill('0');
    await expect(calculator.getByRole('alert')).toContainText(dimensionCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);

    await field.fill(String(dimensionCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectResults();
  }

  const lapType = calculator.getByRole('combobox', { name: 'Lap Type', exact: true });
  for (const value of ['end_lap', 't_lap', 'cross_lap'] as const) {
    parameters.lapType = value;
    await lapType.selectOption(value);
    await expect(lapType).toHaveValue(value);
    await expectResults();
  }
});

test('spline dimensions reconcile with the engine and recover from invalid values', async ({ appPage: page }) => {
  const parameters: Parameters<typeof calculateSplineJoint>[0] = {
    boardThicknessMm: 19,
    splineThicknessMm: 3,
    slotDepthPerBoardMm: 6,
    jointLengthMm: 120,
    splineCount: 2,
  };
  const calculator = await openCalculator(page, 'Spline Joint');
  const locale = (await page.locator('html').getAttribute('lang')) ?? 'en';

  const expectResults = async () => {
    const expected = calculateSplineJoint(parameters);
    const results = calculator.locator('dl dd');
    await expect(results.nth(0)).toHaveText(`${expected.recommendedSlotWidthMm.toFixed(2)} mm`);
    await expect(results.nth(1)).toHaveText(`${expected.totalInsertionDepthMm.toFixed(2)} mm`);
    await expect(results.nth(2)).toHaveText(`${expected.remainingWallThicknessMm.toFixed(2)} mm`);
    await expect(results.nth(3)).toHaveText(`${expected.totalSplineLengthMm.toFixed(1)} mm`);
    await expect(results.nth(4)).toHaveText(
      `${formatNumber(expected.glueAreaPerSplineMm2, locale, { maximumFractionDigits: 0 })} mm²`,
    );
    await expect(results.nth(5)).toHaveText(
      `${formatNumber(expected.totalGlueAreaMm2, locale, { maximumFractionDigits: 0 })} mm²`,
    );
  };

  await expectResults();

  const dimensionCases = [
    {
      label: 'Board Thickness (mm)',
      field: 'boardThicknessMm',
      value: 24,
      invalidValue: 0,
      error: 'boardThicknessMm must be > 0',
    },
    {
      label: 'Spline Thickness (mm)',
      field: 'splineThicknessMm',
      value: 4,
      invalidValue: 24,
      error: 'splineThicknessMm must be < boardThicknessMm',
    },
    {
      label: 'Slot Depth per Board (mm)',
      field: 'slotDepthPerBoardMm',
      value: 8,
      invalidValue: 24,
      error: 'slotDepthPerBoardMm must be < boardThicknessMm',
    },
    {
      label: 'Joint Length (mm)',
      field: 'jointLengthMm',
      value: 180,
      invalidValue: 0,
      error: 'jointLengthMm must be > 0',
    },
    {
      label: 'Number of Splines',
      field: 'splineCount',
      value: 3,
      invalidValue: 2.5,
      error: 'splineCount must be a positive safe integer',
    },
  ] as const;

  for (const dimensionCase of dimensionCases) {
    const field = calculator.getByRole('spinbutton', { name: dimensionCase.label, exact: true });
    Object.assign(parameters, { [dimensionCase.field]: dimensionCase.value });
    await field.fill(String(dimensionCase.value));
    await expectResults();

    await field.fill(String(dimensionCase.invalidValue));
    await expect(calculator.getByRole('alert')).toContainText(dimensionCase.error);
    await expect(calculator.locator('dl')).toHaveCount(0);

    await field.fill(String(dimensionCase.value));
    await expect(calculator.getByRole('alert')).toHaveCount(0);
    await expectResults();
  }
});

test('shelf span changes reconcile deflection with the engine', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Shelf Sag Calculator');
  const span = calculator.getByRole('spinbutton', { name: 'Shelf Span (mm)', exact: true });
  for (const spanMm of [800, 1000]) {
    const expected = calculateDeflection({
      spanMm,
      widthMm: 400,
      thicknessMm: 18,
      material: 'plywood',
      loadType: 'uniform',
      loadN: 20 * 9.81,
      support: 'simple',
    });
    await span.fill(String(spanMm));
    await expect(calculator).toContainText(`${expected.maxDeflectionMm.toFixed(2)} mm`);
    await expect(calculator).toContainText(`${expected.recommendedMaxSpanMm} mm`);
  }
});

test('pocket-hole joint length changes reconcile screw spacing with the engine', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Pocket Hole Calculator');
  const length = calculator.getByRole('spinbutton', { name: 'Joint Length (mm)', exact: true });
  for (const jointLengthMm of [600, 1200]) {
    const expected = calculatePocketHole({
      workpieceThicknessMm: 18,
      matingThicknessMm: 18,
      jointLengthMm,
      materialHardness: 'plywood',
      jointType: 'butt',
    });
    await length.fill(String(jointLengthMm));
    await expect(calculator).toContainText(String(expected.screwCount));
    await expect(calculator).toContainText(`${expected.spacingMm} mm`);
  }
});

test('dowel joint length changes reconcile positions with the engine', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Dowel Joint Calculator');
  const length = calculator.getByRole('spinbutton', { name: 'Joint Length (mm)', exact: true });
  for (const jointLengthMm of [600, 1000]) {
    const expected = calculateDowelJoint({ jointLengthMm, boardThicknessMm: 18, orientation: 'edge_to_face' });
    await length.fill(String(jointLengthMm));
    await expect(calculator).toContainText(`${expected.count}`);
    await expect(calculator).toContainText(`${expected.spacingMm} mm`);
  }
});

test('mortise-tenon joint type changes reconcile tenon length with the engine', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Mortise & Tenon Calculator');
  const jointType = calculator.getByRole('combobox', { name: 'Joint Type', exact: true });
  for (const value of ['through', 'blind'] as const) {
    const expected = calculateMortiseTenon({ stockThicknessMm: 18, stockWidthMm: 54, jointType: value });
    await jointType.selectOption(value);
    await expect(calculator).toContainText(`${expected.tenonLengthMm} mm`);
    await expect(calculator).toContainText(`${expected.mortiseDepthMm} mm`);
  }
});

test('dovetail tail count changes reconcile layout widths with the engine', async ({ appPage: page }) => {
  const calculator = await openCalculator(page, 'Dovetail Layout Calculator');
  const tailCount = calculator.getByRole('spinbutton', { name: 'Number of Tails', exact: true });
  for (const count of [4, 5]) {
    const expected = calculateDovetailLayout({
      boardWidthMm: 250,
      boardThicknessMm: 18,
      tailCount: count,
      angleDegrees: 8,
      jointType: 'through',
      style: 'hand_cut',
    });
    await tailCount.fill(String(count));
    await expect(calculator).toContainText(`${expected.tails[0]?.narrowWidthMm ?? 0} mm`);
    await expect(calculator).toContainText(expected.slopeRatio);
  }
});

test('roadmap calculator options reconcile with engine', async ({ appPage: page }) => {
  const pocketHole = await openCalculator(page, 'Pocket Hole Calculator');
  const pocketParameters = {
    workpieceThicknessMm: 18,
    matingThicknessMm: 18,
    jointLengthMm: 200,
    materialHardness: 'hardwood' as const,
    jointType: 'butt' as const,
  };
  await pocketHole.getByLabel('Joint Length (mm)').fill(String(pocketParameters.jointLengthMm));
  let pocketResult = calculatePocketHole(pocketParameters);
  await expect(pocketHole.locator('dl dd').nth(3)).toHaveText(`${pocketResult.spacingMm} mm`);

  const shelf = await openCalculator(page, 'Shelf Sag Calculator');
  const shelfParameters = {
    spanMm: 800,
    widthMm: 300,
    thicknessMm: 18,
    material: 'plywood' as const,
    loadType: 'uniform' as const,
    loadN: 100,
    support: 'simple' as const,
  };
  await shelf.getByLabel('Shelf Span (mm)').fill(String(shelfParameters.spanMm));
  let shelfResult = calculateDeflection(shelfParameters);
  await expect(shelf.locator('dl dd').nth(0)).toHaveText(`${shelfResult.maxDeflectionMm} mm`);

  const mortise = await openCalculator(page, 'Mortise & Tenon Calculator');
  const mortiseParameters = { stockThicknessMm: 30, stockWidthMm: 90, jointType: 'blind' as const };
  await mortise.getByLabel('Stock Thickness (mm)').fill(String(mortiseParameters.stockThicknessMm));
  let mortiseResult = calculateMortiseTenon(mortiseParameters);
  await expect(mortise.locator('dl dd').nth(0)).toHaveText(`${mortiseResult.tenonThicknessMm} mm`);

  const dovetail = await openCalculator(page, 'Dovetail Layout Calculator');
  const dovetailParameters = {
    boardWidthMm: 200,
    boardThicknessMm: 18,
    tailCount: 3,
    angleDegrees: 10,
    jointType: 'through' as const,
    style: 'hand_cut' as const,
  };
  await dovetail.getByLabel('Number of Tails').fill(String(dovetailParameters.tailCount));
  const dovetailResult = calculateDovetailLayout(dovetailParameters);
  await expect(dovetail.locator('dl dd').nth(2)).toHaveText(`${dovetailResult.tails[0]!.narrowWidthMm.toFixed(1)} mm`);
});

test('invalid roadmap calculator inputs report errors and recover', async ({ appPage: page }) => {
  const pocketHole = await openCalculator(page, 'Pocket Hole Calculator');
  await pocketHole.getByLabel('Workpiece Thickness (mm)').fill('0');
  await expect(pocketHole.getByRole('alert')).toContainText('workpieceThicknessMm must be > 0');
  await pocketHole.getByLabel('Workpiece Thickness (mm)').fill('18');
  await expect(pocketHole.getByRole('alert')).toHaveCount(0);

  const shelf = await openCalculator(page, 'Shelf Sag Calculator');
  await shelf.getByLabel('Shelf Span (mm)').fill('0');
  await expect(shelf.getByRole('alert')).toContainText('spanMm must be > 0');
  await shelf.getByLabel('Shelf Span (mm)').fill('600');
  await expect(shelf.getByRole('alert')).toHaveCount(0);

  const mortise = await openCalculator(page, 'Mortise & Tenon Calculator');
  await mortise.getByLabel('Stock Thickness (mm)').fill('0');
  await expect(mortise.getByRole('alert')).toContainText('stockThicknessMm must be > 0');
  await mortise.getByLabel('Stock Thickness (mm)').fill('18');
  await expect(mortise.getByRole('alert')).toHaveCount(0);

  const dovetail = await openCalculator(page, 'Dovetail Layout Calculator');
  await dovetail.getByLabel('Number of Tails').fill('0');
  await expect(dovetail.getByRole('alert')).toContainText('tailCount must be a positive integer');
  await dovetail.getByLabel('Number of Tails').fill('5');
  await expect(dovetail.getByRole('alert')).toHaveCount(0);
});
