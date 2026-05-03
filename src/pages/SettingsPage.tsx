import { useTranslation } from 'react-i18next';

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.settingsTitle')}</div>
          <div className="page__subtitle">{t('pages.settingsSubtitle')}</div>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="card">
          <div className="card__label">{t('common.theme')}</div>
          <div className="card__hint">{t('common.themeDark')} / {t('common.themeLight')}</div>
        </div>
        <div className="card">
          <div className="card__label">{t('common.language')}</div>
          <div className="card__hint">VI / EN</div>
        </div>
      </div>
    </div>
  );
}
