import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';

export function WorkspaceHome() {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t('tabs.workspace')}
      className="mx-auto flex w-full max-w-6xl min-w-0 flex-col items-center gap-6 text-center"
    >
      <img
        src={`${import.meta.env.BASE_URL}workspace-banner.webp`}
        srcSet={`${import.meta.env.BASE_URL}workspace-banner-480.webp 480w, ${import.meta.env.BASE_URL}workspace-banner-800.webp 800w, ${import.meta.env.BASE_URL}workspace-banner.webp 1200w`}
        sizes="(min-width: 1456px) 1152px, (min-width: 1024px) calc(100vw - 304px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 24px)"
        alt={t('tabs.workspace')}
        className="w-full rounded-3xl shadow-[0_20px_60px_rgb(0_0_0/0.12)]"
        width={1200}
        height={260}
        loading="eager"
        fetchPriority="high"
      />
      <div className="w-full min-w-0 space-y-3">
        <h2 className="text-wood-900 dark:text-wood-50 text-4xl font-semibold tracking-tight wrap-break-word sm:text-5xl">
          {t('app.title')}
        </h2>
        <p className="text-wood-600 dark:text-wood-300 mx-auto max-w-xl text-lg wrap-break-word">{t('app.subtitle')}</p>
      </div>
      <button
        onClick={() => useCabinetStore.getState().setActiveTab('configurator')}
        className="bg-accent rounded-full px-6 py-2.5 text-base font-medium text-white hover:brightness-110"
      >
        {t('tabs.configurator')}
      </button>
    </section>
  );
}
