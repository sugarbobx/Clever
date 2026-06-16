import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { login as loginUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';

const LEGAL_FORMS = ['SARL', 'SA', 'SAS', 'SARLU', 'ETS', 'Profession libérale', 'Autre'];
const TAX_REGIMES = ['IGS', 'Réel Simplifié', 'Réel Normal', 'Je ne sais pas'];
const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const t = useT();
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [personal, setPersonal] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [company, setCompany] = useState({ business_name: '', legal_form: '', rccm_number: '', niu_entreprise: '', sector: '', tax_regime: '' });

  const totalSteps = accountType === 'entreprise' ? 3 : 2;

  function setP(f, v) { setPersonal(prev => ({ ...prev, [f]: v })); }
  function setC(f, v) { setCompany(prev => ({ ...prev, [f]: v })); }

  function handleTypeSelect(type) { setAccountType(type); setStep(2); }

  function validatePersonal() {
    if (!personal.name || !personal.email || !personal.password) return t('register_required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) return t('register_email_invalid');
    if (personal.password.length < 8) return t('register_pwd_short');
    if (!/[A-Z]/.test(personal.password)) return t('register_pwd_upper');
    if (!/[0-9]/.test(personal.password)) return t('register_pwd_digit');
    if (personal.password !== personal.confirm) return t('register_mismatch');
    return '';
  }

  function handlePersonalNext() {
    const err = validatePersonal();
    if (err) { setError(err); return; }
    setError('');
    if (accountType === 'entreprise') setStep(3);
    else submit();
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/auth/register', {
        name: personal.name,
        email: personal.email,
        phone: personal.phone || undefined,
        password: personal.password,
        account_type: accountType,
        company: accountType === 'entreprise' ? company : undefined,
      });
      // Auto-login after successful registration
      const res = await loginUser({ email: personal.email, password: personal.password });
      login(res.data.token, res.data.role, res.data.name, res.data.account_type);
      const role = res.data.role;
      if (role === 'super_admin' || role === 'root_admin') navigate('/admin');
      else if (role === 'agent' || role === 'admin') navigate('/agent');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || t('register_error'));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('register_title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{step === 1 ? t('register_step1') : t('register_step_n', { step, total: totalSteps })}</p>
        </div>

        <div className="flex gap-1 mb-8">
          {Array.from({ length: totalSteps || 2 }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i + 1 < step ? 'bg-[#1A3C34]' : i + 1 === step ? 'bg-[#C9A03A]' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-[#C53030]">{error}</div>}

        {step === 1 && (
          <div>
            <h2 className="font-semibold text-[#1A3C34] text-lg mb-2">{t('register_type_title')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('register_type_sub')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { type: 'particulier', icon: '👤', title: t('register_particulier'), desc: t('register_particulier_desc') },
                { type: 'entreprise', icon: '🏢', title: t('register_entreprise'), desc: t('register_entreprise_desc') },
              ].map(({ type, icon, title, desc }) => (
                <button key={type} onClick={() => handleTypeSelect(type)}
                  className="text-left rounded-xl border-2 border-gray-200 bg-white p-6 transition-all hover:border-[#1A3C34] hover:bg-[#1A3C34]/5">
                  <span className="text-3xl block mb-3">{icon}</span>
                  <p className="font-semibold text-[#1A3C34] mb-2">{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-[#1A3C34]">{t('register_personal')}</h2>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_full_name')} <span className="text-red-500">*</span></label>
              <input value={personal.name} onChange={e => setP('name', e.target.value)} placeholder={t('register_name_ph')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_email')} <span className="text-red-500">*</span></label>
              <input type="email" value={personal.email} onChange={e => setP('email', e.target.value)} placeholder={t('register_email_ph')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_phone')}</label>
              <input value={personal.phone} onChange={e => setP('phone', e.target.value)} placeholder={t('register_phone_ph')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_password')} <span className="text-red-500">*</span></label>
              <input type="password" value={personal.password} onChange={e => setP('password', e.target.value)} placeholder={t('register_pwd_ph')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_confirm')} <span className="text-red-500">*</span></label>
              <input type="password" value={personal.confirm} onChange={e => setP('confirm', e.target.value)} placeholder={t('register_confirm_ph')} className={inputCls} />
            </div>
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => { setStep(1); setError(''); }} className="border border-gray-300 text-gray-600 rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-50">{t('register_prev')}</button>
              <button type="button" onClick={handlePersonalNext} disabled={submitting} className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
                {submitting ? t('register_creating') : accountType === 'entreprise' ? t('register_next') : t('register_create_btn')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-[#1A3C34]">{t('register_company_info')}</h2>
            <p className="text-xs text-gray-400">{t('register_company_note')}</p>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_business_name')} <span className="text-red-500">*</span></label>
              <input value={company.business_name} onChange={e => setC('business_name', e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_legal_form')} <span className="text-red-500">*</span></label>
                <select value={company.legal_form} onChange={e => setC('legal_form', e.target.value)} className={inputCls}>
                  <option value="">{t('register_select')}</option>
                  {LEGAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_tax_regime')}</label>
                <select value={company.tax_regime} onChange={e => setC('tax_regime', e.target.value)} className={inputCls}>
                  <option value="">{t('register_select')}</option>
                  {TAX_REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_rccm')} <span className="text-xs text-gray-400">{t('register_rccm_note')}</span></label>
                <input value={company.rccm_number} onChange={e => setC('rccm_number', e.target.value)} placeholder={t('register_rccm_ph')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_niu')} <span className="text-xs text-gray-400">{t('register_niu_note')}</span></label>
                <input value={company.niu_entreprise} onChange={e => setC('niu_entreprise', e.target.value)} placeholder={t('register_niu_ph')} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('register_sector')}</label>
              <input value={company.sector} onChange={e => setC('sector', e.target.value)} placeholder={t('register_sector_ph')} className={inputCls} />
            </div>
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => { setStep(2); setError(''); }} className="border border-gray-300 text-gray-600 rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-50">{t('register_prev')}</button>
              <button type="button" onClick={submit} disabled={submitting || !company.business_name || !company.legal_form} className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
                {submitting ? t('register_creating') : t('register_create_btn')}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('register_already')}{' '}
          <Link to="/login" className="text-[#1A3C34] font-medium hover:underline">{t('register_login')}</Link>
        </p>
      </div>
    </div>
  );
}
