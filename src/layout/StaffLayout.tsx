import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Moon, Sun, Users, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const THEME_KEY = 'SG_ADMIN_THEME';
type Theme = 'dark' | 'light';

const navItems = [
  { to: '/staff', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/staff/customers', label: 'Khách hàng', icon: <Users size={18} />, end: false },
  { to: '/staff/profile', label: 'Hồ sơ', icon: <User size={18} />, end: false },
];

export function StaffLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [theme, setTheme] = React.useState<Theme>(() => {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' ? 'light' : 'dark';
  });

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true, state: { fromLogout: true, refreshToken } });
  };

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <div className="adm-brand__logo">
            <img src="/smartgrocery-logo.png" alt="SmartGrocery" className="adm-brand__logo-img" />
          </div>
          <div className="adm-brand__text">
            <div className="adm-brand__title">SmartGrocery</div>
            <div className="adm-brand__subtitle">Staff Portal</div>
          </div>
        </div>

        <nav className="adm-nav">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) => `adm-nav__item ${isActive ? 'is-active' : ''}`}
            >
              <span className="adm-nav__icon">{it.icon}</span>
              <span className="adm-nav__label">{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar__footer">
          <div className="adm-user">
            <div className="adm-user__avatar">{(user?.fullName ?? user?.email ?? 'S').slice(0, 1).toUpperCase()}</div>
            <div className="adm-user__meta">
              <div className="adm-user__name">{user?.fullName ?? user?.email ?? 'Staff'}</div>
              <div className="adm-user__role">{user?.roleName ?? 'STAFF'}</div>
            </div>
          </div>
          <button className="adm-button adm-button--ghost" onClick={onLogout} type="button">
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-header">
          <div className="adm-header__title">Staff Portal</div>
          <div className="adm-header__right">
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => setTheme((v) => (v === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === 'dark' ? 'Tối' : 'Sáng'}</span>
            </button>
            <div className="adm-chip">{user?.email ?? ''}</div>
          </div>
        </header>
        <div className="adm-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
