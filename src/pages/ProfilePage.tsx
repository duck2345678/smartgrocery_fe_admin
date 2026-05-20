import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';
import { useAuthStore } from '../store/authStore';

const roleStyle = (role: string | null): string => {
  switch ((role ?? '').toUpperCase()) {
    case 'ADMIN':   return 'adm-badge--pending';
    case 'MANAGER': return 'adm-badge--purple';
    case 'STAFF':   return 'adm-badge--cyan';
    default:        return 'adm-badge--muted';
  }
};

export function ProfilePage() {
  const queryClient = useQueryClient();
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const userId  = Number(user?.id);

  const profileQuery = useQuery({
    queryKey: ['my-profile', userId],
    queryFn:  () => adminApi.users.list({ search: user?.email ?? '', page: 0, size: 10 }),
    enabled:  !!userId && !!user?.email,
    staleTime: 60000,
  });
  const myProfile = useMemo(
    () => profileQuery.data?.content?.find((u) => u.id === userId),
    [profileQuery.data, userId]
  );

  // ── Form state ──
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email,    setEmail]    = useState(user?.email ?? '');
  const [phone,    setPhone]    = useState('');
  const [phoneInit, setPhoneInit] = useState(false);

  useEffect(() => {
    if (myProfile?.phone && !phoneInit) {
      setPhone(myProfile.phone);
      setPhoneInit(true);
    }
  }, [myProfile?.phone, phoneInit]);

  const [currentPassword,  setCurrentPassword]  = useState('');
  const [newPassword,      setNewPassword]      = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [pwSuccess,        setPwSuccess]        = useState(false);
  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  // ── Avatar upload state ──
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);

  // Revoke blob URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ── Mutations ──
  const profileMutation = useMutation({
    mutationFn: () =>
      adminApi.users.update(userId, {
        fullName: fullName.trim() || undefined,
        email:    email.trim()    || undefined,
        phone:    phone.trim()    || undefined,
      }),
    onSuccess: (updated) => {
      setUser({
        id:        updated.id,
        email:     updated.email,
        fullName:  updated.fullName,
        roleName:  updated.roleName,
        avatarUrl: updated.avatarUrl ?? undefined,
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => adminApi.users.update(userId, { password: newPassword }),
    onSuccess: () => {
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => adminApi.users.uploadAvatar(userId, file),
    onSuccess: (updated) => {
      setUser({
        id:        updated.id,
        email:     updated.email,
        fullName:  updated.fullName,
        roleName:  updated.roleName,
        avatarUrl: updated.avatarUrl ?? undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['my-profile', userId] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    avatarMutation.mutate(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const canSaveProfile = useMemo(
    () => !!(fullName.trim() || email.trim()) && !profileMutation.isPending,
    [fullName, email, profileMutation.isPending]
  );
  const canChangePassword = useMemo(
    () => newPassword.length >= 6 && newPassword === confirmPassword && !passwordMutation.isPending,
    [newPassword, confirmPassword, passwordMutation.isPending]
  );

  const avatarSrc = previewUrl ?? myProfile?.avatarUrl ?? user?.avatarUrl ?? null;
  const initial   = (user?.fullName ?? user?.email ?? 'A')
    .trim().split(' ').at(-1)?.slice(0, 1).toUpperCase() ?? 'A';
  const isUploading = avatarMutation.isPending;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="page__title">Hồ sơ</div>
          <div className="page__subtitle">Thông tin tài khoản đang đăng nhập</div>
        </div>
      </div>

      {/* ── Profile header ── */}
      <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Ambient decorations */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: '40%',
          width: 180, height: 180, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', gap: 22, alignItems: 'center', position: 'relative' }}>

          {/* ── Clickable avatar ── */}
          <div
            role="button"
            aria-label="Thay đổi ảnh đại diện"
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            style={{
              width: 80, height: 80,
              borderRadius: 24,
              position: 'relative',
              overflow: 'hidden',
              cursor: isUploading ? 'wait' : 'pointer',
              flexShrink: 0,
              boxShadow: avatarHover
                ? '0 8px 32px rgba(249,115,22,0.45)'
                : '0 8px 32px rgba(249,115,22,0.32)',
              transition: 'box-shadow 200ms ease',
            }}
          >
            {/* Image or gradient initial */}
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'var(--grad-primary)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--display)',
                fontWeight: 900, fontSize: 30, color: '#fff',
              }}>
                {initial}
              </div>
            )}

            {/* Hover / loading overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.52)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              opacity: (avatarHover || isUploading) ? 1 : 0,
              transition: 'opacity 180ms ease',
            }}>
              {isUploading ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.3px' }}>
                  Đang tải…
                </span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.4px' }}>
                    Thay ảnh
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Identity */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.4px' }}>
                {user?.fullName ?? user?.email ?? 'Admin'}
              </span>
              <span className={`adm-badge ${roleStyle(user?.roleName)}`}>
                {user?.roleName ?? 'ADMIN'}
              </span>
              {myProfile?.status && (
                <span className={`adm-badge ${myProfile.status === 'ACTIVE' ? 'adm-badge--success' : 'adm-badge--muted'}`}>
                  {myProfile.status}
                </span>
              )}
            </div>

            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{user?.email}</div>

            <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
              {(
                [
                  { label: 'ID',       value: String(user?.id ?? '—') },
                  myProfile?.phone    ? { label: 'SĐT',      value: myProfile.phone } : null,
                  myProfile?.createdAt ? { label: 'Tham gia', value: myProfile.createdAt.slice(0, 10) } : null,
                ] as ({ label: string; value: string } | null)[]
              ).filter(Boolean).map((item) => (
                <div key={item!.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)' }}>
                    {item!.label}
                  </span>
                  <span className="mono" style={{ fontSize: 12 }}>{item!.value}</span>
                </div>
              ))}
            </div>

            {/* Avatar feedback */}
            {avatarMutation.isError && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>
                {avatarMutation.error instanceof Error
                  ? avatarMutation.error.message
                  : 'Không thể tải ảnh lên'}
              </div>
            )}
            {avatarMutation.isSuccess && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--emerald)', fontWeight: 600 }}>
                Cập nhật ảnh đại diện thành công
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Forms ── */}
      <div className="grid grid--2">
        {/* Cập nhật thông tin */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Cập nhật thông tin</div>

          <form
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            onSubmit={(e) => { e.preventDefault(); if (canSaveProfile) profileMutation.mutate(); }}
          >
            <label className="adm-field">
              <div className="adm-field__label">Họ và tên</div>
              <input
                className="adm-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </label>

            <label className="adm-field">
              <div className="adm-field__label">Email</div>
              <input
                className="adm-input"
                type="email"
                value={email}
                disabled={true}
                style={{ cursor: 'not-allowed', opacity: 0.6 }}
                placeholder="admin@smartgrocery.vn"
              />
            </label>

            <label className="adm-field">
              <div className="adm-field__label">Số điện thoại</div>
              <input
                className="adm-input"
                type="tel"
                value={phone}
                disabled={true}
                style={{ cursor: 'not-allowed', opacity: 0.6 }}
                placeholder="0901 234 567"
              />
            </label>

            {profileMutation.isError && (
              <div className="inline-alert">
                {profileMutation.error instanceof Error ? profileMutation.error.message : 'Không thể lưu'}
              </div>
            )}
            {profileMutation.isSuccess && (
              <div className="inline-alert inline-alert--ok">Đã lưu thông tin</div>
            )}

            <button className="adm-button adm-button--primary" type="submit" disabled={!canSaveProfile}>
              {profileMutation.isPending ? 'Đang lưu…' : 'Lưu thông tin'}
            </button>
          </form>
        </div>

        {/* Đổi mật khẩu */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Đổi mật khẩu</div>

          <form
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            onSubmit={(e) => { e.preventDefault(); if (canChangePassword) { setPwSuccess(false); passwordMutation.mutate(); } }}
          >
            <label className="adm-field">
              <div className="adm-field__label">Mật khẩu hiện tại</div>
              <input
                className="adm-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            <label className="adm-field">
              <div className="adm-field__label">Mật khẩu mới (tối thiểu 6 ký tự)</div>
              <input
                className="adm-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>

            <label className="adm-field">
              <div className="adm-field__label">Xác nhận mật khẩu mới</div>
              <input
                className="adm-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                style={passwordMismatch
                  ? { borderColor: 'rgba(var(--danger-rgb),0.5)', boxShadow: '0 0 0 3px rgba(var(--danger-rgb),0.1)' }
                  : {}}
              />
              {passwordMismatch && (
                <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Mật khẩu không khớp
                </div>
              )}
            </label>

            {passwordMutation.isError && (
              <div className="inline-alert">
                {passwordMutation.error instanceof Error ? passwordMutation.error.message : 'Không thể đổi mật khẩu'}
              </div>
            )}
            {pwSuccess && (
              <div className="inline-alert inline-alert--ok">Đổi mật khẩu thành công</div>
            )}

            <button className="adm-button adm-button--primary" type="submit" disabled={!canChangePassword}>
              {passwordMutation.isPending ? 'Đang lưu…' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
