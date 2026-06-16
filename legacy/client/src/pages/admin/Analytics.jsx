import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import { useT } from '../../context/LanguageContext';

const COLORS = ['#1A3C34', '#C9A03A', '#2F855A', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#1A3C34]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Analytics() {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-10 text-gray-400 text-sm">{t('loading')}</div>;
  if (!data) return <div className="max-w-5xl mx-auto px-4 py-10 text-red-600 text-sm">Erreur de chargement.</div>;

  const monthlyRevenue = data.monthlyRevenue || [];
  const byDocType = data.byDocType || [];
  const topClients = data.topClients || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('analytics_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('analytics_subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Revenu ce mois" value={data.revenueThisMonth != null ? `${(data.revenueThisMonth / 1000).toFixed(0)}K XAF` : '—'} />
        <StatCard label="Demandes ce mois" value={data.requestsThisMonth ?? '—'} />
        <StatCard label="Taux de livraison" value={data.deliveryRate != null ? `${data.deliveryRate}%` : '—'} />
        <StatCard label="Document le + demandé" value={data.topDocument || '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Revenue bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-[#1A3C34] mb-4">{t('analytics_revenue')}</h2>
          {monthlyRevenue.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucune donnée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [`${v.toLocaleString('fr-FR')} XAF`, 'Revenu']} labelStyle={{ color: '#1C1C1C' }} />
                <Bar dataKey="revenue" fill="#1A3C34" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Doc type pie chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-[#1A3C34] mb-4">{t('analytics_by_type')}</h2>
          {byDocType.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucune donnée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byDocType} dataKey="count" nameKey="document_type" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byDocType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top clients table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-[#1A3C34] mb-4">{t('analytics_top_clients')}</h2>
        {topClients.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune donnée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Client</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Email</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Demandes</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Revenu</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 px-3 font-medium text-[#1C1C1C]">{c.name}</td>
                    <td className="py-2.5 px-3 text-gray-500">{c.email}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{c.request_count}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#C9A03A]">{c.total_revenue?.toLocaleString('fr-FR')} XAF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
