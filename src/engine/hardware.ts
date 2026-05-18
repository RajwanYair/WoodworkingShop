import type { CabinetConfig, HardwareItem } from './types';
import { computeDimensions } from './dimensions';

/**
 * Generate the full hardware (ironmongery) list for a cabinet config.
 * Quantities follow standard Israeli carpentry practice.
 */
export function generateHardware(cfg: CabinetConfig): HardwareItem[] {
  // Plain plates have no hardware
  if (cfg.furnitureType === 'panel') return [];

  const d = computeDimensions(cfg);
  const items: HardwareItem[] = [];
  const hasDoors = cfg.doorStyle !== 'none' && cfg.doorCount > 0;

  // ── Hinges (35 mm Euro / clip-on) ──
  if (hasDoors) {
    items.push({
      id: 'H01',
      name: { en: 'Euro Hinge 35 mm (110°)', he: 'ציר מטבח 35 מ"מ (110°)' },
      qty: d.hingesPerDoor * cfg.doorCount,
      unit: { en: 'pcs', he: "יח'" },
    });

    // Mounting plates (one per hinge)
    items.push({
      id: 'H02',
      name: { en: 'Hinge Mounting Plate', he: 'פלטת ציר' },
      qty: d.hingesPerDoor * cfg.doorCount,
      unit: { en: 'pcs', he: "יח'" },
    });
  }
  // ── Shelf pins (4 per adjustable shelf) ──
  if (cfg.shelfCount > 0) {
    items.push({
      id: 'H03',
      name: { en: 'Shelf Pin 5 mm', he: 'פין מדף 5 מ"מ' },
      qty: cfg.shelfCount * 4,
      unit: { en: 'pcs', he: "יח'" },
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
    unit: { en: 'pcs', he: "יח'" },
  });

  // ── Confirmat covers ──
  items.push({
    id: 'H05',
    name: { en: 'Confirmat Cover Cap', he: 'כיסוי קונפירמט' },
    qty: confirmatQty,
    unit: { en: 'pcs', he: "יח'" },
  });

  // ── Back panel nails / screws (every ~150 mm around perimeter) ──
  const backPerimeter = 2 * (d.backPanelHeight + d.backPanelWidth);
  const backNailQty = Math.ceil(backPerimeter / 150);
  items.push({
    id: 'H06',
    name: { en: 'Back Panel Nail 25 mm', he: 'מסמר גב 25 מ"מ' },
    qty: backNailQty,
    unit: { en: 'pcs', he: "יח'" },
  });

  // ── L-brackets for wall mounting ──
  items.push({
    id: 'H07',
    name: { en: 'L-Bracket (wall mount)', he: 'זווית L (תלייה)' },
    qty: cfg.width >= 800 ? 4 : 2,
    unit: { en: 'pcs', he: "יח'" },
  });

  // ── Wall screws + dowels for L-brackets ──
  const bracketQty = cfg.width >= 800 ? 4 : 2;
  items.push({
    id: 'H08',
    name: { en: 'Wall Screw + Dowel 8×60 mm', he: 'בורג+דיבל קיר 8×60 מ"מ' },
    qty: bracketQty * 2, // 2 screws per bracket
    unit: { en: 'pcs', he: "יח'" },
  });

  // ── Handles ──
  if (hasDoors && cfg.handleStyle !== 'none') {
    items.push({
      id: 'H09',
      name: handleName(cfg.handleStyle),
      qty: cfg.doorCount,
      unit: { en: 'pcs', he: "יח'" },
    });
  }

  // ── Wood glue ──
  items.push({
    id: 'H10',
    name: { en: 'Wood Glue (PVA)', he: 'דבק עץ PVA' },
    qty: 1,
    unit: { en: 'bottle', he: 'בקבוק' },
  });

  // ── Drawer slides (pair per drawer) ──
  if (cfg.drawerCount > 0) {
    // Pick the next standard slide length down from the cabinet depth
    // (≈ depth − 50 mm allowance for back panel + clearance). Standard
    // ranges: 250/300/350/400/450/500/550/600 mm.
    const slideTarget = cfg.depth - 50;
    const standards = [250, 300, 350, 400, 450, 500, 550, 600];
    const slideLen = standards.reduce((best, v) => (v <= slideTarget ? v : best), standards[0]);
    const slideType = cfg.drawerSlideType ?? 'standard';
    const slideTypeLabel =
      slideType === 'soft-close'
        ? { en: `Soft-Close Drawer Slide Pair ${slideLen} mm`, he: `זוג מסילות סגירה רכה ${slideLen} מ"מ` }
        : slideType === 'full-extension'
          ? { en: `Full-Extension Drawer Slide Pair ${slideLen} mm`, he: `זוג מסילות הוצאה מלאה ${slideLen} מ"מ` }
          : { en: `Drawer Slide Pair ${slideLen} mm`, he: `זוג מסילות מגירה ${slideLen} מ"מ` };
    items.push({
      id: 'H11',
      name: slideTypeLabel,
      qty: cfg.drawerCount,
      unit: { en: 'pairs', he: 'זוגות' },
    });

    // Soft-close under-mount dampers (one per drawer when soft-close type)
    if (slideType === 'soft-close') {
      items.push({
        id: 'H17',
        name: { en: 'Soft-Close Drawer Damper', he: 'בולם סגירה רכה למגירה' },
        qty: cfg.drawerCount,
        unit: { en: 'pcs', he: "יח'" },
      });
    }

    // Drawer handle (one per drawer)
    if (cfg.handleStyle !== 'none') {
      items.push({
        id: 'H12',
        name: handleName(cfg.handleStyle),
        qty: cfg.drawerCount,
        unit: { en: 'pcs', he: "יח'" },
      });
    }
  }

  // ── Soft-close hinge dampers (Sprint 113) — one per hinge ──
  if (hasDoors) {
    items.push({
      id: 'H13',
      name: { en: 'Soft-Close Hinge Damper', he: 'בולם סגירה רכה לציר' },
      qty: d.hingesPerDoor * cfg.doorCount,
      unit: { en: 'pcs', he: "יח'" },
    });

    // Door bumper pads — 2 per door
    items.push({
      id: 'H14',
      name: { en: 'Door Bumper Pad (silicone)', he: 'פד בולם דלת (סיליקון)' },
      qty: cfg.doorCount * 2,
      unit: { en: 'pcs', he: "יח'" },
    });
  }

  // ── Cabinet leveller feet (4 per cabinet, Sprint 113) ──
  items.push({
    id: 'H15',
    name: { en: 'Cabinet Leveller Foot', he: 'רגל מפלסת לארון' },
    qty: 4,
    unit: { en: 'pcs', he: "יח'" },
    unitPrice: 3.5,
  });

  // ── Edge banding roll (Sprint 113) — approximate metres based on the
  //    visible carcass front edges. One roll per 50 m of edge demand,
  //    minimum 1 roll. ──
  const visibleEdgeM = ((cfg.width + cfg.height) * 2) / 1000;
  items.push({
    id: 'H16',
    name: { en: 'Edge Banding Roll (50 m)', he: 'גליל סרט קצוות (50 מ׳)' },
    qty: Math.max(1, Math.ceil(visibleEdgeM / 50)),
    unit: { en: 'rolls', he: 'גלילים' },
    unitPrice: 45,
  });

  // ── Cam locks (confirmats) for carcass joints — 4 per panel join ──
  const panelJoins = 4 + cfg.shelfCount; // top+bottom+2sides + shelves
  items.push({
    id: 'H18',
    name: { en: 'Cam Lock Set (bolt + cam)', he: 'סט מנעול קאם (בורג + קאם)' },
    qty: panelJoins * 4,
    unit: { en: 'sets', he: 'סטים' },
    unitPrice: 0.8,
  });

  // ── Shelf pins / studs (5 per shelf, 4 holes) ──
  if (cfg.shelfCount > 0) {
    items.push({
      id: 'H19',
      name: { en: 'Shelf Support Stud 5 mm', he: 'סיכת מדף 5 מ"מ' },
      qty: cfg.shelfCount * 4,
      unit: { en: 'pcs', he: "יח'" },
      unitPrice: 0.15,
    });
  }

  // ── Corner braces for top/bottom reinforcement ──
  items.push({
    id: 'H20',
    name: { en: 'Corner Brace (metal)', he: 'זווית חיזוק מתכת' },
    qty: 4,
    unit: { en: 'pcs', he: "יח'" },
    unitPrice: 1.2,
  });

  // ── Plastic corner protectors for carcass transport ──
  items.push({
    id: 'H21',
    name: { en: 'Plastic Corner Protector', he: 'מגן פינה פלסטיק' },
    qty: 8,
    unit: { en: 'pcs', he: "יח'" },
    unitPrice: 0.5,
  });

  // ── Assembly screws (3.5×35 mm, ~12 per carcass panel join) ──
  items.push({
    id: 'H22',
    name: { en: 'Wood Screw 3.5×35 mm', he: 'בורג עץ 3.5×35 מ"מ' },
    qty: panelJoins * 12,
    unit: { en: 'pcs', he: "יח'" },
    unitPrice: 0.05,
  });

  // ── Sanding pads (assorted grit pack) ──
  items.push({
    id: 'H23',
    name: { en: 'Sanding Pad Assorted Pack', he: 'ערכת ספוגי שיוף מיקס' },
    qty: 1,
    unit: { en: 'pack', he: 'חבילה' },
    unitPrice: 8,
  });

  // ── Touch-up edge banding iron ──
  items.push({
    id: 'H24',
    name: { en: 'Edge Banding Iron Trimmer', he: 'גוזם קצוות סרט' },
    qty: 1,
    unit: { en: 'pcs', he: "יח'" },
    unitPrice: 12,
  });

  return items;
}

function handleName(style: string): { en: string; he: string } {
  switch (style) {
    case 'bar':
      return { en: 'Bar Handle 160 mm', he: 'ידית ברזל 160 מ"מ' };
    case 'knob':
      return { en: 'Round Knob 35 mm', he: 'כפתור עגול 35 מ"מ' };
    case 'cup':
      return { en: 'Cup Pull 96 mm', he: 'ידית שקועה 96 מ"מ' };
    case 'edge':
      return { en: 'Edge Pull Profile', he: 'פרופיל אחיזה' };
    default:
      return { en: style, he: style };
  }
}
