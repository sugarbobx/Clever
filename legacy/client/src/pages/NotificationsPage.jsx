import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';
import { SkeletonLine } from '../components/Skeleton';

function timeAgo(dateStr, t) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('time_just_now');
  if (m < 60) return t('time_minutes_ago', { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time_hours_ago', { h });
  return t('time_days_ago', { d: Math.floor(h / 24) });
}

function getDateBucket(dateStr) {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return 'this_week';
  return 'older';
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useT();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    api.get('/notifications')
      .then(r => setNotifications(r.data))
      .catch(() => setFetchError(t('notif_load_error')))
      .finally(() => setLoading(false));
  }, []);

  async function markAll() {
    setActionError('');
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {
      setActionError(t('notif_mark_error'));
      setTimeout(() => setActionError(''), 3000);
    }
  }

  async function handleClick(n) {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}/read`);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x));
      } catch { /* non-blocking — still navigate */ }
    }
    if (n.request_id) {
      const role = user?.role;
      if (role === 'super_admin' || role === 'root_admin') navigate(`/admin/requests/${n.request_id}`);
      else if (role === 'agent' || role === 'admin') navigate(`/agent/requests/${n.request_id}`);
      else navigate(`/requests/${n.request_id}`);
    }
  }

  const unread = notifications.filter(n => !n.is_read).length;

  const buckets = ['today', 'yesterday', 'this_week', 'older'];
  const bucketLabel = { today: t('notif_today'), yesterday: t('notif_yesterday'), this_week: t('notif_this_week'), older: t('notif_older') };
  const grouped = buckets.reduce((acc, b) => { acc[b] = notifications.filter(n => getDateBucket(n.created_at) === b); return acc; }, {});

  function NotifRow({ n }) {
    return (
      <button onClick={() => handleClick(n)}
        className={`w-full text-left px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex gap-4 ${!n.is_read ? 'bg-green-50/40' : ''}`}>
        <div className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ background: n.is_read ? '#D1D5DB' : '#1A3C34' }} />
        <div className="flex-1">
          <p className={`text-sm ${!n.is_read ? 'font-semibold text-[#1C1C1C]' : 'text-gray-600'}`}>{n.title}</p>
          <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
          <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at, t)}</p>
        </div>
      </button>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('notif_back')}
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('notif_title')}</h1>
        {unread > 0 && (
          <button onClick={markAll} className="text-sm text-[#C9A03A] hover:underline font-medium">
            {t('notif_mark_all')}
          </button>
        )}
      </div>

      {fetchError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{fetchError}</div>
      )}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{actionError}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-200 mt-2 shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonLine w="w-2/3" h="h-3" />
                <SkeletonLine w="w-full" h="h-3" />
                <SkeletonLine w="w-16" h="h-2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {notifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
              <p className="text-3xl mb-3">🔔</p>
              <p className="text-sm">{t('notif_none')}</p>
            </div>
          ) : (
            buckets.map(bucket => {
              const items = grouped[bucket];
              if (!items.length) return null;
              return (
                <div key={bucket} className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{bucketLabel[bucket]}</p>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {items.map(n => <NotifRow key={n.id} n={n} />)}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
