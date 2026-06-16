import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useT, useLang } from '../context/LanguageContext';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocCard({ doc, t, lang, onError }) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`/api/files/${doc.file_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = doc.original_name; a.click();
      URL.revokeObjectURL(url);
    } catch {
      onError(t('docs_file_error'));
    } finally {
      setDownloading(false);
    }
  }

  const ext = doc.original_name.split('.').pop().toUpperCase();
  const extColor = ext === 'PDF' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#1A3C34]/10 flex items-center justify-center shrink-0">
          <span className="text-2xl">📄</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#1C1C1C] text-sm truncate" title={doc.original_name}>
            {doc.original_name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{doc.document_type}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded font-mono ${extColor}`}>{ext}</span>
            {doc.size && <span className="text-xs text-gray-400">{formatBytes(doc.size)}</span>}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-50 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-400 space-y-0.5">
          <p>
            <span className="text-gray-500 font-medium">{t('docs_request')} : </span>
            <Link to={`/requests/${doc.request_id}`} className="text-[#1A3C34] hover:underline font-mono">
              {doc.reference_number}
            </Link>
          </p>
          <p>
            <span className="text-gray-500 font-medium">{t('docs_delivered_on')} : </span>
            {new Date(doc.delivered_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={download}
          disabled={downloading}
          className="shrink-0 bg-[#1A3C34] text-white rounded-md px-4 py-2 text-xs font-semibold hover:bg-[#122B25] disabled:opacity-60 transition-colors flex items-center gap-1.5">
          {downloading ? '…' : <><span>⬇</span> {t('docs_download')}</>}
        </button>
      </div>
    </div>
  );
}

export default function MyDocumentsPage() {
  const t = useT();
  const { lang } = useLang();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    api.get('/documents')
      .then(r => setDocuments(r.data))
      .catch(() => setLoadError(t('docs_load_error')))
      .finally(() => setLoading(false));
  }, []);

  function handleFileError(msg) {
    setFileError(msg);
    setTimeout(() => setFileError(''), 3000);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('docs_back')}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('docs_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('docs_subtitle')}</p>
      </div>

      {loadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{loadError}</div>
      )}
      {fileError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{fileError}</div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-36 animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
          <p className="text-5xl mb-4">📂</p>
          <h2 className="text-lg font-semibold text-[#1A3C34] mb-2">{t('docs_empty_title')}</h2>
          <p className="text-sm text-gray-400 mb-6">{t('docs_empty_desc')}</p>
          <Link to="/dashboard" className="inline-flex items-center text-sm text-[#1A3C34] font-medium hover:underline">
            {t('docs_make_request')}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-4 uppercase tracking-wide font-semibold">
            {documents.length} document{documents.length > 1 ? 's' : ''}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {documents.map(doc => (
              <DocCard key={doc.file_id} doc={doc} t={t} lang={lang} onError={handleFileError} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
