import type { CabinetConfig, Part } from './types';
import { getMaterial } from './materials';
import { computeDimensions } from './dimensions';

/**
 * Generate the full cut-list / parts table from a cabinet configuration.
 * Each part includes bilingual names, dimensions, quantity, and edge info.
 */
export function generateParts(cfg: CabinetConfig): Part[] {
  const d = computeDimensions(cfg);
  const cm = getMaterial(cfg.carcassMaterial);
  const bm = getMaterial(cfg.backPanelMaterial);
  const t = cm.thickness;
  const eb = cfg.edgeBanding;

  const parts: Part[] = [];
  let idx = 1;
  const id = () => `P${String(idx++).padStart(2, '0')}`;
  const isBookshelf = cfg.furnitureType === 'bookshelf';
  const isDesk = cfg.furnitureType === 'desk';

  // ── Desk-specific parts ──
  if (isDesk) {
    // Desktop (top surface)
    parts.push({
      id: id(), qty: 1,
      name: { en: 'Desktop', he: 'משטח שולחן' },
      material: cfg.carcassMaterial, thickness: t,
      length: cfg.width, width: cfg.depth,
      edgeBanding: edgeLabel(eb !== 'none' ? '4-edges' : 'none'),
    });

    // Side panels (legs)
    parts.push({
      id: id(), qty: 2,
      name: { en: 'Side Panel', he: 'דופן צד' },
      material: cfg.carcassMaterial, thickness: t,
      length: cfg.height - t, width: cfg.depth,
      edgeBanding: edgeLabel(eb !== 'none' ? 'front' : 'none'),
    });

    // Modesty panel (back kick board)
    const modestyHeight = Math.round(cfg.height * 0.4);
    parts.push({
      id: id(), qty: 1,
      name: { en: 'Modesty Panel', he: 'לוח צניעות' },
      material: cfg.carcassMaterial, thickness: t,
      length: cfg.width - 2 * t, width: modestyHeight,
      edgeBanding: edgeLabel('none'),
    });

    // Back panel
    parts.push({
      id: id(), qty: 1,
      name: { en: 'Back Panel', he: 'לוח גב' },
      material: cfg.backPanelMaterial, thickness: bm.thickness,
      length: d.backPanelHeight, width: d.backPanelWidth,
      edgeBanding: edgeLabel('none'),
    });

    // Optional shelves (under-desk storage)
    if (cfg.shelfCount > 0) {
      parts.push({
        id: id(), qty: cfg.shelfCount,
        name: { en: 'Under-desk Shelf', he: 'מדף תחתון' },
        material: cfg.carcassMaterial, thickness: t,
        length: d.shelfWidth, width: d.shelfDepth,
        edgeBanding: edgeLabel(eb !== 'none' ? 'front' : 'none'),
      });
    }

    return parts;
  }

  const isWardrobe = cfg.furnitureType === 'wardrobe';

  // ── Carcass sides (left + right) ──
  parts.push({
    id: id(), qty: 2,
    name: { en: 'Side Panel', he: 'דופן צד' },
    material: cfg.carcassMaterial, thickness: t,
    length: cfg.height, width: cfg.depth,
    edgeBanding: edgeLabel(eb !== 'none' ? 'front' : 'none'),
  });

  // ── Top + bottom panels ──
  const tbWidth = cfg.width - 2 * t; // sits between side panels
  parts.push({
    id: id(), qty: 1,
    name: { en: 'Top Panel', he: 'משטח עליון' },
    material: cfg.carcassMaterial, thickness: t,
    length: tbWidth, width: cfg.depth,
    edgeBanding: edgeLabel(eb !== 'none' ? 'front' : 'none'),
  });
  parts.push({
    id: id(), qty: 1,
    name: { en: 'Bottom Panel', he: 'משטח תחתון' },
    material: cfg.carcassMaterial, thickness: t,
    length: tbWidth, width: cfg.depth,
    edgeBanding: edgeLabel(eb !== 'none' ? 'front' : 'none'),
  });

  // ── Fixed shelf (middle) — only if height > 1200 ──
  if (cfg.height > 1200) {
    parts.push({
      id: id(), qty: 1,
      name: { en: 'Fixed Shelf', he: 'מדף קבוע' },
      material: cfg.carcassMaterial, thickness: t,
      length: d.internalWidth, width: d.shelfDepth,
      edgeBanding: edgeLabel(eb !== 'none' ? 'front' : 'none'),
    });
  }

  // ── Adjustable shelves ──
  if (cfg.shelfCount > 0) {
    parts.push({
      id: id(), qty: cfg.shelfCount,
      name: { en: 'Adjustable Shelf', he: 'מדף מתכוונן' },
      material: cfg.carcassMaterial, thickness: t,
      length: d.shelfWidth, width: d.shelfDepth,
      edgeBanding: edgeLabel(eb !== 'none' ? 'front' : 'none'),
    });
  }

  // ── Doors ──
  if (cfg.doorStyle !== 'none' && !isBookshelf && !isDesk) {
    const isGlass = cfg.doorStyle === 'glass';
    parts.push({
      id: id(), qty: cfg.doorCount,
      name: isGlass
        ? { en: 'Glass Door', he: 'דלת זכוכית' }
        : { en: 'Door', he: 'דלת' },
      material: isGlass ? 'tempered-glass-4' : cfg.carcassMaterial,
      thickness: isGlass ? 4 : t,
      length: d.doorHeight, width: d.doorWidth,
      edgeBanding: edgeLabel(isGlass ? 'none' : (eb !== 'none' ? '4-edges' : 'none')),
    });
  }

  // ── Drawers ──
  if (cfg.drawerCount > 0 && !isBookshelf && !isDesk) {
    const drawerHeight = 150; // mm standard drawer box height
    const drawerWidth = d.internalWidth - 26; // 13mm clearance each side for slides
    const drawerDepth = Math.min(cfg.depth - t - 30, 500); // leave clearance for back panel + face

    // Drawer front panel (decorative, same material as carcass)
    parts.push({
      id: id(), qty: cfg.drawerCount,
      name: { en: 'Drawer Front', he: 'חזית מגירה' },
      material: cfg.carcassMaterial, thickness: t,
      length: drawerHeight + 30, width: drawerWidth + 26, // overlay front
      edgeBanding: edgeLabel(eb !== 'none' ? '4-edges' : 'none'),
    });

    // Drawer box sides (2 per drawer)
    parts.push({
      id: id(), qty: cfg.drawerCount * 2,
      name: { en: 'Drawer Box Side', he: 'דופן מגירה' },
      material: cfg.carcassMaterial, thickness: t,
      length: drawerDepth, width: drawerHeight,
      edgeBanding: edgeLabel('none'),
    });

    // Drawer box front+back (2 per drawer, inner structural pieces)
    parts.push({
      id: id(), qty: cfg.drawerCount * 2,
      name: { en: 'Drawer Box End', he: 'קצה מגירה' },
      material: cfg.carcassMaterial, thickness: t,
      length: drawerWidth - 2 * t, width: drawerHeight,
      edgeBanding: edgeLabel('none'),
    });

    // Drawer bottom (plywood/HDF, uses back panel material)
    parts.push({
      id: id(), qty: cfg.drawerCount,
      name: { en: 'Drawer Bottom', he: 'תחתית מגירה' },
      material: cfg.backPanelMaterial, thickness: bm.thickness,
      length: drawerDepth - 2, width: drawerWidth - 2 * t,
      edgeBanding: edgeLabel('none'),
    });
  }

  // ── Back panel ──
  parts.push({
    id: id(), qty: 1,
    name: { en: 'Back Panel', he: 'לוח גב' },
    material: cfg.backPanelMaterial, thickness: bm.thickness,
    length: d.backPanelHeight, width: d.backPanelWidth,
    edgeBanding: edgeLabel('none'),
  });

  // ── Wardrobe hanging rail ──
  if (isWardrobe) {
    parts.push({
      id: id(), qty: 1,
      name: { en: 'Hanging Rail', he: 'מוט תלייה' },
      material: cfg.carcassMaterial, thickness: 25,
      length: d.internalWidth, width: 25,
      edgeBanding: edgeLabel('none'),
    });
  }

  return parts;
}

/** Get the derived dimensions — convenience re-export. */
export { computeDimensions } from './dimensions';

// ─── Helpers ───

type EdgeCode = 'none' | 'front' | '4-edges';

function edgeLabel(code: EdgeCode): { en: string; he: string } {
  switch (code) {
    case 'front':   return { en: 'Front edge', he: 'קצה קדמי' };
    case '4-edges': return { en: 'All 4 edges', he: 'כל 4 הקצוות' };
    default:        return { en: 'None', he: 'ללא' };
  }
}

/**
 * Compute total edge banding length in mm for cost estimation.
 */
export function computeEdgeBandingTotal(parts: Part[]): number {
  let total = 0;
  for (const p of parts) {
    if (p.edgeBanding.en === 'Front edge') {
      total += p.length * p.qty;  // one long edge per piece
    } else if (p.edgeBanding.en === 'All 4 edges') {
      total += 2 * (p.length + p.width) * p.qty;
    }
  }
  return total;
}
