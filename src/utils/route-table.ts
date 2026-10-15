export const APP_ROUTES = [
  { id: 'workspace', labelKey: 'tabs.workspace', altKey: null },
  { id: 'configurator', labelKey: 'tabs.configurator', altKey: '1' },
  { id: 'preview', labelKey: 'tabs.preview', altKey: '2' },
  { id: 'optimizer', labelKey: 'tabs.optimizer', altKey: '3' },
  { id: 'assembly', labelKey: 'tabs.assembly', altKey: '4' },
  { id: 'pdf', labelKey: 'tabs.pdf', altKey: '5' },
  { id: 'calculators', labelKey: 'tabs.calculators', altKey: '6' },
] as const;

export type AppRouteId = (typeof APP_ROUTES)[number]['id'];

export const APP_TABS: readonly AppRouteId[] = APP_ROUTES.map((route) => route.id);

export const APP_TAB_COMMANDS = APP_ROUTES.map((route) => ({
  id: route.id,
  labelKey: route.labelKey,
  shortcut: route.altKey === null ? null : `Alt+${route.altKey}`,
  shortcutKey: route.altKey,
}));

export function isAppRouteId(value: string): value is AppRouteId {
  return APP_ROUTES.some((route) => route.id === value);
}
