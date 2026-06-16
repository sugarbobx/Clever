import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT, useLang } from '../context/LanguageContext';
import NotificationBell from './NotificationBell';
import AccountMenu from './AccountMenu';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { lang, switchLang } = useLang();
  const [navSearch, setNavSearch] = useState('');

  function handleLogout() { logout(); navigate('/login'); }

  function handleSearch(e) {
    e.preventDefault();
    const q = navSearch.trim();
    if (!q) return;
    const dest = (user?.role === 'super_admin' || user?.role === 'root_admin') ? '/admin/requests'
      : (user?.role === 'agent' || user?.role === 'admin') ? '/agent/all'
      : '/requests';
    navigate(`${dest}?q=${encodeURIComponent(q)}`);
    setNavSearch('');
  }

  const homeLink = (user?.role === 'super_admin' || user?.role === 'root_admin') ? '/admin'
    : (user?.role === 'agent' || user?.role === 'admin') ? '/agent'
    : '/dashboard';

  const linkCls = 'text-sm text-green-200 hover:text-[#C9A03A] font-medium transition-colors';

  return (
    <nav className="sticky top-0 z-50 bg-[#122B25] border-b border-[#1A3C34]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={homeLink} className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white tracking-tight">Clever</span>
          <span className="text-xs text-green-300 hidden sm:inline">by TheCleverest Consulting</span>
        </Link>

        <div className="flex items-center gap-4">
          {(user?.role === 'agent' || user?.role === 'admin') && (
            <>
              <Link to="/agent" className={linkCls}>{t('nav_my_assignments')}</Link>
              <Link to="/agent/all" className={linkCls}>{t('nav_all_requests')}</Link>
            </>
          )}
          {(user?.role === 'super_admin' || user?.role === 'root_admin') && (
            <>
              <Link to="/admin/requests" className={linkCls}>{t('nav_requests')}</Link>
              <Link to="/admin/catalogue" className={`${linkCls} hidden sm:inline`}>{t('nav_catalogue')}</Link>
              <Link to="/admin/routing" className={`${linkCls} hidden sm:inline`}>{t('nav_routing')}</Link>
              <Link to="/admin/team" className={`${linkCls} hidden md:inline`}>{t('nav_team')}</Link>
              <Link to="/admin/analytics" className={`${linkCls} hidden md:inline`}>{t('nav_analytics')}</Link>
              <Link to="/root" className={`${linkCls} hidden lg:inline text-white/40 hover:text-white/70`}>{t('nav_root_portal')}</Link>
            </>
          )}

          {user && (
            <form onSubmit={handleSearch} className="hidden md:flex">
              <input
                type="search"
                value={navSearch}
                onChange={e => setNavSearch(e.target.value)}
                placeholder={t('nav_search_placeholder')}
                className="bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40 w-44"
              />
            </form>
          )}

          <button
            onClick={() => switchLang(lang === 'fr' ? 'en' : 'fr')}
            className="text-xs font-bold text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded px-2 py-1 transition-colors"
            title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}>
            {t('lang_toggle')}
          </button>

          {user && <NotificationBell />}

          {user?.role === 'client' && <AccountMenu />}

          {(user?.role === 'agent' || user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'root_admin') && (
            <button onClick={handleLogout} className="text-sm bg-[#C9A03A] text-white rounded-md px-4 py-2 hover:bg-[#B08A2E] transition-colors">
              {t('nav_logout')}
            </button>
          )}

          {!user && (
            <Link to="/login" className="text-sm bg-[#C9A03A] text-white rounded-md px-4 py-2 hover:bg-[#B08A2E] transition-colors">
              {t('nav_login')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
