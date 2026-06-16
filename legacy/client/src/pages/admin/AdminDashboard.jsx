import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useT } from '../../context/LanguageContext';

function StatCard({ label, value, color, to }) {
  const inner = (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const t = useT();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('admin_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('admin_subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {loading ? Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse h-20" />
        )) : <>
          <StatCard label={t('admin_revenue')} value={stats?.revenueThisMonth != null ? `${(stats.revenueThisMonth/1000).toFixed(0)}K XAF` : '—'} color="text-[#C9A03A]" />
          <StatCard label={t('admin_requests_month')} value={stats?.requestsThisMonth ?? '—'} color="text-blue-600" to="/admin/requests" />
          <StatCard label={t('admin_delivery_rate')} value={stats?.deliveryRate != null ? `${stats.deliveryRate}%` : '—'} color="text-[#2F855A]" />
          <StatCard label={t('admin_top_doc')} value={stats?.topDocument || '—'} color="text-[#1A3C34]" to="/admin/catalogue" />
        </>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { to: '/admin/requests', icon: '📋', title: t('admin_nav_requests'), desc: t('admin_desc_requests') },
          { to: '/admin/catalogue', icon: '📚', title: t('admin_nav_catalogue'), desc: t('admin_desc_catalogue') },
          { to: '/admin/routing', icon: '🔀', title: t('admin_nav_routing'), desc: t('admin_desc_routing') },
          { to: '/admin/team', icon: '👥', title: t('admin_nav_team'), desc: t('admin_desc_team') },
          { to: '/admin/analytics', icon: '📊', title: t('admin_nav_analytics'), desc: t('admin_desc_analytics') },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-[#1A3C34]/20 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{item.icon}</span>
              <h2 className="font-semibold text-[#1A3C34] group-hover:underline">{item.title}</h2>
            </div>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
