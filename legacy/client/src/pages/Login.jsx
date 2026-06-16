import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login as loginUser } from '../services/authService';
import { useT } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const t = useT();
  const [form, setForm] = useState({ email: '', password: '' });
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg] = useState(location.state?.toast || '');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setServerError('');
    setLoading(true);
    try {
      const payload = { email: form.email, password: form.password };
      if (needsTotp) payload.totp_code = totpCode;

      const res = await loginUser(payload);

      if (res.data.two_factor_required) {
        setNeedsTotp(true);
        setLoading(false);
        return;
      }

      login(res.data.token, res.data.role, res.data.name, res.data.account_type);
      const role = res.data.role;
      if (role === 'super_admin' || role === 'root_admin') navigate('/admin');
      else if (role === 'agent' || role === 'admin') navigate('/agent');
      else navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Identifiants invalides. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">
            {needsTotp ? t('login_2fa_title') : t('login_title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {needsTotp ? t('login_2fa_subtitle') : t('login_subtitle')}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {successMsg}
            </div>
          )}
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-[#C53030]">
              {serverError}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {!needsTotp ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('login_email')}</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder={t('login_email_ph')} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('login_password')}</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={t('login_pwd_ph')} className={inputCls} required />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('login_2fa_label')}</label>
                <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6} autoFocus
                  className={`${inputCls} tracking-[0.4em] text-center text-xl`} />
              </div>
            )}

            <button type="submit" disabled={loading || (needsTotp && totpCode.length !== 6)}
              className="w-full bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors disabled:opacity-60 mt-2">
              {loading ? t('login_submitting') : needsTotp ? t('login_2fa_validate') : t('login_submit')}
            </button>

            {needsTotp && (
              <button type="button" onClick={() => { setNeedsTotp(false); setTotpCode(''); setServerError(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 text-center mt-1">
                {t('login_back')}
              </button>
            )}
          </form>

          {!needsTotp && (
            <p className="mt-6 text-center text-sm text-gray-500">
              {t('login_no_account')}{' '}
              <Link to="/register" className="text-[#1A3C34] font-medium hover:underline">{t('login_create')}</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
