import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'À l\'instant';
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  // Browser tab badge
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Clever` : 'Clever';
  }, [unread]);

  // SSE for real-time unread count with exponential-backoff reconnect
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let es = null;
    let retryDelay = 2000;
    let retryTimer = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
      es.onmessage = (e) => {
        retryDelay = 2000;
        try {
          const data = JSON.parse(e.data);
          if (typeof data.count === 'number') setUnread(data.count);
        } catch {}
      };
      es.onerror = () => {
        es.close();
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      };
    }

    connect();
    return () => {
      destroyed = true;
      clearTimeout(retryTimer);
      if (es) es.close();
    };
  }, []);

  async function fetchNotifications() {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch {}
  }

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnread(0);
    try { await api.patch('/notifications/read-all'); }
    catch { fetchNotifications(); }
  }

  async function handleNotifClick(n) {
    if (!n.is_read) {
      await api.patch(`/notifications/${n.id}/read`);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x));
      setUnread(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
    if (n.request_id) {
      const role = user?.role;
      if (role === 'super_admin' || role === 'root_admin') navigate(`/admin/requests/${n.request_id}`);
      else if (role === 'agent' || role === 'admin') navigate(`/agent/requests/${n.request_id}`);
      else navigate(`/requests/${n.request_id}`);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-[#1A3C34] text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#C9A03A] hover:underline font-medium">
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex gap-3 ${!n.is_read ? 'bg-green-50/50' : ''}`}
                >
                  <div className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: n.is_read ? '#D1D5DB' : '#1A3C34' }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold text-[#1C1C1C]' : 'text-gray-600'}`}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 text-center">
            <button onClick={() => { setOpen(false); navigate('/notifications'); }} className="text-xs text-[#1A3C34] font-medium hover:underline">
              Voir toutes les notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
