import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useT } from '../context/LanguageContext';

const LEGAL_FORMS = ['SARL', 'SA', 'SAS', 'SARLU', 'ETS', 'Profession libérale', 'Autre'];
const TAX_REGIMES = ['IGS', 'Réel Simplifié', 'Réel Normal', 'Je ne sais pas'];
const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

export default function CompanyProfilePage() {
  const t = useT();
  const [form, setForm] = useState({ business_name: '', legal_form: '', rccm_number: '', niu_entreprise: '', sector: '', tax_regime: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/auth/company-profile').then(r => {
      const d = r.data;
      setForm({ business_name: d.business_name || '', legal_form: d.legal_form || '', rccm_number: d.rccm_number || '', niu_entreprise: d.niu_entreprise || '', sector: d.sector || '', tax_regime: d.tax_regime || '' });
    }).catch(() => {});
  }, []);

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/company-profile', form);
      setMsg(t('company_saved'));
      setTimeout(() => setMsg(''), 2500);
    } catch { setMsg(t('company_error')); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('company_back')}
      </Link>
      <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight mb-8">{t('company_title')}</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">{t('company_info')}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('company_business_name')} <span className="text-red-500">*</span></label>
            <input value={form.business_name} onChange={e => set('business_name', e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('company_legal_form')} <span className="text-red-500">*</span></label>
              <select value={form.legal_form} onChange={e => set('legal_form', e.target.value)} className={inputCls}>
                <option value="">{t('company_select')}</option>
                {LEGAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('company_tax_regime')}</label>
              <select value={form.tax_regime} onChange={e => set('tax_regime', e.target.value)} className={inputCls}>
                <option value="">{t('company_select')}</option>
                {TAX_REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('company_rccm')}</label>
              <input value={form.rccm_number} onChange={e => set('rccm_number', e.target.value)} placeholder={t('company_rccm_ph')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('company_niu')}</label>
              <input value={form.niu_entreprise} onChange={e => set('niu_entreprise', e.target.value)} placeholder={t('company_niu_ph')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('company_sector')}</label>
            <input value={form.sector} onChange={e => set('sector', e.target.value)} placeholder={t('company_sector_ph')} className={inputCls} />
          </div>
          {msg && <p className="text-sm text-[#2F855A]">{msg}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !form.business_name || !form.legal_form} className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>

      {form.tax_regime && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-[#1A3C34] mb-3">{t('company_fiscal_summary')}</h2>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-[#1C1C1C]">{form.tax_regime}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('company_fiscal_note')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
