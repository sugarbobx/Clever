import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRequests } from '../../services/requestService';
import { getEmployees } from '../../services/employeeService';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import StatusBadge from '../../components/StatusBadge';

function StatCard({ label, value, color, to }) {
  return (
    <Link to={to} className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </Link>
  );
}

export default function RootDashboard() {
  const { user } = useAuth();
  const t = useT();
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getRequests(), getEmployees()])
      .then(([rRes, eRes]) => { setRequests(rRes.data); setEmployees(eRes.data); })
      .catch(() => setError(t('root_load_error')))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    total:      requests.length,
    pending:    requests.filter(r => r.status === 'Pending').length,
    inProgress: requests.filter(r => r.status === 'En cours').length,
    delivered:  requests.filter(r => r.status === 'Livré').length,
  };

  // Sort recent: overdue/urgent first, then by creation date desc
  const recent = [...requests]
    .sort((a, b) => {
      const aOverdue = a.sla_deadline && new Date(a.sla_deadline) < new Date() && !['Livré','Rejeté','Cancelled'].includes(a.status);
      const bOverdue = b.sla_deadline && new Date(b.sla_deadline) < new Date() && !['Livré','Rejeté','Cancelled'].includes(b.status);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      const aUrgent = a.priority === 'Urgent';
      const bUrgent = b.priority === 'Urgent';
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight mb-1">
        {t('dashboard_greeting')}, {user?.name}
      </h1>
      <p className="text-sm text-gray-500 mb-8">{t('root_subtitle')}</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => { setError(''); setLoading(true); Promise.all([getRequests(), getEmployees()]).then(([rRes, eRes]) => { setRequests(rRes.data); setEmployees(eRes.data); }).catch(() => setError(t('root_load_error'))).finally(() => setLoading(false)); }} className="ml-4 text-sm font-medium underline hover:no-underline">{t('retry')}</button>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-sm">{t('loading')}</p> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <StatCard label={t('root_total')}       value={counts.total}      color="text-[#1A3C34]"  to="/root/requests" />
            <StatCard label={t('root_pending')}     value={counts.pending}    color="text-[#B7791F]"  to="/root/requests" />
            <StatCard label={t('root_in_progress')} value={counts.inProgress} color="text-blue-600"   to="/root/requests" />
            <StatCard label={t('root_delivered')}   value={counts.delivered}  color="text-[#2F855A]"  to="/root/requests" />
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#1A3C34]">{t('root_recent')}</h2>
                <Link to="/root/requests" className="text-xs text-[#C9A03A] hover:underline">{t('root_view_all')}</Link>
              </div>
              {recent.length === 0 ? <p className="text-sm text-gray-400">{t('root_no_requests')}</p> : (
                <ul className="space-y-3">
                  {recent.map(r => (
                    <li key={r.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-[#1A3C34] font-semibold">{r.reference_number}</p>
                        <p className="text-xs text-gray-400">{r.client_name} · {r.document_type}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#1A3C34]">{t('root_agents')}</h2>
                <Link to="/root/employees" className="text-xs text-[#C9A03A] hover:underline">{t('root_manage')}</Link>
              </div>
              {employees.length === 0 ? <p className="text-sm text-gray-400">{t('root_no_agents')}</p> : (
                <ul className="space-y-3">
                  {employees.map(e => (
                    <li key={e.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#1C1C1C]">{e.name}</p>
                        <p className="text-xs text-gray-400">{e.email}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.is_active ? 'bg-green-100 text-[#2F855A]' : 'bg-gray-100 text-gray-400'}`}>
                        {e.is_active ? t('active') : t('inactive')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
