import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="page">
      <div className="card">
        <div className="page__title">{t('notFound.title')}</div>
        <div className="page__subtitle">{t('notFound.subtitle')}</div>
        <div className="row-actions">
          <Link className="adm-button adm-button--primary" to="/">
            {t('notFound.backToDashboard')}
          </Link>
        </div>
      </div>
    </div>
  );
}
