import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { getRequest, cancelRequest } from '../services/requestService';
import { useT, useLang } from '../context/LanguageContext';
import StatusBadge from '../components/StatusBadge';
import { SkeletonLine } from '../components/Skeleton';
import MessagePanel from '../components/MessagePanel';

const STATUS_INDEX = {
  'Pending': 0, 'En attente': 0,
  'In Progress': 1, 'En cours': 1,
  'Delivered': 2, 'Livré': 2,
};

function StepTracker({ status, t }) {
  const steps = [
    { label: t('status_pending') },
    { label: t('status_in_progress') },
    { label: t('status_delivered') },
  ];
  if (status === 'Cancelled' || status === 'Rejeté') {
    return (
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm">✕</span>
        <span className="text-sm font-medium text-red-600">
          {status === 'Rejeté' ? t('req_rejected_label') : t('req_cancelled_label')}
        </span>
      </div>
    );
  }
  const current = STATUS_INDEX[status] ?? 0;
  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
              ${i < current ? 'bg-[#2F855A] text-white' : i === current ? 'bg-[#1A3C34] text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium text-center ${i === current ? 'text-[#1A3C34]' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 sm:w-24 h-0.5 mx-1 -mt-4 ${i < current ? 'bg-[#2F855A]' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1.5">
      <span className="text-sm text-gray-400 sm:w-44 shrink-0">{label}</span>
      <span className="text-sm font-medium text-[#1C1C1C]">{value}</span>
    </div>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const { lang } = useLang();
  const [tick, setTick] = useState(0);
  const [request, setRequest] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(v => v + 1), 60000);
    return () => clearInterval(interval);
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    getRequest(id)
      .then(res => setRequest(res.data))
      .catch(err => {
        if (err.response?.status === 403) setError(t('req_access_denied'));
        else if (err.response?.status === 404) setError(t('req_not_found'));
        else setError(t('req_load_error'));
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!window.confirm(t('req_cancel_confirm'))) return;
    setCancelling(true); setCancelError('');
    try {
      await cancelRequest(id);
      setRequest(prev => ({ ...prev, status: 'Cancelled' }));
    } catch (err) {
      setCancelError(err.response?.data?.message || t('error_generic'));
    } finally { setCancelling(false); }
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
      <SkeletonLine w="w-32" h="h-3" />
      <SkeletonLine w="w-64" h="h-7" />
      <SkeletonLine w="w-40" h="h-3" />
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3 mt-4">
        {Array(4).fill(0).map((_, i) => <SkeletonLine key={i} w={i % 2 ? 'w-2/3' : 'w-full'} />)}
      </div>
    </div>
  );

  if (error) return <div className="max-w-2xl mx-auto px-4 py-10 text-red-600 text-sm">{error}</div>;

  const deliverables = request.files?.filter(f => f.file_type === 'deliverable') || [];
  const isDelivered = request.status === 'Livré' || request.status === 'Delivered';
  const isPending = request.status === 'Pending';
  const backTo = location.state?.from || '/dashboard';
  const backLabel = backTo === '/requests' ? t('req_back_list') : t('req_back_dashboard');

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {backLabel}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{request.document_type}</h1>
          <p className="text-sm text-gray-400 mt-1">{request.reference_number}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {request.priority === 'Urgent' && (
            <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">Urgent</span>
          )}
          <StatusBadge status={request.status} />
        </div>
      </div>

      {/* Progress tracker */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <h2 className="font-semibold text-[#1A3C34] mb-4 text-sm">{t('req_progress')}</h2>
        <StepTracker status={request.status} t={t} />
      </div>

      {fileError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{fileError}</div>
      )}

      {/* Delivered: download section */}
      {isDelivered && deliverables.length > 0 && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-6 mb-4">
          <h2 className="font-semibold text-green-800 mb-3">{t('req_doc_ready')}</h2>
          <div className="space-y-2">
            {deliverables.map(f => (
              <div key={f.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-green-100">
                <span className="text-sm font-medium text-[#1C1C1C] flex items-center gap-2">
                  <span>📄</span> {f.original_name}
                </span>
                <button onClick={async () => {
                  setFileError('');
                  try {
                    const token = localStorage.getItem('token');
                    const r = await fetch(`/api/files/${f.id}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (!r.ok) throw new Error();
                    downloadBlob(await r.blob(), f.original_name);
                  } catch { setFileError(t('req_file_error')); }
                }}
                  className="text-sm bg-[#2F855A] text-white rounded-md px-4 py-1.5 hover:bg-[#276749] transition-colors">
                  {t('req_download')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice — only shown when payment was made */}
      {isDelivered && request.payment_status === 'paid' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#1C1C1C]">{t('req_invoice')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('req_invoice_desc')}</p>
          </div>
          <button
            onClick={async () => {
              setFileError('');
              try {
                const token = localStorage.getItem('token');
                const r = await fetch(`/api/requests/${request.id}/invoice`, { headers: { Authorization: `Bearer ${token}` } });
                if (!r.ok) throw new Error();
                downloadBlob(await r.blob(), `facture-${request.reference_number}.pdf`);
              } catch { setFileError(t('req_invoice_error')); }
            }}
            className="shrink-0 border border-[#C9A03A] text-[#C9A03A] rounded-md px-4 py-2 text-sm font-medium hover:bg-[#C9A03A] hover:text-white transition-colors">
            {t('req_invoice_btn')}
          </button>
        </div>
      )}

      {/* Request summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <h2 className="font-semibold text-[#1A3C34] mb-3 text-sm">{t('req_details')}</h2>
        <div className="divide-y divide-gray-50">
          <InfoRow label={t('req_doc_type')} value={request.document_type} />
          <InfoRow label={t('req_full_name')} value={request.full_name} />
          <InfoRow label={t('req_dob')} value={request.date_of_birth && new Date(request.date_of_birth).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')} />
          <InfoRow label={t('req_id')} value={request.national_id_number} />
          <InfoRow label={t('req_phone')} value={request.phone} />
          <InfoRow label={t('req_address')} value={request.address} />
          <InfoRow label={t('req_payment')} value={request.payment_status === 'paid' ? t('req_paid') : t('req_unpaid')} />
          {request.assigned_agent_name && <InfoRow label={t('req_agent')} value={request.assigned_agent_name} />}
          <InfoRow label={t('req_submitted')} value={new Date(request.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} />
          {request.sla_deadline && (
            <InfoRow label={t('req_deadline')} value={new Date(request.sla_deadline).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          )}
        </div>
      </div>

      <div className="mb-4">
        <MessagePanel requestId={id} />
      </div>

      {/* Re-submit */}
      {(isDelivered || request.status === 'Rejeté') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 no-print">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#1C1C1C]">{t('req_resubmit')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('req_resubmit_desc')}</p>
            </div>
            <button
              onClick={() => navigate('/dashboard', { state: { openModal: true, preselectId: request.document_catalogue_id } })}
              className="shrink-0 border border-[#1A3C34] text-[#1A3C34] rounded-md px-4 py-2 text-sm font-medium hover:bg-[#1A3C34] hover:text-white transition-colors">
              {t('req_new_request')}
            </button>
          </div>
        </div>
      )}

      {/* Cancel */}
      {isPending && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="font-semibold text-[#1C1C1C] mb-2 text-sm">{t('req_cancel_title')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('req_cancel_desc')}</p>
          {cancelError && <p className="text-sm text-red-600 mb-3">{cancelError}</p>}
          <button onClick={handleCancel} disabled={cancelling}
            className="border border-red-400 text-red-600 rounded-md px-6 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60">
            {cancelling ? t('req_cancelling') : t('req_cancel_btn')}
          </button>
        </div>
      )}

      {/* Activity timeline */}
      {request.logs?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-[#1A3C34] mb-4 text-sm">{t('req_activity')}</h2>
          <ol className="relative border-l-2 border-gray-100 ml-2 space-y-5">
            {[...request.logs].reverse().map(log => (
              <li key={log.id} className="ml-5">
                <div className="absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white bg-[#1A3C34]" />
                <p className="text-xs text-gray-400 mb-0.5">
                  {new Date(log.created_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-[#1C1C1C]">
                  {t('req_status_updated')} <span className="font-semibold">{log.new_status}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
