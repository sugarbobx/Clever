import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';
import api from '../services/api';
import { getRequests } from '../services/requestService';
import StatusBadge from '../components/StatusBadge';

const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

export default function ProfilePage() {
  const { user, login, token } = useAuth();
  const t = useT();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/auth/me')
      .then(r => { setForm({ name: r.data.name || '', phone: r.data.phone || '' }); })
      .catch(() => setLoadError('Impossible de charger votre profil. Veuillez réessayer.'));
    getRequests().then(r => setRequests(r.data.slice(0, 5))).catch(() => {});
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      await api.patch('/auth/profile', form);
      login(token, user.role, form.name, user.account_type);
      setSaveFailed(false);
      setSaveMsg(t('profile_saved'));
      setTimeout(() => setSaveMsg(''), 2500);
    } catch {
      setSaveFailed(true);
      setSaveMsg(t('profile_save_error'));
    }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('profile_back')}
      </Link>
      <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight mb-8">{t('profile_title')}</h1>
      {loadError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{loadError}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">{t('profile_personal')}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('profile_full_name')}</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('profile_email')} <span className="text-xs text-gray-400">{t('profile_email_note')}</span></label>
            <input value={user?.email || ''} readOnly className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('profile_phone')}</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder={t('profile_phone_ph')} className={inputCls} />
          </div>
          {saveMsg && <p className={`text-sm ${saveFailed ? 'text-[#C53030]' : 'text-[#2F855A]'}`}>{saveMsg}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60 transition-colors">
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">{t('profile_recent')}</h2>
        {requests.length === 0 ? (
          <div>
            <p className="text-sm text-gray-400 mb-3">{t('profile_no_requests')}</p>
            <Link to="/dashboard" className="text-sm text-[#1A3C34] font-medium hover:underline">{t('profile_start')}</Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {requests.map(r => (
                <Link key={r.id} to={`/requests/${r.id}`} state={{ from: '/requests' }} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#1C1C1C]">{r.document_type}</p>
                    <p className="text-xs text-gray-400">{r.reference_number}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link to="/requests" className="text-sm text-[#1A3C34] font-medium hover:underline">{t('profile_view_all')}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
