import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getRequests, assignRequest } from '../../services/requestService';
import { getEmployees } from '../../services/employeeService';
import { useT } from '../../context/LanguageContext';
import StatusBadge from '../../components/StatusBadge';

const FILTER_KEYS = ['All', 'Pending', 'En cours', 'Livré', 'Rejeté', 'Cancelled'];

function isOverdue(r) {
  return r.sla_deadline && !['Livré','Delivered','Rejeté','Cancelled'].includes(r.status) && new Date(r.sla_deadline) < new Date();
}

export default function RootRequestList() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const [requests, setRequests]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('All');
  const [search, setSearch]       = useState(searchParams.get('q') || '');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [assignSelections, setAssignSelections] = useState({});
  const [assignError, setAssignError] = useState('');

  useEffect(() => { setSearch(searchParams.get('q') || ''); }, [searchParams]);

  useEffect(() => {
    Promise.all([getRequests(), getEmployees()])
      .then(([rRes, eRes]) => { setRequests(rRes.data); setEmployees(eRes.data.filter(e => e.is_active)); })
      .finally(() => setLoading(false));
  }, []);

  const FILTER_LABELS = {
    All: t('all'), Pending: t('status_pending'), 'En cours': t('status_in_progress'),
    Livré: t('status_delivered'), Rejeté: t('status_rejected'), Cancelled: t('status_cancelled'),
  };

  async function handleQuickAssign(requestId) {
    const empId = assignSelections[requestId];
    if (!empId) return;
    try {
      await assignRequest(requestId, Number(empId));
      const emp = employees.find(e => e.id === Number(empId));
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, assigned_to: Number(empId), assigned_to_name: emp?.name } : r));
      setAssignSelections(prev => { const n = { ...prev }; delete n[requestId]; return n; });
    } catch {
      setAssignError(t('root_req_assign_error'));
      setTimeout(() => setAssignError(''), 3000);
    }
  }

  const filtered = requests
    .filter(r => filter === 'All' || r.status === filter)
    .filter(r => !urgentOnly || r.priority === 'Urgent')
    .filter(r => {
      const q = search.toLowerCase();
      return !q || r.reference_number.toLowerCase().includes(q) || r.client_name?.toLowerCase().includes(q) || r.assigned_to_name?.toLowerCase().includes(q);
    });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Link to="/root" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('root_req_back')}
      </Link>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('root_req_title')}</h1>
        <button
          onClick={() => {
            const token = localStorage.getItem('token');
            fetch('/api/requests/export', { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.blob())
              .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'requests.csv'; a.click();
                URL.revokeObjectURL(url);
              });
          }}
          className="text-sm border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50 transition-colors">
          {t('root_req_export')}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">{t('root_req_subtitle')}</p>

      {assignError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{assignError}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('root_req_search_ph')}
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34]"
        />
        <div className="flex flex-wrap gap-2">
          {FILTER_KEYS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-[#1A3C34] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1A3C34]'}`}>
              {FILTER_LABELS[f]}
            </button>
          ))}
          <button onClick={() => setUrgentOnly(v => !v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${urgentOnly ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-400'}`}>
            {t('root_req_urgent')}
          </button>
        </div>
      </div>

      {loading ? <p className="text-gray-400 text-sm">{t('loading')}</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">{t('root_req_none')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('root_req_ref')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('root_req_client')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('root_req_document')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('root_req_assigned')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('root_req_deadline')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('root_req_status')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('root_req_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isOverdue(r) ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-[#1A3C34] font-semibold">{r.reference_number}</span>
                        {r.priority === 'Urgent' && <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">{t('status_urgent')}</span>}
                      </td>
                      <td className="px-6 py-4 text-[#1C1C1C]">{r.client_name}</td>
                      <td className="px-6 py-4 text-gray-500">{r.document_type}</td>
                      <td className="px-6 py-4">
                        {r.assigned_to_name ? (
                          <span className="text-gray-500">{r.assigned_to_name}</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <select
                              value={assignSelections[r.id] || ''}
                              onChange={e => setAssignSelections(prev => ({ ...prev, [r.id]: e.target.value }))}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1A3C34]">
                              <option value="">{t('root_req_assign_ph')}</option>
                              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <button
                              onClick={() => handleQuickAssign(r.id)}
                              disabled={!assignSelections[r.id]}
                              className="text-xs bg-[#1A3C34] text-white rounded px-2 py-1 hover:bg-[#122B25] disabled:opacity-40 transition-colors">
                              {t('root_req_assign_btn')}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {r.sla_deadline ? (
                          <span className={isOverdue(r) ? 'text-[#C53030] font-semibold' : 'text-gray-500'}>
                            {new Date(r.sla_deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {isOverdue(r) && ` ${t('root_req_overdue_icon')}`}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-4">
                        <Link to={`/admin/requests/${r.id}`} className="text-sm bg-[#1A3C34] text-white rounded-md px-4 py-1.5 hover:bg-[#122B25] transition-colors">
                          {t('root_req_manage')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
