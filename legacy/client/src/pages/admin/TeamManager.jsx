import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useT } from '../../context/LanguageContext';

const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';
const EMPTY_FORM = { name: '', email: '', password: '' };

export default function TeamManager() {
  const t = useT();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loadError, setLoadError] = useState('');

  async function load() {
    try {
      const r = await api.get('/admin/team');
      setAgents(r.data);
      setLoadError('');
    } catch {
      setLoadError('Impossible de charger l\'équipe. Veuillez réessayer.');
    }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setErr(t('team_required')); return; }
    setSaving(true); setErr(''); setMsg('');
    try {
      await api.post('/admin/team/create-agent', form);
      setMsg(t('team_created', { name: form.name }));
      setForm(EMPTY_FORM); setShowForm(false);
      await load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr(e.response?.data?.message || t('team_create_error')); }
    finally { setSaving(false); }
  }

  async function handleToggle(agent) {
    try {
      await api.patch(`/admin/team/${agent.id}/deactivate`);
      await load();
    } catch {
      setErr(t('team_toggle_error'));
      setTimeout(() => setErr(''), 3000);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('team_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{agents.length} agent{agents.length !== 1 ? 's' : ''} dans l'équipe.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-[#1A3C34] text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#122B25] transition-colors">
            {t('team_new')}
          </button>
        )}
      </div>

      {loadError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{loadError}</div>}
      {msg && <p className="text-sm text-[#2F855A] mb-4">{msg}</p>}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-[#1A3C34]/20 p-5 mb-6">
          <h2 className="font-semibold text-[#1A3C34] mb-4">{t('team_create')}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('team_full_name')}</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('team_email')}</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('team_temp_pwd')}</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inputCls} />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setErr(''); setForm(EMPTY_FORM); }}
                className="border border-gray-300 text-gray-600 rounded-md px-5 py-2 text-sm hover:bg-gray-50">
                {t('cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
                {saving ? t('team_creating') : t('team_create_btn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-sm">{t('loading')}</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {agents.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">{t('team_empty')}</div>
          ) : (
            agents.map((a, i) => (
              <div key={a.id} className={`flex items-center justify-between px-5 py-4 ${i < agents.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#1A3C34] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {a.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1C1C1C]">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500"><span className="font-semibold text-blue-600">{a.active_requests ?? 0}</span> {t('team_in_progress')}</p>
                    <p className="text-xs text-gray-500"><span className="font-semibold text-[#2F855A]">{a.delivered_requests ?? 0}</span> {t('team_delivered')}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.is_active ? t('active') : t('inactive')}
                  </span>
                  <button onClick={() => handleToggle(a)}
                    className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                    {a.is_active ? t('team_deactivate') : t('team_activate')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
