import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRequests } from '../../services/requestService';
import StatusBadge from '../../components/StatusBadge';

const FILTERS = ['All', 'Pending', 'In Progress', 'Delivered'];

function isOverdue(r) {
  return r.due_date && r.status !== 'Delivered' && r.status !== 'Cancelled' && new Date(r.due_date) < new Date();
}

export default function RequestList({ requests: propRequests, loading: propLoading }) {
  const [requests, setRequests] = useState(propRequests || []);
  const [loading, setLoading] = useState(propLoading !== undefined ? propLoading : true);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    if (propRequests !== undefined) {
      setRequests(propRequests);
      setLoading(false);
      return;
    }
    getRequests()
      .then((res) => setRequests(res.data))
      .catch(() => setError('Failed to load requests.'))
      .finally(() => setLoading(false));
  }, [propRequests]);

  const [search, setSearch] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);

  const filtered = requests
    .filter(r => filter === 'All' || r.status === filter)
    .filter(r => !urgentOnly || r.priority === 'Urgent')
    .filter(r => {
      const q = search.toLowerCase();
      return !q || r.reference_number.toLowerCase().includes(q) || r.client_name?.toLowerCase().includes(q);
    });

  const isStandalone = propRequests === undefined;

  const content = (
    <div>
      {isStandalone && (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight mb-1">All Requests</h1>
          <p className="text-sm text-gray-500">Manage and process client document requests.</p>
        </div>
      )}

      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference or client name…" className="w-full sm:w-80 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34]" />
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#1A3C34] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1A3C34]'
            }`}
          >
            {f}
          </button>
        ))}
        <button onClick={() => setUrgentOnly(v => !v)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${urgentOnly ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-400'}`}>
          🔴 Urgent
        </button>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-[#C53030] text-sm">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Reference No.</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Client Name</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Document Type</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Date Submitted</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isOverdue(r) ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-[#1A3C34] font-semibold">{r.reference_number}</span>
                        {r.priority === 'Urgent' && <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">URGENT</span>}
                        {isOverdue(r) && <span className="ml-2 text-xs font-semibold text-[#C53030] bg-red-100 px-1.5 py-0.5 rounded">OVERDUE</span>}
                      </td>
                      <td className="px-6 py-4 text-[#1C1C1C]">{r.client_name}</td>
                      <td className="px-6 py-4 text-gray-500">{r.document_type}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/admin/requests/${r.id}`}
                          className="text-sm bg-[#1A3C34] text-white rounded-md px-4 py-1.5 hover:bg-[#122B25] transition-colors"
                        >
                          Manage
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

  if (isStandalone) {
    return <div className="max-w-6xl mx-auto px-4 py-10">{content}</div>;
  }
  return content;
}
