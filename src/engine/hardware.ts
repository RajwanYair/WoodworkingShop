import type { CabinetConfig, HardwareItem } from './types';
import { computeDimensions } from './dimensions';

/**
 * Generate the full hardware (ironmongery) list for a cabinet config.
 * Quantities follow standard Israeli carpentry practice.
 */
export function generateHardware(cfg: CabinetConfig): HardwareItem[] {
  const d = computeDimensions(cfg);
  const items: HardwareItem[] = [];
  const hasDoors = cfg.doorStyle !== 'none' && cfg.doorCount > 0;

  // ── Hinges (35 mm Euro / clip-on) ──
  if (hasDoors) {
    items.push({
      id: 'H01',
      name: { en: 'Euro Hinge 35 mm (110°)', he: 'ציר מטבח 35 מ"מ (110°)' },
      qty: d.hingesPerDoor * cfg.doorCount,
      unit: { en: 'pcs', he: 'יח\'' },
    });

    // Mounting plates (one per hinge)
    items.push({
      id: 'H02',
      name: { en: 'Hinge Mounting Plate', he: 'פלטת ציר' },
      qty: d.hingesPerDoor * cfg.doorCount,
      unit: { en: 'pcs', he: 'יח\'' },
    });
  }

  // ── Shelf pins (4 per adjustable shelf) ──
  if (cfg.shelfCount > 0) {
    items.push({
      id: 'H03',
      name: { en: 'Shelf Pin 5 mm', he: 'פין מדף 5 מ"מ' },
      qty: cfg.shelfCount * 4,
      unit: { en: 'pcs', he: 'יח\'' },
    });
  }

  // ── Confirmat screws (carcass assembly) ──
  // 2 per corner × 4 corners = 8 base + 2 per fixed shelf
  const fixedShelfCount = cfg.height > 1200 ? 1 : 0;
  const confirmatQty = 8 + fixedShelfCount * 4;
  items.push({
    id: 'H04',
    name: { en: 'Confirmat Screw 7×50 mm', he: 'בורג קונפירמט 7×50 מ"מ' },
    qty: confirmatQty,
    unit: { en: 'pcs', he: 'יח\'' },
  });

  // ── Confirmat covers ──
  items.push({
    id: 'H05',
    name: { en: 'Confirmat Cover Cap', he: 'כיסוי קונפירמט' },
    qty: confirmatQty,
    unit: { en: 'pcs', he: 'יח\'' },
  });

  // ── Back panel nails / screws (every ~150 mm around perimeter) ──
  const backPerimeter = 2 * (d.backPanelHeight + d.backPanelWidth);
  const backNailQty = Math.ceil(backPerimeter / 150);
  items.push({
    id: 'H06',
    name: { en: 'Back Panel Nail 25 mm', he: 'מסמר גב 25 מ"מ' },
    qty: backNailQty,
    unit: { en: 'pcs', he: 'יח\'' },
  });

  // ── L-brackets for wall mounting ──
  items.push({
    id: 'H07',
    name: { en: 'L-Bracket (wall mount)', he: 'זווית L (תלייה)' },
    qty: cfg.width >= 800 ? 4 : 2,
    unit: { en: 'pcs', he: 'יח\'' },
  });

  // ── Wall screws + dowels for L-brackets ──
  const bracketQty = cfg.width >= 800 ? 4 : 2;
  items.push({
    id: 'H08',
    name: { en: 'Wall Screw + Dowel 8×60 mm', he: 'בורג+דיבל קיר 8×60 מ"מ' },
    qty: bracketQty * 2, // 2 screws per bracket
    unit: { en: 'pcs', he: 'יח\'' },
  });

  // ── Handles ──
  if (hasDoors && cfg.handleStyle !== 'none') {
    items.push({
      id: 'H09',
      name: handleName(cfg.handleStyle),
      qty: cfg.doorCount,
      unit: { en: 'pcs', he: 'יח\'' },
    });
  }

  // ── Wood glue ──
  items.push({
    id: 'H10',
    name: { en: 'Wood Glue (PVA)', he: 'דבק עץ PVA' },
    qty: 1,
    unit: { en: 'bottle', he: 'בקבוק' },
  });

  return items;
}

function handleName(style: string): { en: string; he: string } {
  switch (style) {
    case 'bar':   return { en: 'Bar Handle 160 mm', he: 'ידית ברזל 160 מ"מ' };
    case 'knob':  return { en: 'Round Knob 35 mm',  he: 'כפתור עגול 35 מ"מ' };
    case 'cup':   return { en: 'Cup Pull 96 mm',    he: 'ידית שקועה 96 מ"מ' };
    case 'edge':  return { en: 'Edge Pull Profile',  he: 'פרופיל אחיזה' };
    default:      return { en: style,                he: style };
  }
}
