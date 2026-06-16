import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useT } from '../../context/LanguageContext';
import StatusBadge from '../../components/StatusBadge';

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

export default function AdminManageRequest() {
  const { id } = useParams();
  const t = useT();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [agents, setAgents] = useState([]);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  async function load() {
    try {
      const [rRes, aRes] = await Promise.all([api.get(`/requests/${id}`), api.get('/admin/team')]);
      setReq(rRes.data);
      setStatus(rRes.data.status);
      setNote(rRes.data.agent_note || '');
      setAssignedAgentId(String(rRes.data.assigned_agent_id || rRes.data.assigned_to || ''));
      setAgents(aRes.data);
    } catch (err) {
      setLoadError(err.response?.status === 404
        ? t('admin_manage_err_404')
        : t('admin_manage_err_other'));
    }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function handleSave() {
    setSaving(true); setMsg('');
    try {
      const tasks = [api.patch(`/requests/${id}/status`, { status })];
      if (note !== req.agent_note) tasks.push(api.patch(`/requests/${id}/agent-note`, { note }));
      if (assignedAgentId && assignedAgentId !== String(req.assigned_agent_id || req.assigned_to || '')) {
        tasks.push(api.patch(`/requests/${id}/assign`, { agent_id: Number(assignedAgentId) }));
      }
      await Promise.all(tasks);
      setMsg('Mis à jour avec succès.');
      await load();
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Erreur lors de la mise à jour.'); }
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
      setMsg('Document livré avec succès.');
      await load();
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Erreur lors de l\'envoi du livrable.'); }
    finally { setUploading(false); }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10 text-gray-400 text-sm">{t('loading')}</div>;
  if (!req) return <div className="max-w-3xl mx-auto px-4 py-10 text-red-600 text-sm">{loadError || t('admin_manage_err_404')}</div>;

  const company = req.company;
  const isDelivered = req.status === 'Livré' || req.status === 'Delivered';
  const deliverables = req.files?.filter(f => f.file_type === 'deliverable') || [];
  const clientFiles = req.files?.filter(f => f.file_type !== 'deliverable') || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/admin/requests" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('admin_manage_back')}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{req.document_type}</h1>
          <p className="text-sm text-gray-400 mt-1">{req.reference_number}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-[#1A3C34] mb-3 text-sm uppercase tracking-wide">{t('admin_manage_client')}</h2>
          <InfoRow label={t('profile_full_name')} value={req.client_name} />
          <InfoRow label={t('profile_email')} value={req.client_email} />
          <InfoRow label={t('profile_phone')} value={req.client_phone} />
          {req.date_of_birth && <InfoRow label={t('req_dob')} value={new Date(req.date_of_birth).toLocaleDateString('fr-FR')} />}
          {req.national_id_number && <InfoRow label={t('req_id')} value={req.national_id_number} />}
          <InfoRow label={t('req_submitted')} value={new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} />
          <InfoRow label={t('req_payment')} value={req.payment_status === 'paid' ? t('req_paid') : t('req_unpaid')} />
          {req.payment_reference && <InfoRow label="Réf. paiement" value={req.payment_reference} />}
        </div>

        {company && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-[#1A3C34] mb-3 text-sm uppercase tracking-wide">Entreprise</h2>
            <InfoRow label="Raison sociale" value={company.business_name} />
            <InfoRow label="Forme juridique" value={company.legal_form} />
            <InfoRow label="RCCM" value={company.rccm_number} />
            <InfoRow label="NIU" value={company.niu_entreprise} />
            <InfoRow label="Secteur" value={company.sector} />
            <InfoRow label="Régime fiscal" value={company.tax_regime} />
          </div>
        )}

        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${!company ? '' : 'md:col-span-2'}`}>
          <h2 className="font-semibold text-[#1A3C34] mb-3 text-sm uppercase tracking-wide">Documents soumis</h2>
          {clientFiles.length > 0 ? (
            <div className="space-y-2">
              {clientFiles.map(f => (
                <button key={f.id} onClick={() => downloadFile(f.id, f.original_name)}
                  className="flex items-center gap-2 text-sm text-[#1A3C34] hover:underline w-full text-left">
                  <span>📄</span><span>{f.original_name}</span>
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">Aucun document soumis.</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6 space-y-4">
        <h2 className="font-semibold text-[#1A3C34] text-sm uppercase tracking-wide">Gestion</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm">
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Agent assigné</label>
            <select value={assignedAgentId} onChange={e => setAssignedAgentId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm">
              <option value="">Non assigné</option>
              {agents.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Note interne</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Note visible uniquement par l'équipe…"
            className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm resize-none" />
        </div>

        {msg && <p className={`text-sm ${msg.includes('Erreur') ? 'text-red-600' : 'text-[#2F855A]'}`}>{msg}</p>}

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {!isDelivered && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6">
          <h2 className="font-semibold text-[#1A3C34] mb-2 text-sm uppercase tracking-wide">Livrer le document</h2>
          <p className="text-sm text-gray-500 mb-4">Uploadez le document officiel. Cette action changera le statut en "Livré".</p>
          <input ref={fileRef} type="file" className="hidden" onChange={handleDeliverable} />
          <button onClick={() => fileRef.current.click()} disabled={uploading}
            className="bg-[#C9A03A] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#B08A2E] disabled:opacity-60 transition-colors">
            {uploading ? 'Envoi…' : '📤 Uploader le livrable'}
          </button>
        </div>
      )}

      {isDelivered && deliverables.length > 0 && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5 mt-6">
          <h2 className="font-semibold text-green-800 mb-2 text-sm uppercase tracking-wide">Document livré</h2>
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
