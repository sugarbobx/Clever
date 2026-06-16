import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useT } from '../../context/LanguageContext';

export default function RootRoutingRules() {
  const t = useT();
  const [rules, setRules]   = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [error, setError]     = useState('');
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    Promise.all([api.get('/admin/routing'), api.get('/admin/team')])
      .then(([rRes, aRes]) => { setRules(rRes.data); setAgents(aRes.data); })
      .catch(() => setError(t('root_routing_load_error')))
      .finally(() => setLoading(false));
  }, []);

  async function handleChange(docId, agentId) {
    setSaving(docId); setMsg(''); setError('');
    try {
      await api.patch(`/admin/routing/${docId}`, { assigned_agent_id: agentId ? Number(agentId) : null });
      setRules(prev => prev.map(r => r.document_catalogue_id === docId
        ? { ...r, assigned_agent_id: agentId ? Number(agentId) : null, agent_name: agents.find(a => a.id === Number(agentId))?.name || null }
        : r));
      setMsg(t('root_routing_saved'));
      setTimeout(() => setMsg(''), 2500);
    } catch { setError(t('error_generic')); }
    finally { setSaving(null); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/root" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('root_routing_back')}
      </Link>
      <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight mb-1">{t('root_routing_title')}</h1>
      <p className="text-sm text-gray-500 mb-8">{t('root_routing_subtitle')}</p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      {msg && <p className="mb-4 text-sm text-[#2F855A]">{msg}</p>}

      {loading ? <p className="text-gray-400 text-sm">{t('loading')}</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {rules.length === 0 ? (
            <p className="text-gray-400 text-sm p-6">{t('root_routing_empty')}</p>
          ) : (
            rules.map((rule, i) => (
              <div key={rule.document_catalogue_id}
                className={`flex items-center justify-between px-5 py-4 gap-4 ${i < rules.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1C1C1C]">{rule.label}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{rule.code}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={rule.assigned_agent_id || ''}
                    onChange={e => handleChange(rule.document_catalogue_id, e.target.value)}
                    disabled={saving === rule.document_catalogue_id}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34] disabled:opacity-60 min-w-[160px]">
                    <option value="">{t('root_routing_select')}</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}{a.active_requests > 0 ? ` (${a.active_requests})` : ''}
                      </option>
                    ))}
                  </select>
                  {saving === rule.document_catalogue_id && <span className="text-xs text-gray-400">…</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
