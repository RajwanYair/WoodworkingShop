import type { Locator, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import WORKSPACE_CONTROL_INVENTORY from '../fixtures/workspace-control-inventory.json' with { type: 'json' };
import { expect, test } from './fixtures/app';

async function showParts(page: Page) {
  await page.getByRole('tab', { name: 'Cut Sheets' }).click();
  await expect(page.getByRole('heading', { name: 'Parts List' })).toBeVisible();
}

function partRow(page: Page, name: string) {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) });
}

function getControlMetadata(control: object) {
  const scope = 'scope' in control && typeof control.scope === 'string' ? control.scope : undefined;
  const state = 'state' in control && typeof control.state === 'string' ? control.state : undefined;
  return { scope, state };
}

function getNegativeEvidence(control: object) {
  const negativeTest =
    'negativeTest' in control && typeof control.negativeTest === 'string' ? control.negativeTest : undefined;
  const negativeWaiver =
    'negativeWaiver' in control && typeof control.negativeWaiver === 'string' ? control.negativeWaiver : undefined;
  return negativeTest ?? negativeWaiver;
}

function getAccessibleControl(scope: Locator, role: string, accessibleName: string) {
  const options = { name: accessibleName, exact: true };
  switch (role) {
    case 'button':
      return scope.getByRole('button', options);
    case 'checkbox':
      return scope.getByRole('checkbox', options);
    case 'combobox':
      return scope.getByRole('combobox', options);
    case 'slider':
      return scope.getByRole('slider', options);
    case 'spinbutton':
      return scope.getByRole('spinbutton', options);
    case 'tab':
      return scope.getByRole('tab', options);
    case 'radio':
      return scope.getByRole('radio', options);
    case 'textbox':
      return scope.getByRole('textbox', options);
    default:
      throw new Error(`Unsupported workspace control role: ${role}`);
  }
}

test('configurator choice controls match the browser-derived accessible inventory', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();
  await page.getByRole('radio', { name: 'Cabinet', exact: true }).waitFor();

  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((panel) => panel.name === 'Configurator');
  if (!inventory) throw new Error('Configurator control inventory is missing');

  for (const control of inventory.controls) {
    const scope = getControlMetadata(control).scope;
    if (!scope) throw new Error(`Configurator control ${control.accessibleName} has no group scope`);
    const group = page.getByRole('group', { name: scope, exact: true });
    await expect(getAccessibleControl(group, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(control.negativeWaiver).toBeTruthy();
  }

  for (const scope of ['🪑 Furniture Type', '🔧 Joinery Method']) {
    const group = page.getByRole('group', { name: scope, exact: true });
    const expectedCount = inventory.controls.filter((control) => getControlMetadata(control).scope === scope).length;
    await expect(group.getByRole('radio')).toHaveCount(expectedCount);
  }
});

test('Configure materials and conditional controls match the browser-derived inventory', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const main = page.getByRole('main');
  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find(
    (panel) => panel.name === 'Configure materials and conditional options',
  );
  if (!inventory) throw new Error('Configure materials and options inventory is missing');

  for (const control of inventory.controls.filter((item) => !getControlMetadata(item).state)) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }

  const customShelfPositionControl = inventory.controls.find(
    (control) => getControlMetadata(control).state === 'custom-shelf',
  );
  if (!customShelfPositionControl) throw new Error('Custom shelf position inventory entry is missing');
  const shelfPosition = getAccessibleControl(
    main,
    customShelfPositionControl.role,
    customShelfPositionControl.accessibleName,
  );
  await expect(shelfPosition).toHaveCount(0);
  await main.getByRole('radio', { name: 'Custom', exact: true }).check();
  await expect(shelfPosition).toHaveCount(1);
  await main.getByRole('radio', { name: 'Equal', exact: true }).check();
  await expect(shelfPosition).toHaveCount(0);

  const drawerSlideControls = inventory.controls.filter((control) => getControlMetadata(control).state === 'drawers');
  for (const control of drawerSlideControls) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(0);
  }
  const drawerCount = main.getByRole('spinbutton', { name: 'Number of Drawers' });
  await drawerCount.fill('2');
  await drawerCount.press('Enter');
  for (const control of drawerSlideControls) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }

  const panelSources = inventory.controls.filter((control) => getControlMetadata(control).state === 'panel');
  for (const control of panelSources) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(0);
  }
  await page.getByText('Panel', { exact: true }).click();
  for (const control of panelSources) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }
});

test('Configure core dimensions match the browser-derived inventory', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((panel) => panel.name === 'Configure core dimensions');
  if (!inventory) throw new Error('Configure dimensions inventory is missing');

  for (const control of inventory.controls) {
    await expect(getAccessibleControl(page.getByRole('main'), control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }
});

test('Configure dimension sliders and toe-kick presets match inventory and update values', async ({
  appPage: page,
}) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const main = page.getByRole('main');
  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find(
    (panel) => panel.name === 'Configure dimension sliders and toe kick',
  );
  if (!inventory) throw new Error('Configure slider inventory is missing');

  for (const control of inventory.controls.filter((item) => getControlMetadata(item).state !== 'imperial')) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }

  const imperialSliders = inventory.controls.filter((item) => getControlMetadata(item).state === 'imperial');
  for (const control of imperialSliders) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(0);
  }

  await main.getByRole('button', { name: 'mm → in', exact: true }).click();
  for (const control of imperialSliders) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
  }
  await expect(main.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue('39.37');
  await main.getByRole('button', { name: 'in → mm', exact: true }).click();
  await expect(main.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue('1000');

  const kickHeight = main.getByRole('spinbutton', { name: 'Toe Kick Height (0 = no kick)', exact: true });
  let testedPresetCount = 0;
  for (const control of inventory.controls) {
    if (!('role' in control) || control.role !== 'button') continue;
    if (!('accessibleName' in control) || typeof control.accessibleName !== 'string') continue;
    const kickHeightMatch = /^Set kick height to (\d+) mm$/.exec(control.accessibleName);
    if (!kickHeightMatch) continue;
    await main.getByRole('button', { name: control.accessibleName, exact: true }).click();
    await expect(kickHeight).toHaveValue(kickHeightMatch[1]);
    testedPresetCount += 1;
  }
  expect(testedPresetCount).toBe(4);
});

test('dimension slider uses 1 mm steps for pen and restores 10 mm steps for mouse', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const widthSlider = page.getByRole('slider', { name: 'Width (mm)', exact: true });
  const minimum = Number(await widthSlider.getAttribute('min'));

  await widthSlider.dispatchEvent('pointerdown', { pointerType: 'pen' });
  await expect(widthSlider).toHaveAttribute('step', '1');
  await widthSlider.focus();
  await widthSlider.press('Home');
  await widthSlider.press('ArrowRight');
  await expect(widthSlider).toHaveValue(String(minimum + 1));

  await widthSlider.dispatchEvent('pointerdown', { pointerType: 'mouse' });
  await expect(widthSlider).toHaveAttribute('step', '10');
  await widthSlider.press('Home');
  await widthSlider.press('ArrowRight');
  await expect(widthSlider).toHaveValue(String(minimum + 10));
});

test('Configure quick preset controls match the browser-derived inventory', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const main = page.getByRole('main');
  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((panel) => panel.name === 'Configure quick presets');
  if (!inventory) throw new Error('Configure quick preset inventory is missing');

  for (const control of inventory.controls) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBe(
      'built-in presets update configuration and parts, and saved presets survive reload',
    );
    expect(getNegativeEvidence(control)).toBeTruthy();
  }
});

test('Configure named expression controls match the browser-derived inventory', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const panel = page.getByRole('region', { name: 'Named parametric expressions panel' });
  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((item) => item.name === 'Configure named expressions');
  if (!inventory) throw new Error('Configure named expression inventory is missing');

  for (const control of inventory.controls) {
    await expect(getAccessibleControl(panel, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }
});

test('Configure project metadata controls match inventory and update title and notes', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const main = page.getByRole('main');
  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((item) => item.name === 'Configure project metadata');
  if (!inventory) throw new Error('Configure project metadata inventory is missing');

  for (const control of inventory.controls) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBe('Configure project metadata updates the browser title and notes');
    expect(getNegativeEvidence(control)).toBeTruthy();
  }

  const projectName = main.getByRole('textbox', { name: 'Project Name', exact: true });
  const projectNotes = main.getByRole('textbox', { name: 'Project Notes', exact: true });
  await projectName.fill('Roadmap QA');
  await projectNotes.fill('Checking project metadata behavior.');
  await expect.poll(() => page.title()).toBe('Roadmap QA — WoodworkingShop');
  await expect(projectNotes).toHaveValue('Checking project metadata behavior.');
});

test('Configure Door Reveal updates paired controls and rejects out-of-range input', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const main = page.getByRole('main');
  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((item) => item.name === 'Configure door reveal');
  if (!inventory) throw new Error('Configure Door Reveal inventory is missing');

  for (const control of inventory.controls) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBe('Configure Door Reveal updates the paired range and number controls');
    expect(getNegativeEvidence(control)).toBe('Configure Door Reveal rejects out-of-range numeric input');
  }

  const doorRevealSlider = main.getByRole('slider', { name: 'Door Reveal (gap)', exact: true });
  const doorRevealInput = main.getByRole('spinbutton', { name: 'Door Reveal (gap)', exact: true });
  await doorRevealInput.fill('4.5');
  await doorRevealInput.press('Enter');
  await expect(doorRevealSlider).toHaveValue('4.5');
  await expect(doorRevealInput).toHaveValue('4.5');

  await doorRevealInput.fill('20.5');
  await doorRevealInput.press('Enter');
  await expect(doorRevealInput).toHaveValue('4.5');
});

test('Workspace cabinet lifecycle controls match inventory across selection states', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const main = page.getByRole('main');
  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((item) => item.name === 'Workspace cabinet lifecycle');
  if (!inventory) throw new Error('Workspace cabinet lifecycle inventory is missing');

  const initialControls = inventory.controls.filter((control) => getControlMetadata(control).state === 'initial');
  for (const control of initialControls) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }

  await main.getByRole('button', { name: '+ Add Cabinet', exact: true }).click();
  const multiCabinetControls = inventory.controls.filter(
    (control) => getControlMetadata(control).state === 'multi-cabinet',
  );
  for (const control of multiCabinetControls) {
    await expect(getAccessibleControl(main, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }

  await main.getByRole('button', { name: /^Cabinet 2\d+ parts$/ }).dblclick();
  const renameControl = inventory.controls.find((control) => getControlMetadata(control).state === 'renaming');
  if (!renameControl) throw new Error('Workspace cabinet rename inventory is missing');
  await expect(getAccessibleControl(main, renameControl.role, renameControl.accessibleName)).toHaveCount(1);
});

test('Cabinet summary cost edit controls match the browser-derived inventory', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+3');

  const summary = page.getByRole('complementary', { name: 'Cabinet summary' });
  await expect(summary).toBeVisible();
  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((panel) => panel.name === 'Cabinet summary cost edits');
  if (!inventory) throw new Error('Cabinet summary cost inventory is missing');

  for (const control of inventory.controls) {
    if (!('triggerTitle' in control) || typeof control.triggerTitle !== 'string') {
      throw new Error(`Cost control ${control.accessibleName} has no edit trigger`);
    }
    await summary.getByTitle(control.triggerTitle).first().click();
    const input = getAccessibleControl(summary, control.role, control.accessibleName);
    await expect(input).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
    await input.press('Escape');
    await expect(input).toHaveCount(0);
  }
});

test('Assembly controls match the inventory and update view, tips, progress, and download', async ({
  appPage: page,
}) => {
  await page.getByRole('tab', { name: 'Assembly' }).click();

  const main = page.getByRole('main');
  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((panel) => panel.name === 'Assembly guide controls');
  if (!inventory) throw new Error('Assembly control inventory is missing');

  for (const control of inventory.controls.filter((item) => !getControlMetadata(item).state)) {
    const scope =
      getControlMetadata(control).scope === 'first-step' ? main.locator('[data-assembly-step="true"]').first() : main;
    const accessibleControl = getAccessibleControl(scope, control.role, control.accessibleName);
    await expect(accessibleControl).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }

  const showTipsControl = inventory.controls.find((item) => getControlMetadata(item).state === 'tips-hidden');
  const resetProgressControl = inventory.controls.find((item) => getControlMetadata(item).state === 'completed');
  if (!showTipsControl || !resetProgressControl)
    throw new Error('Assembly conditional control inventory is incomplete');
  const showTips = getAccessibleControl(main, showTipsControl.role, showTipsControl.accessibleName);
  const resetProgress = getAccessibleControl(main, resetProgressControl.role, resetProgressControl.accessibleName);
  await expect(showTips).toHaveCount(0);
  await expect(resetProgress).toHaveCount(0);

  await main.getByRole('button', { name: 'Hide tips', exact: true }).click();
  await expect(showTips).toHaveCount(1);
  await showTips.click();
  await expect(main.getByRole('button', { name: 'Hide tips', exact: true })).toHaveCount(1);

  const assemblySteps = main.locator('[data-assembly-step="true"]');
  const firstStep = assemblySteps.first();
  const stepCompletion = firstStep.getByRole('checkbox', { name: 'Mark as done', exact: true });
  const dependentStepCompletion = assemblySteps.nth(1).getByRole('checkbox', { name: 'Mark as done', exact: true });
  await expect(dependentStepCompletion).toBeDisabled();
  await stepCompletion.check();
  await expect(dependentStepCompletion).toBeEnabled();
  await dependentStepCompletion.check();
  await firstStep.getByRole('checkbox', { name: 'Done', exact: true }).uncheck();
  await expect(dependentStepCompletion).toBeDisabled();
  await expect(dependentStepCompletion).not.toBeChecked();
  await firstStep.getByRole('checkbox', { name: 'Mark as done', exact: true }).check();
  const completedStep = main
    .locator('[data-assembly-step="true"]')
    .first()
    .getByRole('checkbox', { name: 'Done', exact: true });
  await expect(completedStep).toBeChecked();
  await expect(main.getByText(/1\/\d+ steps completed/)).toBeVisible();
  await expect(resetProgress).toHaveCount(1);
  await resetProgress.click();
  await expect(
    main.locator('[data-assembly-step="true"]').first().getByRole('checkbox', { name: 'Mark as done', exact: true }),
  ).not.toBeChecked();
  await expect(resetProgress).toHaveCount(0);

  await main.getByRole('button', { name: 'Step by step', exact: true }).click();
  await expect(main.getByRole('button', { name: 'Step by step', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const previousStep = main.getByRole('button', { name: /Previous/ });
  const nextStep = main.getByRole('button', { name: /Next/ });
  await expect(previousStep).toBeDisabled();
  await expect(nextStep).toBeEnabled();
  await expect(main.getByRole('heading', { level: 2 })).toContainText(/Estimated time: \d+ min/);
  await nextStep.click();
  await expect(main.getByText(/^2 \/ \d+$/)).toBeVisible();
  await expect(previousStep).toBeEnabled();
  await previousStep.click();
  await expect(main.getByText(/^1 \/ \d+$/)).toBeVisible();
  await main.getByRole('button', { name: 'Show all stages', exact: true }).click();
  await expect(assemblySteps.nth(1).getByRole('checkbox', { name: 'Mark as done', exact: true })).toBeDisabled();

  const checklistDownload = page.waitForEvent('download');
  await main.getByRole('button', { name: 'Download checklist', exact: true }).click();
  const download = await checklistDownload;
  expect(download.suggestedFilename()).toBe('assembly-checklist.txt');
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('Assembly checklist did not produce a downloadable file');
  const checklist = await readFile(downloadPath, 'utf8');
  const stepTitles = await assemblySteps.locator('h3').allTextContents();
  const checklistSteps = checklist.split('\n').filter((line) => line.startsWith('[ ] Step '));
  expect(checklistSteps).toHaveLength(stepTitles.length);
  for (const [index, title] of stepTitles.entries()) {
    expect(checklistSteps[index]).toContain(`[ ] Step ${index + 1}: ${title}`);
  }
});

test('build log entries can be added, edited, persisted, and deleted', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Assembly' }).click();
  const buildLog = page.getByRole('region', { name: 'Build Log' });
  await buildLog.getByRole('button', { name: /Build Log/ }).click();

  const editor = buildLog.getByRole('textbox', { name: 'Add a build note…' });
  await editor.fill('Hinges aligned');
  await editor.press('ControlOrMeta+Enter');
  await expect(buildLog.getByText('Hinges aligned')).toBeVisible();

  await buildLog.getByRole('button', { name: 'Edit entry' }).click();
  await editor.fill('Hinges aligned and tested');
  await editor.press('ControlOrMeta+Enter');
  await expect(buildLog.getByText('Hinges aligned and tested')).toBeVisible();
  await expect(buildLog.getByText('Hinges aligned', { exact: true })).toHaveCount(0);

  await page.reload();
  await page.getByRole('tab', { name: 'Assembly' }).click();
  const reloadedBuildLog = page.getByRole('region', { name: 'Build Log' });
  await reloadedBuildLog.getByRole('button', { name: /Build Log/ }).click();
  await expect(reloadedBuildLog.getByText('Hinges aligned and tested')).toBeVisible();
  await reloadedBuildLog.getByRole('button', { name: 'Delete entry' }).click();
  await expect(reloadedBuildLog.getByText('No notes yet. Log steps, adjustments, or observations.')).toBeVisible();
});

test('machine profile settings drive the serial stream and its pause, reconnect, and error lifecycle @chromium-only', async ({
  appPage: page,
}) => {
  test.setTimeout(60_000);

  await page.evaluate(() => {
    const fixture = {
      openOptions: [] as { baudRate: number; dataBits: number; stopBits: number; parity: string }[],
      writes: [] as string[],
      closeCount: 0,
      holdFirstWrite: true,
      releaseFirstWrite: undefined as (() => void) | undefined,
      failNextRequest: false,
      failNextWrite: false,
    };
    const createPort = () => ({
      open: async (options: (typeof fixture.openOptions)[number]) => fixture.openOptions.push(options),
      close: async () => {
        fixture.closeCount += 1;
      },
      writable: new WritableStream<Uint8Array>({
        write: async (chunk) => {
          if (fixture.failNextWrite) {
            fixture.failNextWrite = false;
            throw new Error('Write failed');
          }
          fixture.writes.push(new TextDecoder().decode(chunk));
          if (fixture.holdFirstWrite && fixture.writes.length === 1) {
            await new Promise<void>((resolve) => {
              fixture.releaseFirstWrite = resolve;
            });
            fixture.holdFirstWrite = false;
          }
        },
      }),
    });
    Object.defineProperty(window, '__machineSerialFixture', { configurable: true, value: fixture });
    Object.defineProperty(navigator, 'serial', {
      configurable: true,
      value: {
        requestPort: async () => {
          if (fixture.failNextRequest) {
            fixture.failNextRequest = false;
            throw new Error('Picker canceled');
          }
          return createPort();
        },
      },
    });
  });

  await page.keyboard.press('Alt+3');
  await expect(page.getByRole('status')).toContainText('Optimization complete');
  await page.getByRole('tab', { name: 'Assembly' }).click();
  const profile = page.getByRole('combobox', { name: 'Select machine profile' });
  await profile.selectOption('mach3-generic');
  await expect(profile).toHaveValue('mach3-generic');
  await expect(page.getByText('Mach3 via USB/parallel port adapter on a Windows CNC router.')).toBeVisible();

  const connect = page.getByRole('button', { name: 'Connect to machine' });
  await connect.click();
  await expect(page.getByRole('button', { name: 'Pause sending' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, '__machineSerialFixture').writes.length))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause sending' }).click();
  await page.evaluate(() => {
    const fixture = Reflect.get(window, '__machineSerialFixture') as { releaseFirstWrite?: () => void };
    fixture.releaseFirstWrite?.();
  });
  await expect(page.getByRole('button', { name: 'Resume sending' })).toBeVisible();

  const pausedWrites = await page.evaluate(() => {
    const fixture = Reflect.get(window, '__machineSerialFixture') as {
      openOptions: { baudRate: number; dataBits: number; stopBits: number; parity: string }[];
      writes: string[];
    };
    return fixture;
  });
  expect(pausedWrites.openOptions[0]).toEqual({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });
  expect(pausedWrites.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Resume sending' }).click();
  await expect(page.getByText(/Done — all \d+ lines sent\./)).toBeVisible();

  const sentGcode = await page.evaluate(() => {
    const fixture = Reflect.get(window, '__machineSerialFixture') as { writes: string[] };
    return fixture.writes.join('');
  });
  expect(sentGcode).toContain('M3 S20000 ; spindle on');
  expect(sentGcode).toContain('G0 Z8.0 ; retract to safe height');
  expect(sentGcode).toContain('F3000');
  expect(sentGcode).toContain('F1200');
  expect(sentGcode).not.toContain('F1500');
  expect(sentGcode).not.toContain('F600');
  expect(sentGcode).not.toContain('S18000');
  const doneMessage = await page.getByText(/Done — all \d+ lines sent\./).textContent();
  const reportedLineCount = Number(doneMessage?.match(/\d+/)?.[0]);
  const actualWriteCount = await page.evaluate(() => {
    const fixture = Reflect.get(window, '__machineSerialFixture') as { writes: string[] };
    return fixture.writes.length;
  });
  expect(actualWriteCount).toBe(reportedLineCount);

  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(connect).toBeVisible();
  await connect.click();
  await expect(page.getByText(/Done — all \d+ lines sent\./)).toBeVisible();
  await page.evaluate(() => {
    const fixture = Reflect.get(window, '__machineSerialFixture') as {
      closeCount: number;
      failNextRequest: boolean;
    };
    fixture.failNextRequest = true;
    return fixture.closeCount;
  });
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(connect).toBeVisible();
  await connect.click();
  await expect(page.getByText('Connection error: Picker canceled')).toBeVisible();
  await expect(connect).toBeEnabled();
  await connect.click();
  await expect(page.getByText(/Done — all \d+ lines sent\./)).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect' }).click();

  await page.evaluate(() => {
    const fixture = Reflect.get(window, '__machineSerialFixture') as { failNextWrite: boolean };
    fixture.failNextWrite = true;
  });
  await connect.click();
  await expect(page.getByText('Connection error: Write failed')).toBeVisible();
  await expect(connect).toBeEnabled();
  await connect.click();
  await expect(page.getByText(/Done — all \d+ lines sent\./)).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect' }).click();
});

for (const failure of [
  { name: 'permission denial', errorName: 'NotAllowedError', message: 'Permission denied' },
  { name: 'missing camera device', errorName: 'NotFoundError', message: 'No camera found' },
]) {
  test(`camera ${failure.name} is recoverable`, async ({ appPage: page }) => {
    await page.addInitScript((scenario) => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: () => Promise.reject(new DOMException(scenario.message, scenario.errorName)),
        },
      });
    }, failure);
    await page.reload();
    await page.getByRole('tab', { name: 'Assembly' }).click();

    const camera = page.getByRole('region', { name: 'Room Photo Reference' });
    await camera.getByRole('button', { name: 'Open Camera' }).click();
    await expect(camera.getByRole('alert')).toContainText(`Camera error: ${failure.message}`);
    await expect(camera.getByRole('button', { name: 'Open Camera' })).toBeVisible();
  });
}

test('camera can capture, retake, and stop a room photo stream', async ({ appPage: page }) => {
  await page.addInitScript(() => {
    const source = document.createElement('canvas');
    source.width = 640;
    source.height = 480;
    const context = source.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable in camera fixture');
    context.fillStyle = '#669944';
    context.fillRect(0, 0, source.width, source.height);
    const paintFrame = () => {
      context.fillRect(0, 0, source.width, source.height);
      requestAnimationFrame(paintFrame);
    };
    requestAnimationFrame(paintFrame);
    const streams: MediaStream[] = [];
    Object.defineProperty(window, '__cameraStreams', { configurable: true, value: streams });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const stream = source.captureStream(1).clone();
          streams.push(stream);
          return stream;
        },
      },
    });
  });
  await page.reload();
  await page.getByRole('tab', { name: 'Assembly' }).click();

  const camera = page.getByRole('region', { name: 'Room Photo Reference' });
  await camera.getByRole('button', { name: 'Open Camera' }).click();
  const video = camera.locator('video[aria-label="Live camera feed"]');
  await expect(video).toBeVisible();
  await camera.getByRole('button', { name: 'Take Photo' }).click();
  await expect(camera.getByRole('img', { name: 'Captured room photo' })).toHaveAttribute('src', /^data:image\/jpeg/);
  await camera.getByRole('button', { name: 'Retake' }).click();
  await expect(video).toBeVisible();
  await camera.getByRole('button', { name: 'Stop Camera' }).click();
  await expect(camera.getByRole('button', { name: 'Open Camera' })).toBeVisible();
  await camera.getByRole('button', { name: 'Open Camera' }).click();
  await expect(video).toBeVisible();
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();
  const allTracksStopped = await page.evaluate(() => {
    const streams = Reflect.get(window, '__cameraStreams') as MediaStream[];
    return streams.every((stream) => stream.getTracks().every((track) => track.readyState === 'ended'));
  });
  expect(allTracksStopped).toBe(true);
});

test('preview controls match the browser-derived accessible inventory', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();

  const main = page.getByRole('main');
  const preview = WORKSPACE_CONTROL_INVENTORY.panels.find((panel) => panel.name === 'Preview');
  if (!preview) throw new Error('Preview control inventory is missing');
  const viewSelector = main.getByRole('tablist', { name: 'Cabinet view selector' });
  const interactivePreview = main.getByRole('region', { name: 'Interactive 3D Preview' });

  for (const control of preview.controls) {
    const controlScope = getControlMetadata(control).scope;
    const scope = control.role === 'tab' ? viewSelector : controlScope === 'interactive-3d' ? interactivePreview : main;
    await expect(getAccessibleControl(scope, control.role, control.accessibleName)).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }

  await expect(viewSelector.getByRole('tab')).toHaveCount(
    preview.controls.filter((control) => control.role === 'tab').length,
  );
  for (const role of ['button', 'checkbox', 'slider'] as const) {
    const expectedCount = preview.controls.filter(
      (control) => getControlMetadata(control).scope === 'interactive-3d' && control.role === role,
    ).length;
    await expect(interactivePreview.getByRole(role)).toHaveCount(expectedCount);
  }
});

test('optimizer journey controls match the browser-derived accessible inventory', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+3');

  const main = page.getByRole('main');
  const firstSheet = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(firstSheet).toBeVisible();
  await firstSheet.scrollIntoViewIfNeeded();

  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find((panel) => panel.name === 'Optimizer journey controls');
  if (!inventory) throw new Error('Optimizer control inventory is missing');

  for (const control of inventory.controls) {
    const scope = getControlMetadata(control).scope === 'first-sheet' ? firstSheet : main;
    const locator = getAccessibleControl(scope, control.role, control.accessibleName);
    await expect(getControlMetadata(control).scope === 'first-sheet' ? locator.first() : locator).toHaveCount(1);
    expect(control.positiveTest).toBeTruthy();
    expect(getNegativeEvidence(control)).toBeTruthy();
  }
});

test('furniture and joinery options select correctly and update controls and parts', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  const furnitureTypes = [
    ['Cabinet', 'Door', true, true],
    ['Bookshelf', 'Adjustable Shelf', false, false],
    ['Desk', 'Desktop', false, false],
    ['Wardrobe', 'Hanging Rail', true, true],
    ['Panel', 'Panel', false, false],
  ] as const;

  for (const [furnitureType, expectedPart, hasDoors, hasDrawers] of furnitureTypes) {
    await configuratorTab.click();
    const furnitureChoice = page.getByRole('radio', { name: furnitureType, exact: true });
    await page.getByText(furnitureType, { exact: true }).click();
    await expect(furnitureChoice).toBeChecked();
    await expect(page.getByRole('group', { name: /Shelves/ })).toHaveCount(furnitureType === 'Panel' ? 0 : 1);
    await expect(page.getByRole('group', { name: /Doors/ })).toHaveCount(hasDoors ? 1 : 0);
    await expect(page.getByRole('group', { name: /Drawers/ })).toHaveCount(hasDrawers ? 1 : 0);

    if (furnitureType === 'Panel') {
      await expect(page.getByRole('slider', { name: 'Depth (mm)' })).toHaveCount(0);
      await page.getByRole('combobox', { name: 'Carcass Material' }).selectOption('mdf-18');
      await page.getByRole('combobox', { name: 'Back Panel Material' }).selectOption('mdf-3');

      const panelSource = page.getByRole('radio', { name: 'Carcass material', exact: true });
      await page.getByText('Carcass material', { exact: true }).click();
      await expect(panelSource).toBeChecked();
      await showParts(page);
      await expect(partRow(page, 'Panel').getByRole('cell').nth(6)).toHaveText('18');

      await configuratorTab.click();
      const backSource = page.getByRole('radio', { name: 'Back panel material', exact: true });
      await page.getByText('Back panel material', { exact: true }).click();
      await expect(backSource).toBeChecked();
      await showParts(page);
      await expect(partRow(page, 'Panel').getByRole('cell').nth(6)).toHaveText('3');
    } else {
      await showParts(page);
      await expect(partRow(page, expectedPart)).toHaveCount(1);
    }
  }

  await configuratorTab.click();
  const joineryOptions = [
    'Through-Screw',
    'Pocket Screw',
    'Dado Groove',
    'Dowel',
    'Biscuit',
    'Mortise & Tenon',
    'Dovetail',
  ];
  for (const option of joineryOptions) {
    const choice = page.getByRole('radio', { name: option, exact: true });
    await page.getByText(option, { exact: true }).click();
    await expect(choice).toBeChecked();
  }
});

test('preview views render expected geometry and dimension visibility', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  const views = [
    { label: 'Front (Closed)', isometric: false, viewBox: '0 0 290 490', hiddenViewBox: '0 0 260 460' },
    { label: 'Front (Open)', isometric: false, viewBox: '0 0 290 490', hiddenViewBox: '0 0 260 460' },
    { label: 'Side', isometric: false, viewBox: '0 0 210 490', hiddenViewBox: '0 0 180 460' },
    { label: 'Top', isometric: false, viewBox: '0 0 290 210', hiddenViewBox: '0 0 260 180' },
    { label: 'Back', isometric: false, viewBox: '0 0 290 490', hiddenViewBox: '0 0 260 460' },
    { label: '3D', isometric: true },
  ] as const;
  const dimensionsToggle = page.getByRole('checkbox', { name: 'Dimensions' });

  for (const view of views) {
    const tab = page.getByRole('tab', { name: view.label, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');

    const drawing = view.isometric
      ? page.getByRole('img', { name: '3D isometric cabinet drawing' })
      : page.getByRole('group', { name: 'Cabinet drawing' });
    await expect(drawing).toBeVisible();
    const initialViewBox = await drawing.getAttribute('viewBox');
    const initialTextCount = await drawing.locator('text').count();
    if (view.isometric) {
      expect(initialViewBox).toMatch(/^0 0 \d+(\.\d+)? \d+(\.\d+)?$/);
    } else {
      expect(initialViewBox).toBe(view.viewBox);
    }
    expect(await drawing.locator('polygon, rect').count()).toBeGreaterThan(1);

    await dimensionsToggle.uncheck();
    const hiddenTextCount = await drawing.locator('text').count();
    expect(hiddenTextCount).toBeLessThan(initialTextCount);
    if (view.isometric) {
      const [initialWidth, initialHeight] = (initialViewBox ?? '').split(' ').slice(2).map(Number);
      const hiddenViewBox = await drawing.getAttribute('viewBox');
      const [hiddenWidth, hiddenHeight] = hiddenViewBox!.split(' ').slice(2).map(Number);
      expect(hiddenWidth).toBe(initialWidth - 60);
      expect(hiddenHeight).toBe(initialHeight - 60);
    } else {
      await expect(drawing).toHaveAttribute('viewBox', view.hiddenViewBox);
    }
    await dimensionsToggle.check();
    await expect(drawing).toHaveAttribute('viewBox', initialViewBox ?? '');
  }
});

test('preview exports contain the selected view with valid SVG and PNG data', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  await page.getByRole('tab', { name: 'Side', exact: true }).click();

  const svgDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SVG' }).click();
  const svgDownload = await svgDownloadPromise;
  expect(svgDownload.suggestedFilename()).toBe('cabinet-side.svg');
  expect(svgDownload.suggestedFilename()).toMatch(/^[a-z0-9-]+\.svg$/);
  const svgText = await readFile(await svgDownload.path(), 'utf8');
  const svgData = await page.evaluate((source) => {
    const document = new DOMParser().parseFromString(source, 'image/svg+xml');
    const svg = document.documentElement;
    return {
      rootName: svg.localName,
      hasParserError: document.querySelector('parsererror') !== null,
      viewBox: svg.getAttribute('viewBox'),
      rectangleCount: svg.querySelectorAll('rect').length,
      dimensionLabels: [...svg.querySelectorAll('text')].map((element) => element.textContent),
    };
  }, svgText);
  expect(svgData.rootName).toBe('svg');
  expect(svgData.hasParserError).toBe(false);
  expect(svgData.viewBox).toBe('0 0 210 490');
  expect(svgData.rectangleCount).toBeGreaterThan(1);
  expect(svgData.dimensionLabels).toContain('600 mm');

  await page.getByRole('tab', { name: 'Top', exact: true }).click();
  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG (2×)' }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe('cabinet-top.png');
  expect(pngDownload.suggestedFilename()).toMatch(/^[a-z0-9-]+\.png$/);
  const pngData = await readFile(await pngDownload.path());
  expect([...pngData.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(pngData.toString('ascii', 12, 16)).toBe('IHDR');
  expect(pngData.readUInt32BE(16)).toBe(580);
  expect(pngData.readUInt32BE(20)).toBe(420);
});

test('preview 3D orbit and touch gestures respect zoom bounds and cancellation', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  await page.getByRole('tab', { name: '3D', exact: true }).click();
  const drawing = page.getByRole('img', { name: '3D isometric cabinet drawing' });
  const orbitSurface = drawing.locator('xpath=..');

  await orbitSurface.dispatchEvent('wheel', { deltaY: -10000 });
  await expect(page.getByText(/Drag to rotate.*240%/)).toBeVisible();
  await orbitSurface.dispatchEvent('wheel', { deltaY: 10000 });
  await expect(page.getByText(/Drag to rotate.*60%/)).toBeVisible();

  const bounds = await orbitSurface.boundingBox();
  if (!bounds) throw new Error('3D orbit surface is not laid out');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height / 2 + 20);
  await expect(orbitSurface).toHaveAttribute('style', /rotateY\(20deg\)/);
  await orbitSurface.dispatchEvent('pointercancel', {
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });
  await expect(orbitSurface).toHaveClass(/(?:^|\s)cursor-grab(?:\s|$)/);
  await page.mouse.up();

  await page.getByRole('tab', { name: 'Front (Closed)', exact: true }).click();
  const frontTab = page.getByRole('tab', { name: 'Front (Closed)', exact: true });
  const frontDrawing = page.getByRole('group', { name: 'Cabinet drawing' });
  await dispatchTouch(frontDrawing, 'touchstart', [{ x: 250, y: 250 }]);
  await dispatchTouch(frontDrawing, 'touchend', [], [{ x: 350, y: 250 }]);
  await expect(frontTab).toHaveAttribute('aria-selected', 'true');

  await dispatchTouch(frontDrawing, 'touchstart', [{ x: 250, y: 250 }]);
  await dispatchTouch(frontDrawing, 'touchend', [], [{ x: 150, y: 250 }]);
  const frontOpenTab = page.getByRole('tab', { name: 'Front (Open)', exact: true });
  await expect(frontOpenTab).toHaveAttribute('aria-selected', 'true');

  const openDrawing = page.getByRole('group', { name: 'Cabinet drawing' });
  const zoomContainer = openDrawing.locator('xpath=..');
  await dispatchTouch(openDrawing, 'touchstart', [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ]);
  await dispatchTouch(openDrawing, 'touchmove', [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ]);
  await expect(zoomContainer).toHaveAttribute('style', /scale\(2\)/);
  await dispatchTouch(openDrawing, 'touchend', [{ x: 100, y: 100 }], [{ x: 300, y: 100 }]);
  await dispatchTouch(openDrawing, 'touchcancel', [], [{ x: 500, y: 100 }]);
  await dispatchTouch(openDrawing, 'touchend', [], [{ x: 500, y: 100 }]);
  await expect(frontOpenTab).toHaveAttribute('aria-selected', 'true');
  await dispatchTouch(openDrawing, 'touchstart', [{ x: 200, y: 100 }]);
  await dispatchTouch(openDrawing, 'touchend', [], [{ x: 100, y: 100 }]);
  await expect(zoomContainer).toHaveAttribute('style', /scale\(1\)/);
  await expect(page.getByRole('tab', { name: 'Side', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('interactive 3D panel renders and controls update its scene', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  const panel = page.getByRole('region', { name: 'Interactive 3D Preview' });
  await expect(panel).toBeVisible();
  const canvas = panel.locator('canvas');
  await expect(canvas).toBeVisible();
  const initialPixels = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) throw new Error('2D canvas context is unavailable');
    const { data } = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
    const colors = new Set<string>();
    for (let offset = 0; offset < data.length; offset += 4 * 16) {
      colors.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`);
    }
    return colors.size;
  });
  expect(initialPixels).toBeGreaterThan(2);

  const explodeSlider = panel.getByRole('slider', { name: /Explode view/ });
  await explodeSlider.focus();
  await explodeSlider.press('End');
  await expect(explodeSlider).toHaveAttribute('aria-valuenow', '1');
  await expect(panel.getByText('Explode view (100%)')).toBeVisible();

  const wireframe = panel.getByRole('checkbox', { name: 'Wireframe' });
  await wireframe.check();
  await expect(wireframe).toBeChecked();
  const edgeBanding = panel.getByRole('checkbox', { name: 'Edge banding' });
  await edgeBanding.uncheck();
  await expect(edgeBanding).not.toBeChecked();
  await panel.getByRole('button', { name: 'Zoom in' }).click();
  await panel.getByRole('button', { name: 'Reset camera' }).click();
  await expect(explodeSlider).toHaveAttribute('aria-valuenow', '0');
  await expect(panel.getByText('Explode view (0%)')).toBeVisible();
});

test('optional WebGL preview respects its feature flag and capability fallback', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  await page.getByRole('tab', { name: '3D', exact: true }).click();
  const fallback = page.getByTestId('webgl-fallback');
  const canvas = page.getByTestId('webgl-preview-canvas');

  await expect.poll(async () => (await fallback.count()) + (await canvas.count())).toBeLessThanOrEqual(1);
  if (await fallback.isVisible()) {
    await expect(fallback).toHaveAttribute('aria-label', /WebGL not supported/);
  } else if (await canvas.isVisible()) {
    await expect
      .poll(async () =>
        canvas.evaluate((element) => {
          const canvasElement = element as HTMLCanvasElement;
          const gl = canvasElement.getContext('webgl');
          if (!gl) return 0;
          const pixels = new Uint8Array(canvasElement.width * canvasElement.height * 4);
          gl.readPixels(0, 0, canvasElement.width, canvasElement.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const colors = new Set<string>();
          for (let offset = 0; offset < pixels.length; offset += 4 * 32) {
            colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
          }
          return colors.size;
        }),
      )
      .toBeGreaterThan(1);
    const modeToggle = page.getByRole('button', { name: 'Animate' });
    await expect(modeToggle).toBeVisible();
    await modeToggle.click();
    await expect(page.getByRole('button', { name: 'Isometric' })).toHaveAttribute('aria-pressed', 'false');
  } else {
    await expect(fallback).toHaveCount(0);
    await expect(canvas).toHaveCount(0);
  }
});

async function dispatchTouch(
  target: import('@playwright/test').Locator,
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  touches: { x: number; y: number }[],
  changedTouches = touches,
) {
  await target.evaluate(
    (element, event) => {
      const createTouches = (points: { x: number; y: number }[]) =>
        points.map((point) => ({ clientX: point.x, clientY: point.y }));
      const touchEvent = new Event(event.type, { bubbles: true, cancelable: true });
      Object.defineProperties(touchEvent, {
        touches: { value: createTouches(event.touches) },
        changedTouches: { value: createTouches(event.changedTouches) },
      });
      element.dispatchEvent(touchEvent);
    },
    { type, touches, changedTouches },
  );
}

test('materials, back panel, shelf options, and edge banding update generated parts', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  const carcassMaterial = page.getByRole('combobox', { name: 'Carcass Material' });
  const backMaterial = page.getByRole('combobox', { name: 'Back Panel Material' });

  await configuratorTab.click();
  await carcassMaterial.selectOption('plywood-18');
  await backMaterial.selectOption('mdf-3');
  await showParts(page);
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(3)).toHaveText('Birch Plywood 18 mm');
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(6)).toHaveText('18');
  await expect(partRow(page, 'Back Panel').getByRole('cell').nth(3)).toHaveText('MDF/HDF 3 mm (back)');
  await expect(partRow(page, 'Back Panel').getByRole('cell').nth(6)).toHaveText('3');

  await configuratorTab.click();
  const hasBack = page.getByRole('checkbox', { name: 'Include back panel' });
  await hasBack.uncheck();
  await expect(backMaterial).toBeDisabled();
  await showParts(page);
  await expect(partRow(page, 'Back Panel')).toHaveCount(0);
  await configuratorTab.click();
  await hasBack.check();
  await expect(backMaterial).toBeEnabled();

  const shelfCount = page.getByRole('spinbutton', { name: 'Number of Shelves' });
  await shelfCount.fill('2');
  await shelfCount.press('Enter');
  await showParts(page);
  await expect(partRow(page, 'Adjustable Shelf').getByRole('cell').nth(2)).toHaveText('2');

  await page.getByRole('tab', { name: 'Configure' }).click();
  const supportCount = page.getByRole('spinbutton', { name: 'Centre Supports' });
  await supportCount.fill('1');
  await supportCount.press('Enter');
  await showParts(page);
  await expect(partRow(page, 'Centre Support').getByRole('cell').nth(2)).toHaveText('1');

  await configuratorTab.click();
  const customSpacing = page.getByRole('radio', { name: 'Custom', exact: true });
  await customSpacing.check();
  await expect(customSpacing).toBeChecked();
  await expect(page.getByRole('spinbutton', { name: 'Shelf 1 position in mm' })).toBeVisible();
  const equalSpacing = page.getByRole('radio', { name: 'Equal', exact: true });
  await equalSpacing.check();
  await expect(equalSpacing).toBeChecked();
  await expect(page.getByRole('spinbutton', { name: 'Shelf 1 position in mm' })).toHaveCount(0);

  const edgeBanding = page.getByRole('combobox', { name: 'Edge Banding' });
  for (const [mode, carcassEdge, doorEdge] of [
    ['all-visible', 'Front edge', 'All 4 edges'],
    ['doors-only', 'None', 'All 4 edges'],
    ['none', 'None', 'None'],
  ] as const) {
    await edgeBanding.selectOption(mode);
    await showParts(page);
    await expect(partRow(page, 'Top Panel').getByRole('cell').nth(7)).toHaveText(carcassEdge);
    await expect(partRow(page, 'Door').getByRole('cell').nth(7)).toHaveText(doorEdge);
    await configuratorTab.click();
  }
});

test('custom materials can be added, edited, and deleted', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const editor = page.getByRole('group', { name: 'Custom Materials' });
  await editor.getByRole('button', { name: 'Add custom material' }).click();
  await editor.getByRole('textbox', { name: 'Name' }).fill('Test Birch');
  await editor.getByRole('button', { name: 'Add Material' }).click();

  const material = editor.getByRole('listitem').filter({ hasText: 'Test Birch' });
  await expect(material).toBeVisible();
  const carcassMaterial = page.getByRole('combobox', { name: 'Carcass Material' });
  await carcassMaterial.selectOption({ label: 'Test Birch (18 mm)' });
  const customKey = await carcassMaterial.locator('option').filter({ hasText: 'Test Birch' }).getAttribute('value');
  expect(customKey).toBeTruthy();
  await expect(carcassMaterial).toHaveValue(customKey ?? '');
  await showParts(page);
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(3)).toHaveText('Test Birch');
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(6)).toHaveText('18');

  await page.getByRole('tab', { name: 'Configure' }).click();
  await material.getByRole('button', { name: 'Edit Test Birch' }).click();
  await editor.getByRole('textbox', { name: 'Name' }).first().fill('Test Oak');
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(editor.getByText('Test Oak (18 mm, ₪100)')).toBeVisible();

  await carcassMaterial.selectOption({ index: 0 });
  await editor.getByRole('listitem').filter({ hasText: 'Test Oak' }).getByRole('button', { name: 'Remove' }).click();
  await expect(editor.getByText('Test Oak (18 mm, ₪100)')).toHaveCount(0);
});

test('community catalog import previews valid data and rejects invalid data without partial writes', async ({
  appPage: page,
}) => {
  const material = {
    id: 'community-birch-18',
    name: 'Community Birch 18 mm',
    pricePerSqM: 45,
    currency: 'USD',
    thickness: 18,
    hasGrain: true,
    submittedAt: '2026-09-28T12:00:00.000Z',
    votes: 3,
  };
  await page.evaluate((validMaterial) => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith('https://catalog.example/')) return originalFetch(input, init);
      const invalid = url.endsWith('/invalid.json');
      return new Response(
        JSON.stringify({
          schemaVersion: '1.0',
          generatedAt: '2026-09-28T12:00:00.000Z',
          materials: invalid ? [validMaterial, { ...validMaterial, id: '', name: '' }] : [validMaterial],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };
  }, material);

  await page.getByRole('tab', { name: 'Configure' }).click();
  const importPanel = page.getByRole('heading', { name: 'Import Community Catalog' }).locator('..');
  const urlInput = importPanel.getByRole('textbox', { name: 'Catalog URL' });
  await urlInput.fill('https://catalog.example/valid.json');
  await importPanel.getByRole('button', { name: 'Import' }).click();
  await expect(importPanel.getByText('1 material found')).toBeVisible();
  await importPanel.getByRole('button', { name: 'Add selected to my materials' }).click();
  await expect(importPanel.getByText('1 material added')).toBeVisible();
  const importedMaterial = page.getByRole('group', { name: 'Custom Materials' }).getByText('Community Birch 18 mm');
  await expect(importedMaterial).toBeVisible();

  await urlInput.fill('https://catalog.example/invalid.json');
  await importPanel.getByRole('button', { name: 'Import' }).click();
  await expect(importPanel.getByText(/Catalog JSON does not match schema/)).toBeVisible();
  await expect(importedMaterial).toBeVisible();
  await expect(page.getByRole('group', { name: /Custom Materials/ }).getByRole('listitem')).toHaveCount(1);
});

test('hardware catalog import supports merge and replace and rejects invalid files atomically', async ({
  appPage: page,
}) => {
  const panel = page.getByRole('heading', { name: 'Import Hardware Catalog' }).locator('..');
  const fileInput = panel.getByLabel('Catalog JSON file');
  const firstItem = {
    id: 'catalog-hinge',
    name: 'Imported Hinge',
    category: 'hinge',
    sku: 'HINGE-1',
    manufacturer: 'Workshop',
    unitPrice: 2.5,
    packSize: 1,
    description: 'Soft close',
    tags: ['soft-close'],
  };
  const upload = async (items: unknown[]) => {
    await fileInput.setInputFiles({
      name: 'hardware-catalog.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ schemaVersion: '1.0', items })),
    });
  };

  await page.getByRole('tab', { name: 'Configure' }).click();
  await upload([firstItem]);
  await expect(panel.getByText('1 hardware items validated.')).toBeVisible();
  await panel.getByRole('button', { name: 'Import catalog' }).click();
  await expect(panel.getByText('Imported Hinge', { exact: true })).toBeVisible();

  const updatedItem = { ...firstItem, name: 'Updated Hinge' };
  const newItem = { ...firstItem, id: 'catalog-handle', category: 'handle', name: 'Imported Handle' };
  await upload([updatedItem, newItem]);
  await panel.getByRole('radio', { name: /Merge:/ }).check();
  await panel.getByRole('button', { name: 'Import catalog' }).click();
  await expect(panel.getByText('Updated Hinge', { exact: true })).toBeVisible();
  await expect(panel.getByText('Imported Handle', { exact: true })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Custom hardware (2)' })).toBeVisible();

  await upload([updatedItem, { ...newItem, id: '' }]);
  await expect(panel.getByRole('alert')).toContainText('Invalid hardware item at index 1');
  await expect(panel.getByText('Updated Hinge', { exact: true })).toBeVisible();
  await expect(panel.getByText('Imported Handle', { exact: true })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Custom hardware (2)' })).toBeVisible();

  const replacement = { ...firstItem, id: 'replacement-screw', category: 'screw', name: 'Replacement Screw' };
  await upload([replacement]);
  await panel.getByRole('radio', { name: /Replace all/ }).check();
  await panel.getByRole('button', { name: 'Import catalog' }).click();
  await expect(panel.getByText('Replacement Screw', { exact: true })).toBeVisible();
  await expect(panel.getByText('Updated Hinge', { exact: true })).toHaveCount(0);
  await expect(panel.getByText('Imported Handle', { exact: true })).toHaveCount(0);
  await expect(panel.getByRole('heading', { name: 'Custom hardware (1)' })).toBeVisible();
});

test('named expressions edit, reject out-of-range values, and update generated cut-list dimensions', async ({
  appPage: page,
}) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const panel = page.getByRole('region', { name: 'Named parametric expressions panel' });
  await panel.getByRole('textbox', { name: 'Name' }).fill('target_width');
  await panel.getByRole('textbox', { name: 'Formula' }).fill('3001');
  await panel.getByRole('button', { name: 'Add', exact: true }).click();
  await panel.getByRole('button', { name: 'Apply target_width' }).click();
  await expect(panel.getByRole('alert')).toContainText('between 100 and 3000 mm');

  await panel.getByRole('button', { name: 'Edit target_width' }).click();
  await panel.getByRole('textbox', { name: 'Formula' }).fill('720');
  await panel.getByRole('button', { name: 'Save', exact: true }).click();
  await panel.getByRole('button', { name: 'Apply target_width' }).click();
  await expect(page.getByRole('slider', { name: 'Width (mm)' })).toHaveValue('720');

  await showParts(page);
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(4)).toHaveText('686');
});

test('door and drawer options update cut-list quantities and hardware', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  const doorCountOne = page.getByRole('radio', { name: '1 doors', exact: true });
  const doorCountTwo = page.getByRole('radio', { name: '2 doors', exact: true });
  const doorStyle = page.getByRole('combobox', { name: 'Door Style' });

  await configuratorTab.click();
  await doorCountOne.check();
  await showParts(page);
  await expect(partRow(page, 'Door').getByRole('cell').nth(2)).toHaveText('1');
  await page.getByRole('tab', { name: 'Configure' }).click();
  await doorCountTwo.check();
  await showParts(page);
  await expect(partRow(page, 'Door').getByRole('cell').nth(2)).toHaveText('2');

  await configuratorTab.click();
  await doorStyle.selectOption('flat');
  await showParts(page);
  await expect(partRow(page, 'Door')).toHaveCount(1);
  await configuratorTab.click();
  await doorStyle.selectOption('shaker');
  await showParts(page);
  await expect(partRow(page, 'Door')).toHaveCount(1);
  await configuratorTab.click();
  await doorStyle.selectOption('glass');
  await showParts(page);
  await expect(partRow(page, 'Glass Door')).toHaveCount(1);
  await configuratorTab.click();
  await doorStyle.selectOption('none');
  await showParts(page);
  await expect(partRow(page, 'Door')).toHaveCount(0);
  await expect(partRow(page, 'Glass Door')).toHaveCount(0);

  await configuratorTab.click();
  await doorStyle.selectOption('flat');
  const handles = page.getByRole('combobox', { name: 'Handles' });
  for (const [style, hardwareLabel] of [
    ['bar', 'Bar Handle 160 mm'],
    ['knob', 'Round Knob 35 mm'],
    ['cup', 'Cup Pull 96 mm'],
  ] as const) {
    await handles.selectOption(style);
    await page.getByRole('tab', { name: 'Assembly' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: hardwareLabel })).toBeVisible();
    await configuratorTab.click();
  }
  await handles.selectOption('none');
  await page.getByRole('tab', { name: 'Assembly' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Bar Handle 160 mm' })).toHaveCount(0);

  await configuratorTab.click();
  const drawerCount = page.getByRole('spinbutton', { name: 'Number of Drawers' });
  await drawerCount.fill('2');
  await drawerCount.press('Enter');
  await showParts(page);
  await expect(partRow(page, 'Drawer 1 Front')).toHaveCount(1);
  await expect(partRow(page, 'Drawer 2 Front')).toHaveCount(1);

  for (const [slideStyle, hardwareLabel] of [
    ['standard', 'Drawer Slide Pair'],
    ['soft-close', 'Soft-Close Drawer Slide Pair'],
    ['full-extension', 'Full-Extension Drawer Slide Pair'],
  ] as const) {
    await configuratorTab.click();
    const slideChoice = page.getByRole('radio', {
      name: slideStyle === 'standard' ? 'Standard' : slideStyle === 'soft-close' ? 'Soft-Close' : 'Full-Extension',
      exact: true,
    });
    await slideChoice.check();
    await expect(slideChoice).toBeChecked();
    await page.getByRole('tab', { name: 'Assembly' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: hardwareLabel })).toContainText('×2');
  }
});

test('validation repairs update configuration and preserve accessible focus and issue-list relation', async ({
  appPage: page,
}) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  const heightInput = page.getByRole('spinbutton', { name: 'Height', exact: true });
  await widthInput.fill('1300');
  await widthInput.press('Enter');
  await heightInput.fill('2500');
  await heightInput.press('Enter');

  const validationToggle = page.getByRole('button', { name: /Design Checks/ });
  const issueList = page.locator('#validation-issue-list');
  await expect(page.getByText(/Cabinet width \(1300 mm\)/)).toBeVisible();
  await expect(validationToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(validationToggle).toHaveAttribute('aria-controls', 'validation-issue-list');
  await expect(issueList).toHaveAttribute('id', 'validation-issue-list');
  await expect(issueList).toHaveAttribute('aria-live', 'polite');
  await expect(issueList).toHaveAttribute('aria-atomic', 'false');

  await page.getByRole('button', { name: 'Add centre support' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Centre Supports' })).toHaveValue('1');
  await expect(page.getByText(/Cabinet width \(1300 mm\)/)).toHaveCount(0);
  await expect(validationToggle).toBeFocused();

  const backPanel = page.getByRole('checkbox', { name: 'Include back panel' });
  await backPanel.uncheck();
  await expect(page.getByText(/without back panel/)).toBeVisible();
  await page.getByRole('button', { name: 'Add back panel' }).click();
  await expect(backPanel).toBeChecked();
  await expect(page.getByText(/without back panel/)).toHaveCount(0);
  await expect(validationToggle).toBeFocused();
  await expect(issueList).toHaveAttribute('aria-live', 'polite');
});

test('cabinet removal exposes its cabinet name and protects the final cabinet', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  await page.getByRole('button', { name: /Add Cabinet/ }).click();
  const removeSecondCabinet = page.getByRole('button', { name: 'Remove Cabinet 2' });
  await expect(removeSecondCabinet).toBeVisible();
  await removeSecondCabinet.click();
  await expect(page.getByRole('button', { name: /^Cabinet 2\d+ parts$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Remove Cabinet/ })).toHaveCount(0);
});

test('cabinet duplicate, mirror, reorder, remove, and active selection reach project outputs', async ({
  appPage: page,
}) => {
  test.setTimeout(120_000);
  await page.getByRole('tab', { name: 'Configure' }).click();
  await page.getByRole('button', { name: /Add Cabinet/ }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  await widthInput.fill('800');
  await widthInput.press('Enter');

  const cabinetTwo = page.getByRole('button', { name: /^Cabinet 2\d+ parts$/ });
  await cabinetTwo.dblclick();
  const cabinetNameInput = page.getByRole('textbox', { name: 'Cabinet name', exact: true });
  await cabinetNameInput.fill('Millwork');
  await cabinetNameInput.press('Enter');

  await page.getByRole('button', { name: 'Duplicate Millwork' }).click();
  await expect(page.getByRole('button', { name: /^Millwork \(copy\)\d+ parts$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Mirror Millwork (copy)' }).click();
  const mirroredCabinet = page.getByRole('button', { name: /^Millwork \(copy\) \(mirror\)/ });
  await expect(mirroredCabinet).toBeVisible();
  await expect(mirroredCabinet).toContainText('mirror');
  await page.getByRole('button', { name: 'Move cabinet up: Millwork (copy) (mirror)' }).click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('woodworkingshop:session');
        if (!raw) return [];
        const session = JSON.parse(raw) as { cabinets: { name: string }[] };
        return session.cabinets.map((cabinet) => cabinet.name);
      }),
    )
    .toEqual(['Cabinet 1', 'Millwork', 'Millwork (copy) (mirror)', 'Millwork (copy)']);

  await page.getByRole('button', { name: 'Remove Millwork (copy)', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Millwork \(copy\)\d+ parts$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Millwork \(copy\) \(mirror\)/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Cut Sheets' }).click();
  await expect(page.getByRole('region', { name: 'Multi-cabinet project summary' })).toContainText(
    'Cabinet 1 · Millwork · Millwork (copy) (mirror)',
  );
  const activeCabinet = page.getByRole('button', { name: 'Cabinet 1', exact: true });
  await activeCabinet.click();
  await expect(activeCabinet).toHaveAttribute('aria-current', 'true');
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(4)).toHaveText('966');

  const activeMirror = page.getByRole('button', { name: 'Millwork (copy) (mirror)', exact: true });
  await activeMirror.click();
  await expect(activeMirror).toHaveAttribute('aria-current', 'true');
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(4)).toHaveText('766');

  await page.getByRole('tab', { name: 'Assembly' }).click();
  const assemblyHeading = page.getByRole('heading', { name: /Assembly Guide/ });
  await expect(page.getByRole('button', { name: 'Millwork (copy) (mirror)', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  const mirrorAssemblySummary = await assemblyHeading.innerText();
  await page.getByRole('button', { name: 'Cabinet 1', exact: true }).click();
  await expect.poll(() => assemblyHeading.innerText()).not.toBe(mirrorAssemblySummary);

  await page.getByRole('tab', { name: 'PDF' }).click();
  const currentCabinetButton = page.getByRole('button', { name: 'Export current cabinet only' });
  const currentCabinetDownload = page.waitForEvent('download');
  await currentCabinetButton.click();
  expect((await currentCabinetDownload).suggestedFilename()).toMatch(/1000x2000x600\.pdf$/);

  const fullProjectButton = page.getByRole('button', { name: 'Export Full Project (3 cabinets)' });
  const fullProjectDownload = page.waitForEvent('download');
  await fullProjectButton.click();
  expect((await fullProjectDownload).suggestedFilename()).toMatch(/-3-cabinets-\d+-parts\.pdf$/);
});

test('project manager saves, loads, exports, imports, and rejects corrupt project files', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  await widthInput.fill('800');
  await widthInput.press('Enter');
  await page.getByRole('button', { name: 'Project Manager' }).click();

  const canceledDialog = page.getByRole('dialog', { name: 'Project Manager' });
  await canceledDialog.getByPlaceholder('Project name…').fill('Unsaved draft');
  await canceledDialog.getByText('Close', { exact: true }).click();
  await page.getByRole('button', { name: 'Project Manager' }).click();

  const dialog = page.getByRole('dialog', { name: 'Project Manager' });
  await expect(dialog.getByText('No saved projects')).toBeVisible();
  const nameInput = dialog.getByPlaceholder('Project name…');
  await nameInput.fill('Kitchen Revision');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByText('Kitchen Revision', { exact: true })).toBeVisible();
  await expect(page.getByText('Project saved')).toBeVisible();
  await dialog.getByText('Close', { exact: true }).click();

  await widthInput.fill('900');
  await widthInput.press('Enter');
  await page.clock.runFor(2_000);
  await page.getByRole('button', { name: 'Project Manager' }).click();
  const duplicateDialog = page.getByRole('dialog', { name: 'Project Manager' });
  await duplicateDialog.getByPlaceholder('Project name…').fill('Kitchen Revision');
  await duplicateDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(duplicateDialog.getByText('Kitchen Revision', { exact: true })).toHaveCount(1);

  const exportDownload = page.waitForEvent('download');
  await duplicateDialog.getByRole('button', { name: 'Export JSON' }).first().click();
  const download = await exportDownload;
  expect(download.suggestedFilename()).toBe('Kitchen_Revision.cabinet-project.json');
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('Project export did not produce a downloadable file');

  await page.clock.runFor(2_000);
  await duplicateDialog.getByLabel('Import JSON').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: await readFile(downloadPath),
  });
  await expect(page.getByText('Project imported')).toBeVisible();
  await expect(duplicateDialog.getByText('Kitchen Revision', { exact: true })).toHaveCount(2);

  await duplicateDialog.getByRole('button', { name: 'Load', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Project Manager' })).toHaveCount(0);
  await expect(widthInput).toHaveValue('900');

  await page.getByRole('button', { name: 'Project Manager' }).click();
  const importDialog = page.getByRole('dialog', { name: 'Project Manager' });
  await importDialog.getByLabel('Import JSON').setInputFiles({
    name: 'corrupt.cabinet-project.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ invalid json'),
  });
  await expect(page.getByText('Invalid project file')).toBeVisible();
  await expect(importDialog.getByText('Kitchen Revision', { exact: true })).toHaveCount(2);

  await importDialog.getByLabel('Import JSON').setInputFiles({
    name: 'invalid-project.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ cabinets: 'not-an-array' })),
  });
  await expect(importDialog.getByText('Kitchen Revision', { exact: true })).toHaveCount(2);
});

test('project saving remains available near or without a storage estimate', async ({ appPage: page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate: async () => ({ usage: 90 * 1024 * 1024, quota: 100 * 1024 * 1024 }) },
    });
  });
  await page.getByRole('button', { name: 'Project Manager' }).click();
  let dialog = page.getByRole('dialog', { name: 'Project Manager' });
  await expect(dialog.getByRole('status', { name: /Storage nearly full/i })).toBeVisible();
  await dialog.getByPlaceholder('Project name…').fill('Near limit project');
  const saveButton = dialog.getByRole('button', { name: 'Save', exact: true });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(dialog.getByText('Near limit project', { exact: true })).toBeVisible();
  await dialog.getByText('Close', { exact: true }).click();

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate: async () => ({ usage: 0, quota: 0 }) },
    });
  });
  await page.getByRole('button', { name: 'Project Manager' }).click();
  dialog = page.getByRole('dialog', { name: 'Project Manager' });
  await expect(dialog.getByRole('status', { name: /unavailable/i })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  await dialog.getByPlaceholder('Project name…').fill('Unavailable estimate project');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByText('Unavailable estimate project', { exact: true })).toBeVisible();
  await dialog.getByText('Close', { exact: true }).click();

  await page.reload();
  await page.getByRole('button', { name: 'Project Manager' }).click();
  dialog = page.getByRole('dialog', { name: 'Project Manager' });
  await expect(dialog.getByText('Near limit project', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Unavailable estimate project', { exact: true })).toBeVisible();
});

test('canceling share copies its URL and snapshots compare, restore, and delete', async ({ appPage: page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => Promise.reject(new Error('Share canceled')),
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => Promise.resolve(localStorage.setItem('e2e:clipboard', text)),
        readText: () => Promise.resolve(localStorage.getItem('e2e:clipboard') ?? ''),
      },
    });
  });
  await page.getByRole('tab', { name: 'Configure' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  await widthInput.fill('800');
  await widthInput.press('Enter');

  await page.getByRole('button', { name: 'Share Link' }).click();
  await expect(page.getByText('Shareable link copied to clipboard')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await page.evaluate(() => location.href));

  const snapshotToggle = page.getByRole('button', { name: 'Project Snapshots' });
  await snapshotToggle.click();
  const snapshotName = page.getByRole('textbox', { name: 'Snapshot name…' });
  await snapshotName.fill('Before');
  await page.getByRole('button', { name: 'Save Snapshot' }).click();
  await expect(page.getByText('Before', { exact: true })).toBeVisible();

  await widthInput.fill('900');
  await widthInput.press('Enter');
  await snapshotName.fill('After');
  await page.getByRole('button', { name: 'Save Snapshot' }).click();
  await expect(page.getByText('After', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Compare Snapshots', exact: true }).click();
  const diffDialog = page.getByRole('dialog', { name: 'Compare Snapshots' });
  await expect(diffDialog).toContainText('Width');
  await expect(diffDialog).toContainText('800');
  await expect(diffDialog).toContainText('900');
  await diffDialog.getByText('Close', { exact: true }).click();

  await page.getByRole('button', { name: 'Restore: Before' }).click();
  await expect(widthInput).toHaveValue('800');
  await page.getByRole('button', { name: 'Delete snapshot: After' }).click();
  await expect(page.getByText('After', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete snapshot: Before' }).click();
  await expect(page.getByText('No snapshots saved yet.')).toBeVisible();
});

test('built-in presets update configuration and parts, and saved presets survive reload', async ({ appPage: page }) => {
  const presets = [
    ['Kitchen Base', 600, 720, 550, 'Cabinet', 'Top Panel'],
    ['Kitchen Wall Unit', 600, 700, 300, 'Cabinet', 'Top Panel'],
    ['Tall Pantry', 600, 2000, 550, 'Cabinet', 'Top Panel'],
    ['Bookcase', 800, 1800, 300, 'Bookshelf', 'Adjustable Shelf'],
    ['Double Wardrobe', 1200, 2200, 600, 'Wardrobe', 'Hanging Rail'],
    ['Bathroom Vanity', 800, 850, 450, 'Cabinet', 'Drawer 1 Front'],
  ] as const;

  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  for (const [presetName, width, height, depth, furnitureType, expectedPart] of presets) {
    await configuratorTab.click();
    await page.getByRole('button', { name: new RegExp(presetName) }).click();
    await expect(page.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue(String(width));
    await expect(page.getByRole('spinbutton', { name: 'Height', exact: true })).toHaveValue(String(height));
    await expect(page.getByRole('spinbutton', { name: 'Depth', exact: true })).toHaveValue(String(depth));
    await expect(page.getByRole('radio', { name: furnitureType, exact: true })).toBeChecked();
    await showParts(page);
    await expect(partRow(page, expectedPart)).toHaveCount(1);
  }

  await configuratorTab.click();
  await page.getByRole('button', { name: 'My Saved Cabinets' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  await widthInput.fill('1000');
  await widthInput.press('Enter');
  await page.getByPlaceholder('Cabinet name…').fill('Custom Tall Preset');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Custom Tall Preset', { exact: true })).toBeVisible();

  await page.reload();
  await configuratorTab.click();
  const reloadedWidth = page.getByRole('spinbutton', { name: 'Width' });
  await reloadedWidth.fill('700');
  await reloadedWidth.press('Enter');
  await page.getByRole('button', { name: 'My Saved Cabinets' }).click();
  const savedPreset = page.getByText('Custom Tall Preset', { exact: true }).locator('..').locator('..');
  await savedPreset.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(reloadedWidth).toHaveValue('1000');
  await showParts(page);
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(4)).toHaveText('964');
});
