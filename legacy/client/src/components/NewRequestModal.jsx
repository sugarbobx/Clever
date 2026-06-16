import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';
import { getCatalogue } from '../services/catalogueService';
import { createRequest } from '../services/requestService';

function StepDots({ step }) {
  return (
    <div className="flex justify-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div key={s} className={`w-2.5 h-2.5 rounded-full transition-colors ${s === step ? 'bg-[#1A3C34]' : s < step ? 'bg-[#2F855A]' : 'bg-gray-200'}`} />
      ))}
    </div>
  );
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — matches server limit

function FileDropzone({ label, file, onFile, onRemove }) {
  const t = useT();
  const [sizeError, setSizeError] = useState('');
  const onDrop = useCallback(accepted => {
    setSizeError('');
    if (accepted[0]) onFile(accepted[0]);
  }, [onFile]);
  const onDropRejected = useCallback(rejected => {
    const code = rejected[0]?.errors?.[0]?.code;
    if (code === 'file-too-large') setSizeError(t('modal_too_large'));
    else if (code === 'file-invalid-type') setSizeError(t('modal_invalid_type'));
    else setSizeError(t('modal_rejected'));
  }, [t]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: 1,
    multiple: false,
    maxSize: MAX_FILE_SIZE,
  });

  if (file) {
    return (
      <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-green-600 text-lg">✓</span>
          <div>
            <p className="text-sm font-medium text-[#1C1C1C]">{label}</p>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{file.name}</p>
          </div>
        </div>
        <button onClick={onRemove} className="text-xs text-red-500 hover:underline shrink-0">{t('modal_remove')}</button>
      </div>
    );
  }

  return (
    <div>
      <div {...getRootProps()}
        className={`border-2 border-dashed rounded-lg px-4 py-5 cursor-pointer transition-colors text-center
          ${isDragActive ? 'border-[#1A3C34] bg-[#1A3C34]/5' : 'border-gray-200 hover:border-[#1A3C34]/50 hover:bg-gray-50'}`}>
        <input {...getInputProps()} />
        <p className="text-sm font-medium text-[#1C1C1C] mb-0.5">{label}</p>
        <p className="text-xs text-gray-400">
          {isDragActive ? t('modal_drop_active') : t('modal_drop_hint')}
        </p>
        <p className="text-xs text-gray-300 mt-1">{t('modal_drop_formats')}</p>
      </div>
      {sizeError && <p className="text-xs text-red-600 mt-1">{sizeError}</p>}
    </div>
  );
}

export default function NewRequestModal({ onClose, onSuccess, preselectId = null }) {
  const { user } = useAuth();
  const t = useT();
  const [step, setStep] = useState(1);
  const [catalogue, setCatalogue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [uploads, setUploads] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('MTN');
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [catalogueError, setCatalogueError] = useState('');

  useEffect(() => {
    getCatalogue(user?.account_type === 'entreprise' ? 'A2' : 'A1')
      .then(r => {
        setCatalogue(r.data);
        if (preselectId) {
          const match = r.data.find(d => d.id === preselectId);
          if (match) { setSelected(match); setStep(2); }
        }
      })
      .catch(() => setCatalogueError(t('modal_catalogue_error')));
  }, [user, preselectId]);

  const requiredUploads = selected ? JSON.parse(selected.required_uploads || '[]') : [];
  const allUploaded = requiredUploads.every(label => uploads[label]);

  function handleFile(label, file) {
    setUploads(prev => ({ ...prev, [label]: file }));
  }

  function removeFile(label) {
    setUploads(prev => { const n = { ...prev }; delete n[label]; return n; });
  }

  async function handlePay() {
    if (!phone) { setError('Veuillez entrer votre numéro de téléphone.'); return; }
    setError('');
    setPaying(true);
    await new Promise(r => setTimeout(r, 2000));
    const ref = `PAY-${Date.now()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    setPayRef(ref);
    setPaid(true);
    setPaying(false);
    submitRequest(ref);
  }

  async function submitRequest(ref) {
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('document_catalogue_id', selected.id);
      fd.append('payment_reference', ref);
      Object.values(uploads).forEach(file => fd.append('files', file));
      const res = await createRequest(fd);
      onSuccess(res.data.reference_number);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission.');
      setPaid(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={e => {
      if (e.target !== e.currentTarget) return;
      const hasProgress = selected !== null || Object.keys(uploads).length > 0;
      if (hasProgress && !window.confirm('Fermer la fenêtre ? Votre progression sera perdue.')) return;
      onClose();
    }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#1A3C34]">{t('modal_title')}</h2>
          <button onClick={() => {
            const hasProgress = selected !== null || Object.keys(uploads).length > 0;
            if (hasProgress && !window.confirm('Fermer la fenêtre ? Votre progression sera perdue.')) return;
            onClose();
          }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6">
          <StepDots step={step} />

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-[#C53030]">{error}</div>}

          {/* Step 1 — Choose document */}
          {step === 1 && (
            <div>
              <h3 className="font-semibold text-[#1A3C34] mb-1">{t('modal_step1_title')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('modal_step1_desc')}</p>
              {catalogueError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{catalogueError}</div>}
              <div className="space-y-3">
                {catalogue.map(doc => {
                  const isNew = doc.created_at && (Date.now() - new Date(doc.created_at).getTime()) < 7 * 24 * 3600 * 1000;
                  return (
                  <button key={doc.id} onClick={() => setSelected(doc)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all
                      ${selected?.id === doc.id ? 'border-[#1A3C34] bg-[#1A3C34]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[#1C1C1C] text-sm">{doc.label}</p>
                          {isNew && <span className="text-xs bg-[#C9A03A] text-white px-1.5 py-0.5 rounded-full font-semibold leading-none">Nouveau</span>}
                        </div>
                        {doc.description && <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>}
                        {JSON.parse(doc.required_uploads || '[]').length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Documents requis: {JSON.parse(doc.required_uploads).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 font-bold text-[#C9A03A] text-sm whitespace-nowrap">{doc.price_xaf.toLocaleString()} XAF</span>
                    </div>
                  </button>
                );})}
              </div>
              <div className="flex justify-end mt-6">
                <button disabled={!selected} onClick={() => setStep(2)}
                  className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-40 transition-colors">
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Upload documents (drag-and-drop) */}
          {step === 2 && (
            <div>
              <h3 className="font-semibold text-[#1A3C34] mb-1">Documents requis</h3>
              <p className="text-sm text-gray-500 mb-4">Glissez-déposez ou cliquez pour sélectionner chaque document.</p>
              <div className="space-y-3">
                {requiredUploads.map(label => (
                  <FileDropzone
                    key={label}
                    label={label}
                    file={uploads[label]}
                    onFile={file => handleFile(label, file)}
                    onRemove={() => removeFile(label)}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="border border-gray-300 text-gray-600 rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-50">← Retour</button>
                <button disabled={!allUploaded} onClick={() => setStep(3)}
                  className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-40 transition-colors">
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Payment */}
          {step === 3 && (
            <div>
              <h3 className="font-semibold text-[#1A3C34] mb-4">Paiement</h3>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-400 mb-1">Document sélectionné</p>
                <p className="font-medium text-[#1C1C1C] text-sm">{selected?.label}</p>
                <p className="text-xl font-bold text-[#C9A03A] mt-2">{selected?.price_xaf.toLocaleString()} XAF</p>
              </div>

              {paid ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-3">✅</p>
                  <p className="font-semibold text-green-700">Paiement confirmé !</p>
                  <p className="text-xs text-gray-400 mt-1">Réf: {payRef}</p>
                  {submitting && <p className="text-sm text-gray-500 mt-3">Soumission en cours…</p>}
                </div>
              ) : paying ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-[#1A3C34] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-600">En attente de confirmation sur votre téléphone…</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 mb-4">
                    {['MTN', 'Orange'].map(op => (
                      <button key={op} onClick={() => setPaymentMethod(op)}
                        className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all
                          ${paymentMethod === op ? (op === 'MTN' ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : 'border-orange-400 bg-orange-50 text-orange-700') : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        {op === 'MTN' ? '🟡 MTN Mobile Money' : '🟠 Orange Money'}
                      </button>
                    ))}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Numéro de téléphone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX"
                      className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm" />
                  </div>
                  <div className="flex justify-between">
                    <button onClick={() => setStep(2)} className="border border-gray-300 text-gray-600 rounded-md px-5 py-2 text-sm font-medium hover:bg-gray-50">← Retour</button>
                    <button onClick={handlePay}
                      className="bg-[#C9A03A] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#B08A2E] transition-colors">
                      Payer {selected?.price_xaf.toLocaleString()} XAF
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
