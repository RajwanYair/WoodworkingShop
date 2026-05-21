import type { CabinetConfig } from './types';

export interface AssemblyStep {
  stepNumber: number;
  title: { en: string; he: string };
  description: { en: string; he: string };
  parts: string[]; // part IDs highlighted in this step
  icon: string; // emoji icon
  /** Risk level for the step — shown as a colour-coded badge in the UI. */
  riskLevel: 'low' | 'medium' | 'high';
  /** Sprint 64 — estimated minutes to complete this step. */
  estimatedMinutes: number;
  tip?: { en: string; he: string };
  videoKeyword?: string; // YouTube search keyword for tutorial lookup
  /** Phase 12 / Sprint 10 — unique DAG node identifier, e.g. 'step-3'. */
  id: string;
  /** Phase 12 / Sprint 10 — IDs of steps that must complete before this one. */
  dependencies?: readonly string[];
  /** Phase 12 / Sprint 10 — true when this step is in a parallel-executable group. */
  parallel?: boolean;
}

// Internal shape used inside generateAssemblySteps before DAG resolution
type RawStep = Omit<AssemblyStep, 'id' | 'dependencies' | 'parallel'>;

/**
 * Compute dependency edges and parallel flags for a flat list of raw assembly
 * steps (built inside generateAssemblySteps without id/dep/parallel fields).
 *
 * Algorithm:
 *  1. Assign `id: 'step-N'` based on stepNumber.
 *  2. Build a linear chain (each step depends on its predecessor).
 *  3. Detect the "fitting phase" — steps between the carcass-closing step
 *     (Install Back Panel / Square the Carcass) and the Wall Mounting step —
 *     and mark independent fitting steps `parallel: true` with a shared
 *     dependency on the closing step.
 *  4. Restore sequential dependency within the door sub-chain so that
 *     "Install Handles" always follows door-hinge mounting.
 */
export function buildAssemblyDAG(rawSteps: readonly RawStep[]): AssemblyStep[] {
  if (rawSteps.length === 0) return [];

  // Pass 1: assign IDs and build a linear chain
  const steps: AssemblyStep[] = rawSteps.map((s, i) => ({
    ...s,
    id: `step-${s.stepNumber}`,
    dependencies: i === 0 ? [] : [`step-${rawSteps[i - 1].stepNumber}`],
    parallel: false,
  }));

  // Pass 2: identify the fitting phase
  const closingIdx = steps.findIndex(
    (s) => s.title.en.startsWith('Install Back') || s.title.en.startsWith('Square the Carcass'),
  );
  if (closingIdx < 0) return steps;

  const wallIdx = steps.findIndex((s) => s.title.en.startsWith('Wall Mounting'));
  const fitEnd = wallIdx < 0 ? steps.length : wallIdx;
  // Require at least two fitting steps to form a parallel group
  if (fitEnd - closingIdx <= 2) return steps;

  const closingId = steps[closingIdx].id;

  // All fitting-phase steps become parallel roots of the closing step
  for (let i = closingIdx + 1; i < fitEnd; i++) {
    steps[i] = { ...steps[i], dependencies: [closingId], parallel: true };
  }

  // Within the door sub-chain, "Install Handles" must follow hinge mounting
  const hingesIdx = steps.findIndex(
    (s, i) =>
      i > closingIdx &&
      i < fitEnd &&
      (s.title.en.startsWith('Mount Hinges') || s.title.en.startsWith('Mount Glass')),
  );
  const handlesIdx = steps.findIndex(
    (s, i) => i > closingIdx && i < fitEnd && s.title.en.startsWith('Install Handles'),
  );
  if (hingesIdx >= 0 && handlesIdx === hingesIdx + 1) {
    steps[handlesIdx] = {
      ...steps[handlesIdx],
      dependencies: [steps[hingesIdx].id],
      parallel: false,
    };
  }

  return steps;
}

/**
 * Generate ordered assembly steps for a cabinet/bookshelf.
 * Follows standard cabinet-making practice:
 *   1. Mark & drill → 2. Back assembly reference → 3. Carcass → 4. Fixed shelves
 *   → 5. Back panel → 6. Doors → 7. Hardware → 8. Shelf pins → 9. Wall mount
 *
 * Phase 12 / Sprint 10: steps are post-processed by buildAssemblyDAG to add
 * `id`, `dependencies`, and `parallel` fields.
 */
export function generateAssemblySteps(cfg: CabinetConfig): AssemblyStep[] {
  const steps: RawStep[] = [];
  const hasDoors = cfg.doorStyle !== 'none' && (cfg.furnitureType === 'cabinet' || cfg.furnitureType === 'wardrobe');
  const hasFixedShelf = cfg.height > 1200 && cfg.furnitureType !== 'desk';
  const isDesk = cfg.furnitureType === 'desk';
  const isWardrobe = cfg.furnitureType === 'wardrobe';
  let n = 1;

  // ── Panel (plain plate) assembly ──
  if (cfg.furnitureType === 'panel') {
    steps.push({
      stepNumber: n++,
      riskLevel: 'low',
      estimatedMinutes: 10,
      title: { en: 'Measure and Mark', he: 'מדידה וסימון' },
      description: {
        en: `Measure and mark the panel to ${cfg.width} × ${cfg.height} mm on the sheet material.`,
        he: `מדוד וסמן את הלוח ל-${cfg.width} × ${cfg.height} מ״מ על חומר הגיליון.`,
      },
      parts: ['P01'],
      icon: '📐',
      tip: { en: 'Use a marking knife for a crisp, accurate line.', he: 'השתמש בסכין סימון לקו מדויק וחד.' },
    });
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 15,
      title: { en: 'Cut to Size', he: 'חיתוך למידה' },
      description: {
        en: 'Cut the panel to the marked dimensions using a table saw or track saw. Check squareness after cutting.',
        he: 'חתוך את הלוח לפי הסימונים באמצעות מסור שולחן או מסור מסילה. בדוק ריבוע לאחר החיתוך.',
      },
      parts: ['P01'],
      icon: '🪥',
      videoKeyword: 'cut sheet panel table saw track saw',
    });
    if (cfg.edgeBanding !== 'none') {
      steps.push({
        stepNumber: n++,
        riskLevel: 'low',
        estimatedMinutes: 20,
        title: { en: 'Apply Edge Banding', he: 'הדבקת פסי קצה' },
        description: {
          en: 'Iron on edge banding tape to all four edges. Use a sharp trimmer and sand flush.',
          he: 'הדבק פסי קצה בגיהוץ על כל ארבעת הקצוות. השתמש בחותך חד ושייף.',
        },
        parts: ['P01'],
        icon: '🔧',
      });
    }
    steps.push({
      stepNumber: n,
      riskLevel: 'low',
      estimatedMinutes: 10,
      title: { en: 'Sand and Inspect', he: 'שיוף ובדיקה' },
      description: {
        en: 'Sand all edges to 120 grit. Inspect the surface for chips or rough spots. Panel is ready.',
        he: 'שייף את כל הקצוות עד גריט 120. בדוק את המשטח לנסורת ועקומות. הלוח מוכן.',
      },
      parts: ['P01'],
      icon: '✅',
    });
    return buildAssemblyDAG(steps);
  }

  // ── Desk-specific assembly ──
  if (isDesk) {
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 20,
      title: { en: 'Mark & Drill Holes', he: 'סימון וקדיחת חורים' },
      description: {
        en: 'Mark confirmat screw positions on side panels and desktop underside. Drill pilot holes for all connections.',
        he: 'סמן מיקומי ברגי קונפירמט על דפנות הצד ותחתית משטח השולחן. קדח חורים מקדימים לכל החיבורים.',
      },
      parts: ['P01', 'P02'],
      icon: '🔩',
      videoKeyword: 'confirmat screw drilling jig cabinet',
    });
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 30,
      title: { en: 'Assemble Side Panels', he: 'הרכבת דפנות צד' },
      description: {
        en: 'Stand both side panels upright and attach the modesty panel between them using confirmat screws.',
        he: 'העמד את שתי דפנות הצד וחבר את לוח הצניעות ביניהן באמצעות ברגי קונפירמט.',
      },
      parts: ['P02', 'P03'],
      icon: '🪚',
      videoKeyword: 'how to assemble desk side panels confirmat',
    });
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 20,
      title: { en: 'Attach Desktop', he: 'חיבור משטח שולחן' },
      description: {
        en: 'Place the desktop on top of the side panels. Secure with confirmat screws from below. Check that the assembly is square.',
        he: 'הנח את משטח השולחן על דפנות הצד. חבר עם ברגי קונפירמט מלמטה. ודא שההרכבה מרובעת.',
      },
      parts: ['P01'],
      icon: '🔨',
      videoKeyword: 'attach desk top to legs from below',
    });
    if (cfg.shelfCount > 0) {
      steps.push({
        stepNumber: n++,
        riskLevel: 'low',
        estimatedMinutes: 15,
        title: { en: 'Install Under-desk Shelves', he: 'התקנת מדפים תחתונים' },
        description: {
          en: `Install ${cfg.shelfCount} shelves between the side panels for storage.`,
          he: `התקן ${cfg.shelfCount} מדפים בין דפנות הצד לאחסון.`,
        },
        parts: ['P05'],
        icon: '📚',
      });
    }
    if (cfg.edgeBanding !== 'none') {
      steps.push({
        stepNumber: n,
        riskLevel: 'low',
        estimatedMinutes: 20,
        title: { en: 'Apply Edge Banding', he: 'הדבקת פסי קצה' },
        description: {
          en: 'Iron on edge banding tape to all visible edges of the desktop and side panels. Trim and sand smooth.',
          he: 'הדבק פסי קצה בגיהוץ על כל הקצוות הנראים של משטח השולחן והדפנות. חתוך והשחזה.',
        },
        parts: [],
        icon: '🪵',
      });
    }
    return buildAssemblyDAG(steps);
  }

  steps.push({
    stepNumber: n++,
    riskLevel: 'medium',
    estimatedMinutes: 25,
    title: { en: 'Mark & Drill Holes', he: 'סימון וקדיחת חורים' },
    description: {
      en: 'Mark all confirmat screw positions on side, top, and bottom panels. Use a 5mm drill bit for shelf pin holes (32mm system). Drill hinge cup holes (35mm Forstner) on doors if applicable.',
      he: 'סמן את כל מיקומי ברגי הקונפירמט על הדפנות, המשטח העליון והתחתון. השתמש במקדח 5 מ"מ לחורי פיני מדפים (מערכת 32 מ"מ). קדח חורי כוסות צירים (פורסטנר 35 מ"מ) בדלתות אם רלוונטי.',
    },
    parts: ['P01', 'P02', 'P03'],
    icon: '🔩',
    videoKeyword: 'confirmat screw drilling jig cabinet',
    tip: {
      en: 'Use a drill press or jig for accurate perpendicular holes.',
      he: "השתמש במכונת קדיחה או ג'יג לחורים מדויקים ומאונכים.",
    },
  });

  steps.push({
    stepNumber: n++,
    riskLevel: 'medium',
    estimatedMinutes: 30,
    title: { en: 'Assemble Bottom & Sides', he: 'הרכבת תחתון ודפנות' },
    description: {
      en: 'Attach the bottom panel between the two side panels using confirmat screws. Ensure the assembly is square by measuring diagonals.',
      he: 'חבר את המשטח התחתון בין שתי הדפנות באמצעות ברגי קונפירמט. ודא שההרכבה מרובעת על ידי מדידת אלכסונים.',
    },
    parts: ['P01', 'P03'],
    icon: '🪚',
    videoKeyword: 'cabinet carcass assembly confirmat screws',
  });

  if (hasFixedShelf) {
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 20,
      title: { en: 'Install Fixed Shelf', he: 'התקנת מדף קבוע' },
      description: {
        en: 'Attach the fixed shelf with confirmat screws. This shelf adds structural rigidity to the carcass.',
        he: 'חבר את המדף הקבוע עם ברגי קונפירמט. מדף זה מוסיף קשיחות מבנית לשלד.',
      },
      parts: ['P04'],
      icon: '📏',
      videoKeyword: 'install fixed shelf in cabinet',
    });
  }

  steps.push({
    stepNumber: n++,
    riskLevel: 'medium',
    estimatedMinutes: 20,
    title: { en: 'Attach Top Panel', he: 'חיבור משטח עליון' },
    description: {
      en: 'Secure the top panel to the side panels with confirmat screws. Check squareness again.',
      he: 'חבר את המשטח העליון לדפנות עם ברגי קונפירמט. בדוק ריבועיות שוב.',
    },
    parts: ['P02'],
    icon: '🔨',
    videoKeyword: 'attach top panel cabinet carcass',
  });

  if (cfg.hasBack !== false) {
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 25,
      title: { en: 'Install Back Panel', he: 'התקנת לוח גב' },
      description: {
        en: 'Place the back panel into the rabbet and nail/screw around the perimeter every 150mm. The back panel squares the entire carcass.',
        he: 'הנח את לוח הגב בשפה וחבר עם מסמרים/ברגים כל 150 מ"מ לאורך ההיקף. לוח הגב מיישר את כל השלד.',
      },
      parts: [hasFixedShelf ? 'P07' : 'P06'],
      icon: '📐',
      videoKeyword: 'install cabinet back panel square',
      tip: {
        en: 'Start from one corner and work around to keep the carcass square.',
        he: 'התחל מפינה אחת והמשך מסביב כדי לשמור על ריבועיות השלד.',
      },
    });
  } else {
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 30,
      title: { en: 'Square the Carcass (no back)', he: 'יישור השלד (ללא גב)' },
      description: {
        en: 'Without a back panel, brace the open frame diagonally during glue-up and verify diagonals are equal. Add a temporary stretcher or face frame so the unit stays square until permanently fixed in place.',
        he: 'ללא לוח גב, חזק את המסגרת אלכסונית בעת ההדבקה וודא שהאלכסונים שווים. הוסף מסגרת קדמית או חיזוק זמני עד לקיבוע סופי.',
      },
      parts: [],
      icon: '📐',
      videoKeyword: 'square cabinet face frame no back',
    });
  }

  if (hasDoors) {
    const isGlass = cfg.doorStyle === 'glass';
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 30,
      title: isGlass
        ? { en: 'Mount Glass Door Hinges', he: 'הרכבת צירים לדלתות זכוכית' }
        : { en: 'Mount Hinges & Doors', he: 'הרכבת צירים ודלתות' },
      description: isGlass
        ? {
            en: 'Use glass-specific clip-on hinges. Attach the mounting plates to the side panels. Clip the hinges onto the 4mm tempered glass doors. Adjust alignment carefully — glass cannot be trimmed.',
            he: 'השתמש בצירים ייעודיים לזכוכית. חבר את פלטות ההרכבה לדפנות. הצמד את הצירים לדלתות הזכוכית המחוסמת (4 מ"מ). כוון יישור בזהירות — לא ניתן לחתוך זכוכית.',
          }
        : {
            en: 'Screw the mounting plates into the side panels. Clip the hinge cups into the 35mm holes on the doors. Attach doors to mounting plates and adjust alignment.',
            he: 'הברג את פלטות הצירים לדפנות. הכנס את כוסות הצירים לחורי 35 מ"מ בדלתות. חבר דלתות לפלטות וכוון יישור.',
          },
      parts: [hasFixedShelf ? 'P06' : 'P05'],
      icon: '🚪',
      videoKeyword: isGlass ? 'glass door hinge installation cabinet' : 'concealed hinge installation 35mm cabinet',
    });

    steps.push({
      stepNumber: n++,
      riskLevel: 'low',
      estimatedMinutes: 15,
      title: { en: 'Install Handles', he: 'התקנת ידיות' },
      description: {
        en: 'Mark handle positions on doors (typically 100mm from top/bottom edge). Drill and mount handles.',
        he: 'סמן מיקומי ידיות על הדלתות (בדרך כלל 100 מ"מ מהקצה העליון/תחתון). קדח והתקן ידיות.',
      },
      parts: [],
      icon: '🔧',
      videoKeyword: 'install cabinet door handles drill template',
    });
  }

  if (isWardrobe) {
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 20,
      title: { en: 'Install Hanging Rail', he: 'התקנת מוט תלייה' },
      description: {
        en: 'Mount the hanging rail brackets on each side panel at the desired height (typically 1600-1700mm from the bottom). Insert the rail and secure with screws.',
        he: 'הרכב את תושבות מוט התלייה על כל דפנה בגובה הרצוי (בדרך כלל 1600-1700 מ"מ מהתחתית). הכנס את המוט וחזק בברגים.',
      },
      parts: [],
      icon: '👔',
      videoKeyword: 'wardrobe hanging rail installation',
    });
  }

  steps.push({
    stepNumber: n++,
    riskLevel: 'low',
    estimatedMinutes: 10,
    title: { en: 'Insert Shelf Pins & Shelves', he: 'הכנסת פיני מדפים ומדפים' },
    description: {
      en: `Insert 4 shelf pins per shelf at desired heights. Place the ${cfg.shelfCount} adjustable shelves on the pins.`,
      he: `הכנס 4 פיני מדף לכל מדף בגובה הרצוי. הנח את ${cfg.shelfCount} המדפים המתכווננים על הפינים.`,
    },
    parts: [hasFixedShelf ? 'P05' : 'P04'],
    icon: '📚',
    videoKeyword: 'shelf pin installation 32mm system',
  });

  if (cfg.drawerCount > 0) {
    steps.push({
      stepNumber: n++,
      riskLevel: 'medium',
      estimatedMinutes: 45,
      title: { en: 'Assemble & Install Drawers', he: 'הרכבה והתקנת מגירות' },
      description: {
        en: `Assemble ${cfg.drawerCount} drawer box(es): attach sides to front/back pieces with screws, slide in the bottom panel. Mount drawer slides on side panels, then install drawer boxes. Attach decorative drawer fronts with screws from inside.`,
        he: `הרכב ${cfg.drawerCount} קופסת/ות מגירה: חבר דפנות לחלקים קדמיים/אחוריים עם ברגים, החלק את לוח התחתית. הרכב מסילות על הדפנות, ואז התקן את קופסאות המגירה. חבר חזיתות מגירה דקורטיביות עם ברגים מבפנים.`,
      },
      parts: [],
      icon: '🗄️',
      videoKeyword: 'install drawer slides cabinet box assembly',
    });
  }

  if (cfg.edgeBanding !== 'none') {
    steps.push({
      stepNumber: n++,
      riskLevel: 'low',
      estimatedMinutes: 20,
      title: { en: 'Apply Edge Banding', he: 'הדבקת פסי קצה' },
      description: {
        en: 'Iron on edge banding tape to all visible edges. Trim excess with a trimmer or utility knife. Sand edges smooth.',
        he: 'הדבק פסי קצה בגיהוץ על כל הקצוות הנראים. חתוך עודפים עם קצצן או סכין. השחזה חלקה.',
      },
      parts: [],
      icon: '🪵',
      videoKeyword: 'iron on edge banding melamine cabinet',
      tip: {
        en: 'Apply banding before assembly for best results on shelf front edges.',
        he: 'הדבק פסי קצה לפני ההרכבה לתוצאות טובות על קצוות קדמיים של מדפים.',
      },
    });
  }

  steps.push({
    stepNumber: n++,
    riskLevel: 'high',
    estimatedMinutes: 30,
    title: { en: 'Wall Mounting (optional)', he: 'תלייה על הקיר (אופציונלי)' },
    description: {
      en: 'Attach L-brackets to the back of the cabinet. Mark wall positions, drill, insert wall plugs, and secure with screws. Use a level to ensure the cabinet is plumb.',
      he: 'חבר זוויות L לגב הארון. סמן מיקומים על הקיר, קדח, הכנס דיבלים וחבר עם ברגים. השתמש בפלס לוודא שהארון מאוזן.',
    },
    parts: [],
    icon: '🏗️',
    videoKeyword: 'wall mount cabinet L bracket',
  });

  if ((cfg.kickHeight ?? 0) > 0 && !isDesk) {
    steps.push({
      stepNumber: n,
      riskLevel: 'low',
      estimatedMinutes: 15,
      title: { en: 'Attach Toe Kick', he: 'חיבור לוח בסיס (כיכר רגל)' },
      description: {
        en: `Cut the front toe kick board (${cfg.kickHeight} mm tall) to the full cabinet width and the two side kick boards to depth − thickness. Clip or screw them to the underside of the bottom panel. The kick should be set back 50 mm from the front face.`,
        he: `חתוך את לוח הבסיס הקדמי (${cfg.kickHeight} מ"מ) לרוחב מלא של הארון ואת שני לוחות הצד לעומק פחות עובי. חבר עם קליפסים או ברגים לתחתית לוח הבסיס. הכיכר צריכה להיות מוזחת 50 מ"מ מהחזית.`,
      },
      parts: [],
      icon: '🦶',
      videoKeyword: 'toe kick plinth attach kitchen cabinet',
    });
  }

  return buildAssemblyDAG(steps);
}
