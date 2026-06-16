import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useT } from '../../context/LanguageContext';

export default function RoutingRules() {
  const t = useT();
  const [rules, setRules] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([api.get('/admin/routing'), api.get('/admin/team')])
      .then(([rRes, aRes]) => { setRules(rRes.data); setAgents(aRes.data); })
      .finally(() => setLoading(false));
  }, []);

  async function handleChange(docId, agentId) {
    setSaving(docId); setMsg('');
    try {
      await api.patch(`/admin/routing/${docId}`, { assigned_agent_id: agentId ? Number(agentId) : null });
      setRules(prev => prev.map(r => r.document_catalogue_id === docId ? { ...r, assigned_agent_id: agentId ? Number(agentId) : null, agent_name: agents.find(a => a.id === Number(agentId))?.name || null } : r));
      setMsg(t('routing_saved'));
      setTimeout(() => setMsg(''), 2500);
    } catch { setMsg(t('routing_error')); }
    finally { setSaving(null); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('routing_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('routing_subtitle')}</p>
      </div>

      {msg && <p className={`text-sm mb-4 ${msg === t('routing_error') ? 'text-red-600' : 'text-[#2F855A]'}`}>{msg}</p>}

      {loading ? <p className="text-gray-400 text-sm">{t('loading')}</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {rules.length === 0 ? (
            <p className="text-gray-400 text-sm p-6">{t('routing_empty')}</p>
          ) : (
            rules.map((rule, i) => (
              <div key={rule.document_catalogue_id}
                className={`flex items-center justify-between px-5 py-4 gap-4 ${i < rules.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1C1C1C]">{rule.label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400 font-mono">{rule.code}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${rule.available_for === 'A1' ? 'bg-blue-100 text-blue-600' : rule.available_for === 'A2' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                      {rule.available_for}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={rule.assigned_agent_id || ''}
                    onChange={e => handleChange(rule.document_catalogue_id, e.target.value)}
                    disabled={saving === rule.document_catalogue_id}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34] disabled:opacity-60 min-w-[160px]">
                    <option value="">{t('routing_unassigned')}</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}{a.active_requests > 0 ? ` (${a.active_requests} ${t('routing_in_progress')})` : ''}
                      </option>
                    ))}
                  </select>
                  {saving === rule.document_catalogue_id && <span className="text-xs text-gray-400">{t('routing_loading')}</span>}
                  {rule.assigned_agent_id && (() => {
                    const a = agents.find(ag => ag.id === rule.assigned_agent_id);
                    return a?.active_requests > 0
                      ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium shrink-0">{a.active_requests} {t('routing_in_progress')}</span>
                      : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">{t('routing_available')}</span>;
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
