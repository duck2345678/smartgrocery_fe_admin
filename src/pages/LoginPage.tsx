import axios from 'axios';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const unauthorized = Boolean((location.state as { unauthorized?: boolean } | null)?.unauthorized);

  const loginMutation = useMutation({
    mutationFn: async () => adminApi.auth.login(email.trim(), password),
    onSuccess: (res) => {
      const role = res.user?.roleName ? String(res.user.roleName).toUpperCase() : '';
      const normalizedRole = role.startsWith('ROLE_') ? role.slice(5) : role;
      if (normalizedRole !== 'ADMIN' && normalizedRole !== 'STAFF') {
        logout();
        throw new Error('Bạn không có quyền truy cập admin');
      }
      setTokens(res.token, res.refreshToken);
      setUser({ ...res.user, roleName: normalizedRole });
      if (normalizedRole === 'STAFF') {
        navigate('/staff', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    },
    onError: (error) => {
      setTokens(null, null);
      setUser(null);
      const axiosError = axios.isAxiosError(error) ? error : undefined;
      const debugPayload = {
        message: error instanceof Error ? error.message : String(error),
        status: axiosError?.response?.status,
        responseData: axiosError?.response?.data,
      };
      setDebugInfo(JSON.stringify(debugPayload, null, 2));
      console.error('Login error:', debugPayload);
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
            {loginMutation.error instanceof Error 
              ? loginMutation.error.message 
              : 'Đã có lỗi xảy ra. Vui lòng thử lại.'}
          </div>
        )}

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            console.debug('Login submit', { email, password });
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

        <div className="login-footnote" style={{ textAlign: 'center', marginTop: '1rem' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: 'var(--color-primary, #16a34a)' }}>
            Đăng ký
          </Link>
        </div>

        <div className="login-footnote">
          {t('login.backend')}: {import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', opacity: 0.7, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
          <div style={{ marginBottom: '4px' }}>🔐 <strong>Tài khoản test:</strong></div>
          <div>Email: admin.p0@smartgrocery.com</div>
          <div>Mật khẩu: password123</div>
        </div>

        {debugInfo && (
          <pre style={{ marginTop: '16px', padding: '12px', background: '#111', color: '#fff', borderRadius: '8px', fontSize: '12px', overflowX: 'auto' }}>
            {debugInfo}
          </pre>
        )}
      </div>
    </div>
  );
}
