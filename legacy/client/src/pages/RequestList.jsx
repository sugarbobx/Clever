import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useT } from '../context/LanguageContext';

const STATUS_FILTER_LABELS = { Tous: 'Tous', Pending: 'En attente', 'En cours': 'En cours', Livré: 'Livré', Rejeté: 'Rejeté' };
import { getRequests } from '../services/requestService';
import StatusBadge from '../components/StatusBadge';
import { SkeletonCard } from '../components/Skeleton';

const STATUS_FILTERS = ['Tous', 'Pending', 'En cours', 'Livré', 'Rejeté'];
const PAGE_SIZE = 12;

export default function RequestList() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('Tous');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);

  useEffect(() => {
    getRequests()
      .then(res => setRequests(res.data))
      .catch(() => setError('Impossible de charger vos demandes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setSearch(searchParams.get('q') || ''); }, [searchParams]);
  useEffect(() => { setPage(1); }, [filter, search]);

  const filtered = requests.filter(r => {
    if (filter !== 'Tous' && r.status !== filter) return false;
    if (search && !r.reference_number.toLowerCase().includes(search.toLowerCase()) &&
        !r.document_type?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('req_list_back')}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('req_list_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{requests.length} demande{requests.length !== 1 ? 's' : ''} au total.</p>
        </div>
      </div>

      {!loading && requests.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('req_list_search_ph')}
              className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34] flex-1 min-w-[200px]" />
            {search && <button onClick={() => setSearch('')} className="text-xs text-gray-400 hover:text-gray-600">{t('req_list_clear')}</button>}
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-[#1A3C34] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1A3C34]'}`}>
                {STATUS_FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </>
      )}

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          {requests.length === 0 ? (
            <>
              <p className="text-3xl mb-3">📋</p>
              <p className="text-sm mb-4">{t('req_list_empty')}</p>
              <Link to="/dashboard" className="text-sm text-[#1A3C34] font-medium hover:underline">
                {t('req_list_make')}
              </Link>
            </>
          ) : (
            <p className="text-sm">{t('req_list_no_results')}</p>
          )}
        </div>
      )}

      {!loading && !error && paginated.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {paginated.map(r => (
              <Link key={r.id} to={`/requests/${r.id}`} state={{ from: '/requests' }}
                className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-[#1A3C34]/20 transition-all group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">Référence</p>
                    <p className="font-semibold text-[#1A3C34] tracking-tight text-sm group-hover:underline">{r.reference_number}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-gray-600 truncate">{r.document_type}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.assigned_agent_name
                    ? `${t('req_list_agent')} ${r.assigned_agent_name}`
                    : t('req_list_unassigned')}
                </p>
                {r.sla_deadline && (r.status === 'Pending' || r.status === 'En cours') && (() => {
                  const h = Math.floor((new Date(r.sla_deadline) - Date.now()) / 3600000);
                  const color = h < 0 ? 'text-red-500' : h < 24 ? 'text-orange-500' : 'text-gray-400';
                  return <p className={`text-xs mt-1 font-medium ${color}`}>{h < 0 ? 'Délai dépassé' : h < 24 ? `${h}h restantes` : `${Math.floor(h/24)}j restants`}</p>;
                })()}
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 text-sm text-gray-500">
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
    </div>
  );
}
