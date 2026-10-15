import { SUPPORTED_LANGUAGES, type SupportedLang } from '../i18n/index';
import { IconMoon, IconRedo, IconSearch, IconSun, IconUndo } from '../ui/Icons';
import { TOOLBAR_ICON_BUTTON_COMPACT } from '../ui/control-classes';

const MOBILE_ICON_BUTTON = TOOLBAR_ICON_BUTTON_COMPACT;

interface HeaderMobileControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  darkMode: boolean;
  lang: string;
  commandLabel: (id: 'palette.open' | 'history.undo' | 'history.redo') => string;
  commandTitle: (id: 'palette.open' | 'history.undo' | 'history.redo') => string;
  runCommand: (id: 'palette.open' | 'history.undo' | 'history.redo' | 'theme.toggle') => void;
  changeLang: (next: SupportedLang) => void;
  languageLabel: string;
}

export function HeaderMobileControls({
  canUndo,
  canRedo,
  darkMode,
  lang,
  commandLabel,
  commandTitle,
  runCommand,
  changeLang,
  languageLabel,
}: Readonly<HeaderMobileControlsProps>) {
  return (
    <div className="-me-2 flex items-center sm:hidden">
      <button
        onClick={() => runCommand('palette.open')}
        className={MOBILE_ICON_BUTTON}
        aria-label={commandLabel('palette.open')}
        title={commandTitle('palette.open')}
      >
        <IconSearch size={18} />
      </button>
      <button
        onClick={() => runCommand('history.undo')}
        disabled={!canUndo}
        className={MOBILE_ICON_BUTTON}
        aria-label={commandLabel('history.undo')}
        title={commandTitle('history.undo')}
      >
        <IconUndo size={18} />
      </button>
      <button
        onClick={() => runCommand('history.redo')}
        disabled={!canRedo}
        className={MOBILE_ICON_BUTTON}
        aria-label={commandLabel('history.redo')}
        title={commandTitle('history.redo')}
      >
        <IconRedo size={18} />
      </button>
      <button
        onClick={() => runCommand('theme.toggle')}
        className={MOBILE_ICON_BUTTON}
        aria-label={darkMode ? 'Light mode' : 'Dark mode'}
      >
        {darkMode ? <IconSun size={18} /> : <IconMoon size={18} />}
      </button>
      <select
        value={lang}
        onChange={(e) => changeLang(e.target.value as SupportedLang)}
        className="text-wood-200 h-11 w-32 min-w-0 cursor-pointer rounded-full border-0 bg-transparent px-2 text-xs font-medium outline-none hover:text-white"
        aria-label={languageLabel}
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-wood-800 text-white">
            {l.nativeLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
