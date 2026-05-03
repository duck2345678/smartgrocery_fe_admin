import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookText, Boxes, ClipboardList, LayoutDashboard, LogOut, Moon, Package, Percent, Settings, Store, Sun, Truck, User, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { getAdminLanguage, setAdminLanguage } from '../i18n';

const THEME_KEY = 'SG_ADMIN_THEME';
type AdminTheme = 'dark' | 'light';

const navItems: Array<{ to: string; labelKey: string; icon: React.ReactNode }> = [
  { to: '/', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/audit-logs', labelKey: 'nav.auditLogs', icon: <BookText size={18} /> },
  { to: '/catalog/categories', labelKey: 'nav.categories', icon: <Boxes size={18} /> },
  { to: '/catalog/products', labelKey: 'nav.products', icon: <Package size={18} /> },
  { to: '/supply/inventory', labelKey: 'nav.inventory', icon: <Store size={18} /> },
  { to: '/supply/warehouses', labelKey: 'nav.warehouses', icon: <Truck size={18} /> },
  { to: '/supply/suppliers', labelKey: 'nav.suppliers', icon: <Truck size={18} /> },
  { to: '/supply/purchase-orders', labelKey: 'nav.purchaseOrders', icon: <ClipboardList size={18} /> },
  { to: '/supply/promotions', labelKey: 'nav.promotions', icon: <Percent size={18} /> },
  { to: '/users', labelKey: 'nav.users', icon: <Users size={18} /> },
  { to: '/ops', labelKey: 'nav.ops', icon: <ClipboardList size={18} /> },
  { to: '/issues', labelKey: 'nav.issues', icon: <BookText size={18} /> },
  { to: '/profile', labelKey: 'nav.profile', icon: <User size={18} /> },
  { to: '/settings', labelKey: 'nav.settings', icon: <Settings size={18} /> },
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
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <div className="adm-brand__logo">
            <img src="/smartgrocery-logo.png" alt="SmartGrocery" className="adm-brand__logo-img" />
          </div>
          <div className="adm-brand__text">
            <div className="adm-brand__title">{t('common.appName')}</div>
            <div className="adm-brand__subtitle">{t('common.adminConsole')}</div>
          </div>
        </div>

        <nav className="adm-nav">
          {navItems.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => `adm-nav__item ${isActive ? 'is-active' : ''}`}>
              <span className="adm-nav__icon">{it.icon}</span>
              <span className="adm-nav__label">{t(it.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar__footer">
          <div className="adm-user">
            <div className="adm-user__avatar">{(user?.fullName ?? user?.email ?? 'A').slice(0, 1).toUpperCase()}</div>
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
          <div className="adm-header__title">{t('common.commandCenter')}</div>
          <div className="adm-header__right">
            <button
              className="adm-button adm-button--ghost"
              type="button"
              onClick={() => setTheme((v) => (v === 'dark' ? 'light' : 'dark'))}
              title={t('common.theme')}
            >
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === 'dark' ? t('common.themeDark') : t('common.themeLight')}</span>
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
