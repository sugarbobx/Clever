import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';
import api from '../services/api';

export default function MessagePanel({ requestId }) {
  const { user } = useAuth();
  const t = useT();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef();

  useEffect(() => {
    api.get(`/requests/${requestId}/messages`)
      .then(r => setMessages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestId]);

  useEffect(() => {
    if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      const r = await api.post(`/requests/${requestId}/messages`, { content: text.trim() });
      setMessages(prev => [...prev, r.data]);
      setText('');
    } catch {
      setError(t('msg_send_error'));
    } finally {
      setSending(false);
    }
  }

  const isClient = user?.role === 'client';

  function isMine(m) {
    return isClient ? m.author_role === 'client' : m.author_role !== 'client';
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-semibold text-[#1A3C34] mb-4 text-sm uppercase tracking-wide">{t('msg_title')}</h2>

      {loading ? (
        <p className="text-sm text-gray-400 py-2">{t('msg_loading')}</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">{t('msg_none')}</p>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${isMine(m) ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                  isMine(m) ? 'bg-[#1A3C34] text-white' : 'bg-gray-100 text-[#1C1C1C]'
                }`}>
                  <p className={`text-xs font-semibold mb-0.5 ${isMine(m) ? 'text-white/70' : 'text-gray-500'}`}>
                    {m.author_name}
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  <p className={`text-xs mt-1 ${isMine(m) ? 'text-white/50' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('msg_ph')}
          maxLength={2000}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34]"
        />
        <button type="submit" disabled={sending || !text.trim()}
          className="bg-[#1A3C34] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#122B25] disabled:opacity-40 transition-colors">
          {sending ? '…' : t('send')}
        </button>
      </form>
    </div>
  );
}
