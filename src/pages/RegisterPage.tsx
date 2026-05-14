import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';
import { useAuthStore } from '../store/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const registerMutation = useMutation({
    mutationFn: () =>
      adminApi.auth.register({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), password }),
    onSuccess: (res) => {
      setTokens(res.token, res.refreshToken);
      setUser(res.user);
      navigate('/login', { replace: true, state: { registered: true } });
    },
  });

  const canSubmit = useMemo(() => {
    if (!fullName.trim()) return false;
    if (!email.trim()) return false;
    if (!phone.trim()) return false;
    if (password.length < 6) return false;
    if (password !== confirmPassword) return false;
    return !registerMutation.isPending;
  }, [fullName, email, phone, password, confirmPassword, registerMutation.isPending]);

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-logo-wrap">
          <img src="/smartgrocery-logo.png" alt="SmartGrocery" className="login-logo" />
        </div>
        <div className="login-title">Tạo tài khoản</div>
        <div className="login-subtitle">Đăng ký để sử dụng hệ thống SmartGrocery</div>

        {registerMutation.isError && (
          <div className="login-alert login-alert--danger">
            {registerMutation.error instanceof Error ? registerMutation.error.message : 'Đăng ký thất bại'}
          </div>
        )}

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            registerMutation.mutate();
          }}
        >
          <label className="adm-field">
            <div className="adm-field__label">Họ và tên</div>
            <input
              className="adm-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
            />
          </label>

          <label className="adm-field">
            <div className="adm-field__label">Email</div>
            <input
              className="adm-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@smartgrocery.vn"
              autoComplete="email"
            />
          </label>

          <label className="adm-field">
            <div className="adm-field__label">Số điện thoại</div>
            <input
              className="adm-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              autoComplete="tel"
            />
          </label>

          <label className="adm-field">
            <div className="adm-field__label">Mật khẩu</div>
            <input
              className="adm-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              autoComplete="new-password"
            />
          </label>

          <label className="adm-field">
            <div className="adm-field__label">Xác nhận mật khẩu</div>
            <input
              className={`adm-input ${passwordMismatch ? 'adm-input--error' : ''}`}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
            />
            {passwordMismatch && (
              <div style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Mật khẩu không khớp
              </div>
            )}
          </label>

          <button className="adm-button adm-button--primary" disabled={!canSubmit} type="submit">
            {registerMutation.isPending ? 'Đang đăng ký…' : 'Đăng ký'}
          </button>
        </form>

        <div className="login-footnote" style={{ textAlign: 'center', marginTop: '1rem' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary, #16a34a)' }}>
            Đăng nhập
          </Link>
        </div>

        <div className="login-footnote" style={{ marginTop: '0.5rem' }}>
          Tài khoản sau khi đăng ký cần Admin cấp quyền Staff để truy cập hệ thống.
        </div>
      </div>
    </div>
  );
}
