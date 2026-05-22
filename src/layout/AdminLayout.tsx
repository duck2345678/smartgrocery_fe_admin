import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Boxes, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, LogOut, Moon, Package, Sun, User, Users, Contact, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { getAdminLanguage, setAdminLanguage } from '../i18n';

const THEME_KEY = 'SG_ADMIN_THEME';
type AdminTheme = 'dark' | 'light';

const navItems: Array<{ to: string; labelKey: string; icon: React.ReactNode }> = [
  { to: '/', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/catalog/categories', labelKey: 'nav.categories', icon: <Boxes size={18} /> },
  { to: '/products', labelKey: 'nav.products', icon: <Package size={18} /> },
  { to: '/supply/purchase-orders', labelKey: 'nav.purchaseOrders', icon: <ClipboardList size={18} /> },
  { to: '/promotions', labelKey: 'nav.promotions', icon: <Ticket size={18} /> },
  { to: '/customers', labelKey: 'nav.customers', icon: <Users size={18} /> },
  { to: '/staff-list', labelKey: 'nav.staff', icon: <Contact size={18} /> },
  { to: '/profile', labelKey: 'nav.profile', icon: <User size={18} /> },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [theme, setTheme] = React.useState<AdminTheme>(() => {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' ? 'light' : 'dark';
  });

  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    return localStorage.getItem('SG_SIDEBAR_COLLAPSED') === 'true';
  });

  React.useEffect(() => {
    localStorage.setItem('SG_SIDEBAR_COLLAPSED', String(collapsed));
  }, [collapsed]);

  const [lang, setLang] = React.useState<'vi' | 'en'>(() => getAdminLanguage());

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true, state: { fromLogout: true, refreshToken } });
  };

  return (
    <div className={`adm-shell ${collapsed ? 'adm-shell--collapsed' : ''}`}>
      <aside className={`adm-sidebar ${collapsed ? 'adm-sidebar--collapsed' : ''}`}>
        <div className="adm-brand">
          <div className="adm-brand__logo">
            <img src="/smartgrocery-logo.png" alt="SmartGrocery" className="adm-brand__logo-img" />
          </div>
          <div className="adm-brand__text">
            <div className="adm-brand__title">{t('common.appName')}</div>
            <div className="adm-brand__subtitle">{t('common.adminConsole')}</div>
          </div>
        </div>

        <button
          className="adm-sidebar__toggle"
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Thu gọn</span></>}
        </button>

        <nav className="adm-nav">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              title={collapsed ? t(it.labelKey) : undefined}
              className={({ isActive }) => `adm-nav__item ${isActive ? 'is-active' : ''}`}
            >
              <span className="adm-nav__icon">{it.icon}</span>
              <span className="adm-nav__label">{t(it.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar__footer">
          <div className="adm-user">
            <div className="adm-user__avatar" style={user?.avatarUrl ? { padding: 0, overflow: 'hidden' } : {}}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : (user?.fullName ?? user?.email ?? 'A').slice(0, 1).toUpperCase()
              }
            </div>
            <div className="adm-user__meta">
              <div className="adm-user__name">{user?.fullName ?? user?.email ?? 'Admin'}</div>
              <div className="adm-user__role">{user?.roleName ?? 'ADMIN'}</div>
            </div>
          </div>
          <button className="adm-button adm-button--ghost" onClick={onLogout} type="button">
            <LogOut size={16} />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-header">
          <div className="adm-header__title"></div>
          <div className="adm-header__right">
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => setTheme((v) => (v === 'dark' ? 'light' : 'dark'))}
              title={t('common.theme')}
            >
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={async () => {
                const next = lang === 'vi' ? 'en' : 'vi';
                setLang(next);
                await setAdminLanguage(next);
              }}
              title={t('common.language')}
            >
              <span className="mono">{lang.toUpperCase()}</span>
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
