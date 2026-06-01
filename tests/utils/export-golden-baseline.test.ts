import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cfg } from '../helpers';
import { generateParts } from '../../src/engine/parts';
import { generateHardware } from '../../src/engine/hardware';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import { generateBomCsv } from '../../src/utils/bom-export';
import { cutSheetToDxf } from '../../src/utils/dxf-export';
import { cutSheetToGcode } from '../../src/utils/gcode-export';

const isUpdateMode = process.env.UPDATE_EXPORT_GOLDEN === '1';
const outputDir = path.resolve(process.cwd(), 'tests', 'fixtures', 'exports', 'golden');

function sanitizeGcode(content: string): string {
  return content.replace(/^; Generated:.*$/m, '; Generated: <normalized>');
}

function sanitizeBomCsv(content: string): string {
  return content.replace(/^# Generated:.*$/m, '# Generated: <normalized>');
}

function sanitizeDxf(content: string): string {
  return content.replace(/^Generated:.*$/m, 'Generated: <normalized>');
}

function buildGoldenArtifacts() {
  const project = {
    name: 'golden-baseline-project',
    config: cfg({
      furnitureType: 'cabinet',
      width: 900,
      height: 720,
      depth: 560,
      shelfCount: 2,
      carcassMaterial: 'plywood-17',
      backPanelMaterial: 'plywood-4',
      hasBack: true,
      doorStyle: 'flat',
      doorCount: 2,
      drawerCount: 1,
    }),
  };

  const parts = generateParts(project.config);
  const hardware = generateHardware(project.config);
  const optimization = optimizeCutSheets(parts, 3);
  const firstSheet = optimization.sheets[0];

  if (!firstSheet) {
    throw new Error('Golden fixture generation requires at least one optimization sheet.');
  }

  const bomCsv = sanitizeBomCsv(generateBomCsv([{ name: project.name, parts, hardware }], 'en', 'en'));
  const dxf = sanitizeDxf(cutSheetToDxf(firstSheet));
  const gcode = sanitizeGcode(cutSheetToGcode(firstSheet));

  const summary = {
    projectName: project.name,
    partsCount: parts.length,
    hardwareCount: hardware.length,
    sheets: optimization.totalSheets,
    overallYield: optimization.overallYield,
    firstSheetMaterial: firstSheet.material,
    firstSheetParts: firstSheet.parts.length,
  };

  return {
    'summary.json': `${JSON.stringify(summary, null, 2)}\n`,
    'bom.csv': bomCsv,
    'sheet-1.dxf': dxf,
    'sheet-1.nc': gcode,
  };
}

describe('export golden baseline', () => {
  it('matches the stored baseline fixtures', () => {
    const artifacts = buildGoldenArtifacts();

    if (isUpdateMode) {
      fs.mkdirSync(outputDir, { recursive: true });
      for (const [fileName, content] of Object.entries(artifacts)) {
        fs.writeFileSync(path.join(outputDir, fileName), content, 'utf8');
      }
    }

    for (const [fileName, content] of Object.entries(artifacts)) {
      const targetPath = path.join(outputDir, fileName);
      expect(fs.existsSync(targetPath), `Missing golden fixture ${fileName}. Run: npm run exports:golden:update`).toBe(
        true,
      );

      const expected = fs.readFileSync(targetPath, 'utf8');
      expect(content).toBe(expected);
    }
  });
});
