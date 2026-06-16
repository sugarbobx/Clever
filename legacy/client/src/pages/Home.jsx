import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';

export default function Home() {
  const { user } = useAuth();
  const t = useT();

  const dashLink = (user?.role === 'super_admin' || user?.role === 'root_admin') ? '/admin'
    : (user?.role === 'agent' || user?.role === 'admin') ? '/agent' : '/dashboard';

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-4xl sm:text-5xl font-semibold text-[#1A3C34] tracking-tight max-w-2xl">
          {t('home_title')}
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-xl">
          {t('home_subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          {user ? (
            <Link to={dashLink}
              className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors">
              {t('home_cta')}
            </Link>
          ) : (
            <>
              <Link to="/register"
                className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors">
                {t('home_cta')}
              </Link>
              <Link to="/login"
                className="border border-[#1A3C34] text-[#1A3C34] rounded-md px-6 py-2.5 font-medium hover:bg-[#1A3C34] hover:text-white transition-colors">
                {t('home_login')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
