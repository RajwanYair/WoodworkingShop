import type { CabinetConfig } from './types';

export interface AssemblyStep {
  stepNumber: number;
  title: { en: string; he: string };
  description: { en: string; he: string };
  parts: string[];   // part IDs highlighted in this step
  icon: string;       // emoji icon
  tip?: { en: string; he: string };
}

/**
 * Generate ordered assembly steps for a cabinet/bookshelf.
 * Follows standard cabinet-making practice:
 *   1. Mark & drill → 2. Back assembly reference → 3. Carcass → 4. Fixed shelves
 *   → 5. Back panel → 6. Doors → 7. Hardware → 8. Shelf pins → 9. Wall mount
 */
export function generateAssemblySteps(cfg: CabinetConfig): AssemblyStep[] {
  const steps: AssemblyStep[] = [];
  const hasDoors = cfg.doorStyle !== 'none' && (cfg.furnitureType === 'cabinet' || cfg.furnitureType === 'wardrobe');
  const hasFixedShelf = cfg.height > 1200 && cfg.furnitureType !== 'desk';
  const isDesk = cfg.furnitureType === 'desk';
  const isWardrobe = cfg.furnitureType === 'wardrobe';
  let n = 1;

  // ── Desk-specific assembly ──
  if (isDesk) {
    steps.push({
      stepNumber: n++,
      title: { en: 'Mark & Drill Holes', he: 'סימון וקדיחת חורים' },
      description: {
        en: 'Mark confirmat screw positions on side panels and desktop underside. Drill pilot holes for all connections.',
        he: 'סמן מיקומי ברגי קונפירמט על דפנות הצד ותחתית משטח השולחן. קדח חורים מקדימים לכל החיבורים.',
      },
      parts: ['P01', 'P02'],
      icon: '🔩',
    });
    steps.push({
      stepNumber: n++,
      title: { en: 'Assemble Side Panels', he: 'הרכבת דפנות צד' },
      description: {
        en: 'Stand both side panels upright and attach the modesty panel between them using confirmat screws.',
        he: 'העמד את שתי דפנות הצד וחבר את לוח הצניעות ביניהן באמצעות ברגי קונפירמט.',
      },
      parts: ['P02', 'P03'],
      icon: '🪚',
    });
    steps.push({
      stepNumber: n++,
      title: { en: 'Attach Desktop', he: 'חיבור משטח שולחן' },
      description: {
        en: 'Place the desktop on top of the side panels. Secure with confirmat screws from below. Check that the assembly is square.',
        he: 'הנח את משטח השולחן על דפנות הצד. חבר עם ברגי קונפירמט מלמטה. ודא שההרכבה מרובעת.',
      },
      parts: ['P01'],
      icon: '🔨',
    });
    if (cfg.shelfCount > 0) {
      steps.push({
        stepNumber: n++,
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
        stepNumber: n++,
        title: { en: 'Apply Edge Banding', he: 'הדבקת פסי קצה' },
        description: {
          en: 'Iron on edge banding tape to all visible edges of the desktop and side panels. Trim and sand smooth.',
          he: 'הדבק פסי קצה בגיהוץ על כל הקצוות הנראים של משטח השולחן והדפנות. חתוך והשחזה.',
        },
        parts: [],
        icon: '🪵',
      });
    }
    return steps;
  }

  steps.push({
    stepNumber: n++,
    title: { en: 'Mark & Drill Holes', he: 'סימון וקדיחת חורים' },
    description: {
      en: 'Mark all confirmat screw positions on side, top, and bottom panels. Use a 5mm drill bit for shelf pin holes (32mm system). Drill hinge cup holes (35mm Forstner) on doors if applicable.',
      he: 'סמן את כל מיקומי ברגי הקונפירמט על הדפנות, המשטח העליון והתחתון. השתמש במקדח 5 מ"מ לחורי פיני מדפים (מערכת 32 מ"מ). קדח חורי כוסות צירים (פורסטנר 35 מ"מ) בדלתות אם רלוונטי.',
    },
    parts: ['P01', 'P02', 'P03'],
    icon: '🔩',
    tip: {
      en: 'Use a drill press or jig for accurate perpendicular holes.',
      he: 'השתמש במכונת קדיחה או ג\'יג לחורים מדויקים ומאונכים.',
    },
  });

  steps.push({
    stepNumber: n++,
    title: { en: 'Assemble Bottom & Sides', he: 'הרכבת תחתון ודפנות' },
    description: {
      en: 'Attach the bottom panel between the two side panels using confirmat screws. Ensure the assembly is square by measuring diagonals.',
      he: 'חבר את המשטח התחתון בין שתי הדפנות באמצעות ברגי קונפירמט. ודא שההרכבה מרובעת על ידי מדידת אלכסונים.',
    },
    parts: ['P01', 'P03'],
    icon: '🪚',
  });

  if (hasFixedShelf) {
    steps.push({
      stepNumber: n++,
      title: { en: 'Install Fixed Shelf', he: 'התקנת מדף קבוע' },
      description: {
        en: 'Attach the fixed shelf with confirmat screws. This shelf adds structural rigidity to the carcass.',
        he: 'חבר את המדף הקבוע עם ברגי קונפירמט. מדף זה מוסיף קשיחות מבנית לשלד.',
      },
      parts: ['P04'],
      icon: '📏',
    });
  }

  steps.push({
    stepNumber: n++,
    title: { en: 'Attach Top Panel', he: 'חיבור משטח עליון' },
    description: {
      en: 'Secure the top panel to the side panels with confirmat screws. Check squareness again.',
      he: 'חבר את המשטח העליון לדפנות עם ברגי קונפירמט. בדוק ריבועיות שוב.',
    },
    parts: ['P02'],
    icon: '🔨',
  });

  steps.push({
    stepNumber: n++,
    title: { en: 'Install Back Panel', he: 'התקנת לוח גב' },
    description: {
      en: 'Place the back panel into the rabbet and nail/screw around the perimeter every 150mm. The back panel squares the entire carcass.',
      he: 'הנח את לוח הגב בשפה וחבר עם מסמרים/ברגים כל 150 מ"מ לאורך ההיקף. לוח הגב מיישר את כל השלד.',
    },
    parts: [hasFixedShelf ? 'P07' : 'P06'],
    icon: '📐',
    tip: {
      en: 'Start from one corner and work around to keep the carcass square.',
      he: 'התחל מפינה אחת והמשך מסביב כדי לשמור על ריבועיות השלד.',
    },
  });

  if (hasDoors) {
    const isGlass = cfg.doorStyle === 'glass';
    steps.push({
      stepNumber: n++,
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
    });

    steps.push({
      stepNumber: n++,
      title: { en: 'Install Handles', he: 'התקנת ידיות' },
      description: {
        en: 'Mark handle positions on doors (typically 100mm from top/bottom edge). Drill and mount handles.',
        he: 'סמן מיקומי ידיות על הדלתות (בדרך כלל 100 מ"מ מהקצה העליון/תחתון). קדח והתקן ידיות.',
      },
      parts: [],
      icon: '🔧',
    });
  }

  if (isWardrobe) {
    steps.push({
      stepNumber: n++,
      title: { en: 'Install Hanging Rail', he: 'התקנת מוט תלייה' },
      description: {
        en: 'Mount the hanging rail brackets on each side panel at the desired height (typically 1600-1700mm from the bottom). Insert the rail and secure with screws.',
        he: 'הרכב את תושבות מוט התלייה על כל דפנה בגובה הרצוי (בדרך כלל 1600-1700 מ"מ מהתחתית). הכנס את המוט וחזק בברגים.',
      },
      parts: [],
      icon: '👔',
    });
  }

  steps.push({
    stepNumber: n++,
    title: { en: 'Insert Shelf Pins & Shelves', he: 'הכנסת פיני מדפים ומדפים' },
    description: {
      en: `Insert 4 shelf pins per shelf at desired heights. Place the ${cfg.shelfCount} adjustable shelves on the pins.`,
      he: `הכנס 4 פיני מדף לכל מדף בגובה הרצוי. הנח את ${cfg.shelfCount} המדפים המתכווננים על הפינים.`,
    },
    parts: [hasFixedShelf ? 'P05' : 'P04'],
    icon: '📚',
  });

  if (cfg.edgeBanding !== 'none') {
    steps.push({
      stepNumber: n++,
      title: { en: 'Apply Edge Banding', he: 'הדבקת פסי קצה' },
      description: {
        en: 'Iron on edge banding tape to all visible edges. Trim excess with a trimmer or utility knife. Sand edges smooth.',
        he: 'הדבק פסי קצה בגיהוץ על כל הקצוות הנראים. חתוך עודפים עם קצצן או סכין. השחזה חלקה.',
      },
      parts: [],
      icon: '🪵',
      tip: {
        en: 'Apply banding before assembly for best results on shelf front edges.',
        he: 'הדבק פסי קצה לפני ההרכבה לתוצאות טובות על קצוות קדמיים של מדפים.',
      },
    });
  }

  steps.push({
    stepNumber: n++,
    title: { en: 'Wall Mounting (optional)', he: 'תלייה על הקיר (אופציונלי)' },
    description: {
      en: 'Attach L-brackets to the back of the cabinet. Mark wall positions, drill, insert wall plugs, and secure with screws. Use a level to ensure the cabinet is plumb.',
      he: 'חבר זוויות L לגב הארון. סמן מיקומים על הקיר, קדח, הכנס דיבלים וחבר עם ברגים. השתמש בפלס לוודא שהארון מאוזן.',
    },
    parts: [],
    icon: '🏗️',
  });

  return steps;
}
