import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const linkCls = 'flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 rounded-full bg-[#C9A03A] text-white font-bold text-sm flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-[#1C1C1C] truncate">{user?.name}</p>
          </div>

          <div className="py-1">
            <Link to="/profile" onClick={() => setOpen(false)} className={linkCls}>
              <span>👤</span> {t('menu_profile')}
            </Link>
            {user?.account_type === 'entreprise' && (
              <Link to="/company" onClick={() => setOpen(false)} className={linkCls}>
                <span>🏢</span> {t('menu_company')}
              </Link>
            )}
            <Link to="/documents" onClick={() => setOpen(false)} className={linkCls}>
              <span>📂</span> {t('menu_documents')}
            </Link>
            <Link to="/security" onClick={() => setOpen(false)} className={linkCls}>
              <span>🔒</span> {t('menu_security')}
            </Link>
          </div>

          <div className="border-t border-gray-100 py-1">
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <span>🚪</span> {t('menu_logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
