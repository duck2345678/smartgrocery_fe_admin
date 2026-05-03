import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/adminApi';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const unauthorized = Boolean((location.state as { unauthorized?: boolean } | null)?.unauthorized);

  const loginMutation = useMutation({
    mutationFn: async () => adminApi.auth.login(email.trim(), password),
    onSuccess: (res) => {
      const role = res.user?.roleName ? String(res.user.roleName).toUpperCase() : '';
      if (role !== 'ADMIN') {
        logout();
        throw new Error(t('login.noAdminRole'));
      }
      setTokens(res.token, res.refreshToken);
      setUser(res.user);
      navigate('/', { replace: true });
    },
    onError: () => {
      setTokens(null, null);
      setUser(null);
    },
  });

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!password) return false;
    return !loginMutation.isPending;
  }, [email, loginMutation.isPending, password]);

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-logo-wrap">
          <img src="/smartgrocery-logo.png" alt="SmartGrocery" className="login-logo" />
        </div>
        <div className="login-title">{t('login.title')}</div>
        <div className="login-subtitle">{t('login.subtitle')}</div>

        {unauthorized && (
          <div className="login-alert">{t('login.unauthorized')}</div>
        )}

        {loginMutation.isError && (
          <div className="login-alert login-alert--danger">
            {loginMutation.error instanceof Error ? loginMutation.error.message : t('login.failed')}
          </div>
        )}

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            loginMutation.mutate();
          }}
        >
          <label className="adm-field">
            <div className="adm-field__label">{t('login.email')}</div>
            <input
              className="adm-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.placeholderEmail')}
            />
          </label>

          <label className="adm-field">
            <div className="adm-field__label">{t('login.password')}</div>
            <input
              className="adm-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.placeholderPassword')}
              type="password"
            />
          </label>

          <button className="adm-button adm-button--primary" disabled={!canSubmit} type="submit">
            {loginMutation.isPending ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <div className="login-footnote">
          {t('login.backend')}: {import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}
        </div>
      </div>
    </div>
  );
}
