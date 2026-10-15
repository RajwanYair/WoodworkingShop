/**
 * Inline SVG icon components — consistent 24×24 viewBox, currentColor stroke/fill.
 * Pass className and size props to customise. All icons are aria-hidden by default.
 */
import { Icon, type IconProps } from './icon-base';

export {
  IconBathroom,
  IconBedside,
  IconBookshelf,
  IconCabinet,
  IconCalculator,
  IconChevronDown,
  IconChevronRight,
  IconContrast,
  IconDiff,
  IconDocument,
  IconEdgeBand,
  IconFolder,
  IconGrainHorizontal,
  IconGrainVertical,
  IconHammer,
  IconHelp,
  IconInfo,
  IconKeyboard,
  IconKitchen,
  IconLayers,
  IconRefresh,
  IconSawKerf,
  IconScissors,
  IconSettings,
  IconSwap,
  IconTV,
  IconWallUnit,
  IconWardrobe,
} from './icons-extended';

export function IconSun(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Icon>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  );
}

export function IconUndo(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
    </Icon>
  );
}

export function IconRedo(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-.49-3.51" />
    </Icon>
  );
}

export function IconLink(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Icon>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16" y1="16" x2="21" y2="21" />
    </Icon>
  );
}

export function IconPrint(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </Icon>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Icon>
  );
}

export function IconRuler(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3 21l18-18" strokeWidth={1.8} />
      <path d="M9 3L3 9" />
      <rect x="2" y="2" width="6" height="20" rx="1" transform="rotate(-45 12 12)" strokeWidth={1.5} fill="none" />
      <line x1="6.5" y1="17.5" x2="8.5" y2="15.5" />
      <line x1="9.5" y1="14.5" x2="11.5" y2="12.5" />
      <line x1="12.5" y1="11.5" x2="14.5" y2="9.5" />
      <line x1="15.5" y1="8.5" x2="17.5" y2="6.5" />
    </Icon>
  );
}

export function IconDxf(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" strokeDasharray="2 2" strokeWidth={1} />
      <line x1="3" y1="15" x2="21" y2="15" strokeDasharray="2 2" strokeWidth={1} />
      <line x1="9" y1="3" x2="9" y2="21" strokeDasharray="2 2" strokeWidth={1} />
      <line x1="15" y1="3" x2="15" y2="21" strokeDasharray="2 2" strokeWidth={1} />
      <path d="M6 6l3 3-3 3" strokeWidth={1.5} />
    </Icon>
  );
}

export function IconGcode(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="5 7 3 9 5 11" />
      <polyline points="19 7 21 9 19 11" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="12" y1="9" x2="12" y2="21" />
      <path d="M8 13l4 4 4-4" />
    </Icon>
  );
}

export function IconList(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth={2.5} />
      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth={2.5} />
      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth={2.5} />
    </Icon>
  );
}

export function IconWrench(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Icon>
  );
}

export function IconEye(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function IconEyeOff(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </Icon>
  );
}

export function IconTag(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth={2.5} />
    </Icon>
  );
}

export function IconBarChart(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </Icon>
  );
}

export function IconLightbulb(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </Icon>
  );
}

export function IconWarning(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2.5} />
    </Icon>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}

export function IconX(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  );
}
