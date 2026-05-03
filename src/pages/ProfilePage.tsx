import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';

export function ProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">{t('pages.profileTitle')}</div>
          <div className="page__subtitle">{t('pages.profileSubtitle')}</div>
        </div>
      </div>

      <div className="card">
        <div className="list">
          <div className="list__row">
            <span>{t('fields.name')}</span>
            <span className="mono">{user?.fullName ?? '-'}</span>
          </div>
          <div className="list__row">
            <span>{t('fields.email')}</span>
            <span className="mono">{user?.email ?? '-'}</span>
          </div>
          <div className="list__row">
            <span>{t('fields.status')}</span>
            <span className="mono">{user?.roleName ?? 'ADMIN'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
