import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useT, useLang } from '../../context/LanguageContext';
import MessagePanel from '../../components/MessagePanel';

function downloadFile(fileId, originalName) {
  const token = localStorage.getItem('token');
  fetch(`/api/files/${fileId}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = originalName; a.click();
      URL.revokeObjectURL(url);
    });
}

const STATUSES = ['Pending', 'En cours', 'Livré', 'Rejeté'];
const STATUS_LABELS = { Pending: 'En attente', 'En cours': 'En cours', Livré: 'Livré', Rejeté: 'Rejeté' };

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-[#1C1C1C] text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function AgentManageRequest() {
  const { id } = useParams();
  const location = useLocation();
  const t = useT();
  const { lang } = useLang();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  const backTab = location.state?.from || 'assigned';

  async function load() {
    try {
      const r = await api.get(`/requests/${id}`);
      setReq(r.data);
      setStatus(r.data.status);
      setNote(r.data.agent_note || '');
      setLoadError('');
    } catch {
      setLoadError(t('agent_req_load_error'));
    }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleStatusSave(); }
      else if (e.ctrlKey && e.shiftKey && e.key === 'U') { e.preventDefault(); fileRef.current?.click(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, note, req]);

  async function handleStatusSave() {
    if (!req) return;
    const statusChanged = status !== req.status;
    const noteChanged = note !== (req.agent_note || '');
    if (!statusChanged && !noteChanged) { setMsg(t('agent_req_no_change')); setTimeout(() => setMsg(''), 2000); return; }

    // Warn if setting to Livré without a deliverable
    if (statusChanged && status === 'Livré') {
      const deliverables = req.files?.filter(f => f.file_type === 'deliverable') || [];
      if (deliverables.length === 0 && !window.confirm(t('agent_req_warn_livré'))) return;
    }

    setSaving(true); setMsg('');
    try {
      const tasks = [];
      if (statusChanged) tasks.push(api.patch(`/requests/${id}/status`, { status }));
      if (noteChanged) tasks.push(api.patch(`/requests/${id}/agent-note`, { note }));
      await Promise.all(tasks);
      setMsg(t('agent_req_saved'));
      await load();
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg(t('agent_req_save_error')); }
    finally { setSaving(false); }
  }

  async function handleDeliverable(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('deliverable', file);
      await api.post(`/requests/${id}/deliverable`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg(t('agent_req_uploaded'));
      await load();
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg(t('agent_req_upload_error')); }
    finally { setUploading(false); }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10 text-gray-400 text-sm">{t('loading')}</div>;
  if (!req) return <div className="max-w-3xl mx-auto px-4 py-10 text-red-600 text-sm">{loadError || t('agent_req_not_found')}</div>;

  const company = req.company;
  const isDelivered = req.status === 'Livré' || req.status === 'Delivered';
  const deliverables = req.files?.filter(f => f.file_type === 'deliverable') || [];
  const clientFiles = req.files?.filter(f => f.file_type !== 'deliverable') || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/agent" state={{ tab: backTab }} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('agent_req_back')}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{req.document_type}</h1>
          <p className="text-sm text-gray-400 mt-1">{req.reference_number}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {req.priority === 'Urgent' && (
            <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">{t('agent_req_priority')}</span>
          )}
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            req.status === 'Livré' || req.status === 'Delivered' ? 'bg-green-100 text-green-700' :
            req.status === 'En cours' ? 'bg-blue-100 text-blue-700' :
            req.status === 'Rejeté' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
          }`}>{STATUS_LABELS[req.status] || req.status}</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1A3C34] mb-3 text-sm uppercase tracking-wide">{t('agent_req_client')}</h2>
          <InfoRow label={t('profile_full_name')} value={req.client_name} />
          <InfoRow label={t('profile_email')} value={req.client_email} />
          <InfoRow label={t('profile_phone')} value={req.client_phone} />
          {req.date_of_birth && <InfoRow label={t('agent_req_dob')} value={new Date(req.date_of_birth).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')} />}
          {req.national_id_number && <InfoRow label={t('agent_req_id')} value={req.national_id_number} />}
          <InfoRow label={t('agent_req_submitted')} value={new Date(req.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} />
        </div>

        {company && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-[#1A3C34] mb-3 text-sm uppercase tracking-wide">{t('agent_req_company')}</h2>
            <InfoRow label={t('company_business_name')} value={company.business_name} />
            <InfoRow label={t('company_legal_form')} value={company.legal_form} />
            <InfoRow label={t('company_rccm')} value={company.rccm_number} />
            <InfoRow label={t('company_niu')} value={company.niu_entreprise} />
            <InfoRow label={t('company_sector')} value={company.sector} />
            <InfoRow label={t('company_tax_regime')} value={company.tax_regime} />
          </div>
        )}

        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${!company ? 'md:col-span-1' : 'md:col-span-2'}`}>
          <h2 className="font-semibold text-[#1A3C34] mb-3 text-sm uppercase tracking-wide">{t('agent_req_docs')}</h2>
          {clientFiles.length > 0 ? (
            <div className="space-y-2">
              {clientFiles.map(f => (
                <button key={f.id} onClick={() => downloadFile(f.id, f.original_name)}
                  className="flex items-center gap-2 text-sm text-[#1A3C34] hover:underline w-full text-left">
                  <span className="text-base">📄</span><span>{f.original_name}</span>
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">{t('agent_req_no_docs')}</p>}
        </div>

        {req.sla_deadline && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-[#1A3C34] mb-3 text-sm uppercase tracking-wide">{t('agent_req_sla')}</h2>
            {(() => {
              const h = Math.floor((new Date(req.sla_deadline) - Date.now()) / 3600000);
              const color = h < 0 ? 'text-red-600' : h < 4 ? 'text-red-500' : h < 24 ? 'text-orange-500' : 'text-green-700';
              return (
                <div>
                  <p className="text-sm text-gray-500">{new Date(req.sla_deadline).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}</p>
                  <p className={`text-lg font-bold mt-1 ${color}`}>
                    {h < 0 ? t('agent_req_sla_expired') : h < 24 ? t('time_hours_left', { h }) : t('time_days_left', { d: Math.floor(h / 24) })}
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {!isDelivered && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6">
          <h2 className="font-semibold text-[#1A3C34] mb-4 text-sm uppercase tracking-wide">{t('agent_req_processing')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('agent_req_status')}</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('agent_req_note')}</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder={t('agent_req_note_ph')}
                className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm resize-none" />
            </div>
            {msg && <p className={`text-sm ${msg.includes('Erreur') || msg.includes('Failed') ? 'text-red-600' : 'text-[#2F855A]'}`}>{msg}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 hidden md:block">{t('agent_req_shortcut')} <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+S</kbd></span>
              <button onClick={handleStatusSave} disabled={saving}
                className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
                {saving ? t('agent_req_saving') : t('agent_req_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isDelivered && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6">
          <h2 className="font-semibold text-[#1A3C34] mb-2 text-sm uppercase tracking-wide">{t('agent_req_deliver')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('agent_req_deliver_desc')}</p>
          <input ref={fileRef} type="file" className="hidden" onChange={handleDeliverable} />
          <div className="flex items-center gap-4">
            <button onClick={() => fileRef.current.click()} disabled={uploading}
              className="bg-[#C9A03A] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#B08A2E] disabled:opacity-60 transition-colors">
              {uploading ? t('agent_req_uploading') : t('agent_req_upload')}
            </button>
            <span className="text-xs text-gray-400 hidden md:block">{t('agent_req_shortcut')} <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+Shift+U</kbd></span>
          </div>
          {msg && !saving && <p className={`text-sm mt-3 ${msg.includes('Erreur') || msg.includes('Failed') ? 'text-red-600' : 'text-[#2F855A]'}`}>{msg}</p>}
        </div>
      )}

      <div className="mt-6">
        <MessagePanel requestId={id} />
      </div>

      {req.logs?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6">
          <h2 className="font-semibold text-[#1A3C34] mb-4 text-sm uppercase tracking-wide">{t('agent_req_activity')}</h2>
          <ol className="relative border-l-2 border-gray-100 ml-2 space-y-4">
            {[...req.logs].reverse().map(log => (
              <li key={log.id} className="ml-5">
                <div className="absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white bg-[#1A3C34]" />
                <p className="text-xs text-gray-400 mb-0.5">
                  {new Date(log.created_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-[#1C1C1C]">{t('agent_req_status_changed')} <span className="font-semibold">{log.new_status}</span></p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {isDelivered && deliverables.length > 0 && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5 mt-6">
          <h2 className="font-semibold text-green-800 mb-2 text-sm uppercase tracking-wide">{t('agent_req_delivered_section')}</h2>
          <div className="space-y-2">
            {deliverables.map(f => (
              <button key={f.id} onClick={() => downloadFile(f.id, f.original_name)}
                className="inline-flex items-center gap-2 text-sm text-[#1A3C34] hover:underline font-medium">
                <span>📄</span> {f.original_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
