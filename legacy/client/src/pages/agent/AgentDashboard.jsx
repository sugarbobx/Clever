import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useT, useLang } from '../../context/LanguageContext';
import { SkeletonRow } from '../../components/Skeleton';

function slaColor(deadline) {
  if (!deadline) return 'text-gray-400';
  const h = Math.floor((new Date(deadline) - Date.now()) / 3600000);
  if (h < 0) return 'text-red-600 font-semibold';
  if (h < 4) return 'text-red-600';
  if (h < 24) return 'text-orange-500';
  return 'text-green-700';
}

function slaLabel(deadline, t) {
  if (!deadline) return '—';
  const ms = new Date(deadline) - Date.now();
  if (ms < 0) return t('time_overdue');
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return t('time_minutes_left', { m: totalMin });
  const h = Math.floor(ms / 3600000);
  if (h < 24) return t('time_hours_left', { h });
  return t('time_days_left', { d: Math.floor(h / 24) });
}

const STATUS_LABELS = {
  Pending: 'En attente', 'En cours': 'En cours', 'In Progress': 'En cours',
  Livré: 'Livré', Delivered: 'Livré', Rejeté: 'Rejeté',
};

function RequestRow({ r, onAssign, currentTab, lang }) {
  const t = useT();
  return (
    <div className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link to={`/agent/requests/${r.id}`} state={{ from: currentTab }}
            className="text-sm font-medium text-[#1A3C34] hover:underline truncate block">
            {r.document_type}
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">
            {r.reference_number} · {r.client_name}
            {onAssign && (
              <span className="ml-1 text-gray-300">
                · {new Date(r.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </p>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
          {STATUS_LABELS[r.status] || r.status}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs font-medium ${slaColor(r.sla_deadline)}`}>{slaLabel(r.sla_deadline, t)}</span>
        {onAssign ? (
          <button onClick={() => onAssign(r.id)}
            className="text-xs bg-[#1A3C34] text-white px-3 py-1.5 rounded-md hover:bg-[#122B25] transition-colors font-medium">
            {t('agent_take')}
          </button>
        ) : (
          <Link to={`/agent/requests/${r.id}`} state={{ from: currentTab }}
            className="text-xs border border-[#1A3C34] text-[#1A3C34] px-3 py-1.5 rounded-md hover:bg-[#1A3C34] hover:text-white transition-colors font-medium">
            {t('agent_manage')}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AgentDashboard() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const t = useT();
  const { lang } = useLang();
  const [tab, setTab] = useState(
    location.state?.tab || (location.pathname === '/agent/all' ? 'unassigned' : 'assigned')
  );
  const [search, setSearch]         = useState(searchParams.get('q') || '');
  const [assigned, setAssigned]     = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState('');

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [a, u] = await Promise.all([
        api.get('/requests'),
        api.get('/requests?tab=unassigned'),
      ]);
      setAssigned(a.data);
      setUnassigned(u.data);
    } catch {
      setLoadError(t('agent_load_error'));
    }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setSearch(searchParams.get('q') || ''); }, [searchParams]);

  async function handleAssign(id) {
    try {
      await api.patch(`/requests/${id}/assign-me`);
      await load();
      setTab('assigned');
    } catch {
      setLoadError(t('agent_assign_error'));
      setTimeout(() => setLoadError(''), 3000);
    }
  }

  const filterFn = r => !search ||
    r.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.document_type?.toLowerCase().includes(search.toLowerCase()) ||
    r.client_name?.toLowerCase().includes(search.toLowerCase());

  const assignedFiltered   = assigned.filter(filterFn);
  const unassignedFiltered = unassigned.filter(filterFn);
  const list = tab === 'assigned' ? assignedFiltered : unassignedFiltered;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('agent_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('agent_subtitle')}</p>
        </div>
        <button onClick={load} className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors shrink-0">
          {t('agent_refresh')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('agent_search_ph')}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34] w-72" />
        {search && <button onClick={() => setSearch('')} className="text-xs text-gray-400 hover:text-gray-600">{t('agent_clear')}</button>}
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('assigned')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'assigned' ? 'bg-white text-[#1A3C34] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          {t('agent_tab_assigned')} {assignedFiltered.length > 0 && <span className="ml-1.5 bg-[#1A3C34] text-white text-xs px-1.5 py-0.5 rounded-full">{assignedFiltered.length}</span>}
        </button>
        <button onClick={() => setTab('unassigned')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'unassigned' ? 'bg-white text-[#1A3C34] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          {t('agent_tab_unassigned')} {unassignedFiltered.length > 0 && <span className="ml-1.5 bg-[#C9A03A] text-white text-xs px-1.5 py-0.5 rounded-full">{unassignedFiltered.length}</span>}
        </button>
      </div>

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={load} className="ml-4 text-sm font-medium underline hover:no-underline shrink-0">{t('retry')}</button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {Array(4).fill(0).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}
      <div className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {!loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {list.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-3xl mb-3">{tab === 'assigned' ? '✅' : '📭'}</p>
                <p className="text-sm">{tab === 'assigned' ? t('agent_empty_assigned') : t('agent_empty_unassigned')}</p>
              </div>
            ) : (
              list.map(r => (
                <RequestRow key={r.id} r={r} onAssign={tab === 'unassigned' ? handleAssign : null} currentTab={tab} lang={lang} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
