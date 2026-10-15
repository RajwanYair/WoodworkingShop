import { useTranslation } from 'react-i18next';
import { Dialog } from '../../ui/Dialog';
import { EmptyState } from '../../ui/EmptyState';
import { UNRELEASED_CHANGELOG } from 'virtual:unreleased-changelog';

interface WhatsNewPanelProps {
  onClose: () => void;
}

export function WhatsNewPanel({ onClose }: Readonly<WhatsNewPanelProps>) {
  const { t } = useTranslation();

  return (
    <Dialog
      title={t('whatsNew.title')}
      closeLabel={t('whatsNew.close')}
      onClose={onClose}
      className="dark:bg-wood-900 border-wood-200 dark:border-wood-700 max-h-[85vh] w-full max-w-2xl rounded-xl border bg-white p-0 text-start shadow-2xl"
    >
      {UNRELEASED_CHANGELOG.length === 0 ? (
        <EmptyState title={t('whatsNew.emptyTitle')} description={t('whatsNew.emptyDescription')} />
      ) : (
        <div className="max-h-[70vh] space-y-5 overflow-y-auto">
          <ul className="space-y-4">
            {UNRELEASED_CHANGELOG.map((summary) => (
              <li key={summary} className="text-wood-700 dark:text-wood-200 text-sm leading-relaxed">
                {summary}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
