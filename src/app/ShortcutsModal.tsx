import { useTranslation } from 'react-i18next';
import { Dialog } from '../ui/Dialog';
import { Table } from '../ui/Table';
import { COMMANDS, formatShortcut } from './command-registry';

interface ShortcutsModalProps {
  onClose: () => void;
}

export function ShortcutsModal({ onClose }: Readonly<ShortcutsModalProps>) {
  const { t } = useTranslation();
  const shortcuts = COMMANDS.flatMap((command) => {
    const bindings = 'shortcuts' in command ? (command.shortcuts ?? []) : [];
    return bindings.map((binding) => ({
      key: formatShortcut(binding).replaceAll('+', ' + '),
      label: t(command.labelKey),
      id: command.id,
    }));
  });
  shortcuts.push({ id: 'dialog.close', key: 'Escape', label: t('commandPalette.closeShortcuts') });

  return (
    <Dialog
      title={t('commandPalette.shortcutsTitle')}
      closeLabel={t('commandPalette.closeShortcuts')}
      onClose={onClose}
    >
      <Table
        caption={t('commandPalette.shortcutsTitle')}
        headers={['Shortcut', 'Command']}
        rows={shortcuts.map((shortcut) => [
          <kbd
            key={shortcut.key}
            className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-200 rounded px-1.5 py-0.5 font-mono text-xs"
          >
            {shortcut.key}
          </kbd>,
          shortcut.label,
        ])}
      />
    </Dialog>
  );
}
