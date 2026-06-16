import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useT } from '../../context/LanguageContext';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRow } from '../../components/Skeleton';

const STATUS_FILTERS = ['Tous', 'Pending', 'En cours', 'Livré', 'Rejeté'];
const BULK_STATUSES = ['En cours', 'Livré', 'Rejeté', 'Pending'];
const PAGE_SIZE = 20;

export default function AdminRequestList() {
  const t = useT();
  const STATUS_FILTER_LABELS = {
    Tous: t('all'), Pending: t('status_pending'), 'En cours': t('status_in_progress'),
    Livré: t('status_delivered'), Rejeté: t('status_rejected'),
  };
  const BULK_STATUS_LABELS = {
    'En cours': t('status_in_progress'), Livré: t('status_delivered'),
    Rejeté: t('status_rejected'), Pending: t('status_pending'),
  };
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [agentFilter, setAgentFilter] = useState('');
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('En cours');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([api.get('/requests'), api.get('/admin/team')])
      .then(([rRes, aRes]) => { setRequests(rRes.data); setAgents(aRes.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setSearch(searchParams.get('q') || ''); }, [searchParams]);
  // Reset page + selection when filters change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, statusFilter, agentFilter]);

  const filtered = requests.filter(r => {
    if (statusFilter !== 'Tous' && r.status !== statusFilter) return false;
    if (agentFilter && String(r.assigned_agent_id) !== agentFilter && String(r.assigned_to) !== agentFilter) return false;
    const q = search.toLowerCase();
    if (q && !r.reference_number.toLowerCase().includes(q) && !r.client_name?.toLowerCase().includes(q) && !r.document_type?.toLowerCase().includes(q)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map(r => r.id)));
    }
  }

  async function applyBulkStatus() {
    if (!selected.size) return;
    setBulkSaving(true);
    setBulkMsg('');
    setBulkError('');
    try {
      await api.patch('/requests/bulk-status', { ids: [...selected], status: bulkStatus });
      const res = await api.get('/requests');
      setRequests(res.data);
      const count = selected.size;
      setSelected(new Set());
      setBulkMsg(`${count} demande${count > 1 ? 's' : ''} mise${count > 1 ? 's' : ''} à jour → ${bulkStatus}`);
      setTimeout(() => setBulkMsg(''), 4000);
    } catch {
      setBulkError('Erreur lors de la mise à jour. Veuillez réessayer.');
      setTimeout(() => setBulkError(''), 4000);
    }
    finally { setBulkSaving(false); }
  }

  function exportCsv() {
    const token = localStorage.getItem('token');
    fetch('/api/requests/export', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `requests-${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('admin_req_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} demande{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}.</p>
        </div>
        <button onClick={exportCsv}
          className="shrink-0 border border-[#1A3C34] text-[#1A3C34] rounded-md px-4 py-2 text-sm font-medium hover:bg-[#1A3C34] hover:text-white transition-colors flex items-center gap-2">
          ⬇ Exporter CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par réf., client, document…"
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34] w-72" />
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34]">
          <option value="">Tous les agents</option>
          {agents.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === f ? 'bg-[#1A3C34] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1A3C34]'}`}>
            {STATUS_FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {bulkMsg && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{bulkMsg}</div>
      )}
      {bulkError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{bulkError}</div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-[#1A3C34] text-white rounded-xl px-5 py-3 mb-4 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            className="border border-white/30 bg-white/10 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none">
            {BULK_STATUSES.map(s => <option key={s} value={s} className="text-black">{BULK_STATUS_LABELS[s]}</option>)}
          </select>
          <button onClick={applyBulkStatus} disabled={bulkSaving}
            className="bg-[#C9A03A] text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-[#B08A2E] disabled:opacity-60 transition-colors">
            {bulkSaving ? 'Application…' : 'Appliquer'}
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-white/60 hover:text-white text-sm">
            Annuler
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {paginated.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Aucune demande trouvée.</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0}
                            onChange={toggleAll}
                            className="rounded border-gray-300 text-[#1A3C34] focus:ring-[#1A3C34]" />
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Référence</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Document</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Agent</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">SLA</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Statut</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(r => {
                        const ms = r.sla_deadline ? (new Date(r.sla_deadline) - Date.now()) : null;
                        const h = ms !== null ? Math.floor(ms / 3600000) : null;
                        const totalMin = ms !== null ? Math.floor(ms / 60000) : null;
                        const slaColor = ms === null ? 'text-gray-400' : ms < 0 ? 'text-red-600 font-semibold' : h < 4 ? 'text-red-500' : h < 24 ? 'text-orange-500' : 'text-gray-400';
                        const slaLabel = ms === null ? '—' : ms < 0 ? 'Dépassé' : h < 1 ? `${totalMin}min` : h < 24 ? `${h}h` : `${Math.floor(h/24)}j`;
                        return (
                          <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected.has(r.id) ? 'bg-[#1A3C34]/5' : ''}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                                className="rounded border-gray-300 text-[#1A3C34] focus:ring-[#1A3C34]" />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-[#1A3C34] font-semibold">{r.reference_number}</td>
                            <td className="px-4 py-3 text-[#1C1C1C]">{r.client_name}</td>
                            <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{r.document_type}</td>
                            <td className="px-4 py-3 text-gray-500">{r.assigned_agent_name || <span className="text-gray-300 italic">Non assigné</span>}</td>
                            <td className={`px-4 py-3 text-xs ${slaColor}`}>{slaLabel}</td>
                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                            <td className="px-4 py-3">
                              <Link to={`/admin/requests/${r.id}`}
                                className="text-xs bg-[#1A3C34] text-white rounded-md px-3 py-1.5 hover:bg-[#122B25] transition-colors">
                                Gérer
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-50">
                  {paginated.map(r => {
                    const ms2 = r.sla_deadline ? (new Date(r.sla_deadline) - Date.now()) : null;
                    const h2 = ms2 !== null ? Math.floor(ms2 / 3600000) : null;
                    const min2 = ms2 !== null ? Math.floor(ms2 / 60000) : null;
                    const slaColor = ms2 === null ? 'text-gray-400' : ms2 < 0 ? 'text-red-600' : h2 < 24 ? 'text-orange-500' : 'text-gray-400';
                    return (
                      <div key={r.id} className={`px-4 py-4 flex gap-3 ${selected.has(r.id) ? 'bg-[#1A3C34]/5' : ''}`}>
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                          className="mt-1 rounded border-gray-300 text-[#1A3C34] focus:ring-[#1A3C34] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-mono text-xs font-semibold text-[#1A3C34]">{r.reference_number}</p>
                            <StatusBadge status={r.status} />
                          </div>
                          <p className="text-sm font-medium text-[#1C1C1C]">{r.client_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{r.document_type}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-xs font-medium ${slaColor}`}>
                              {ms2 === null ? '' : ms2 < 0 ? 'Délai dépassé' : h2 < 1 ? `${min2}min restantes` : h2 < 24 ? `${h2}h restantes` : `${Math.floor(h2/24)}j restants`}
                            </p>
                            <Link to={`/admin/requests/${r.id}`}
                              className="text-xs bg-[#1A3C34] text-white rounded-md px-3 py-1.5 hover:bg-[#122B25] transition-colors">
                              Gérer
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>Page {page} sur {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-1.5 rounded-md border border-gray-200 hover:border-[#1A3C34] disabled:opacity-40 transition-colors text-gray-600">
                  ← Précédent
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-4 py-1.5 rounded-md border border-gray-200 hover:border-[#1A3C34] disabled:opacity-40 transition-colors text-gray-600">
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
