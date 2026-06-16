import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useT } from '../../context/LanguageContext';

const ACCOUNT_TYPES = ['A1', 'A2', 'both'];
const EMPTY = { code: '', label: '', description: '', available_for: 'A1', price_xaf: '', required_uploads: '' };

function DocCard({ doc, onEdit, onToggle }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${!doc.is_active ? 'opacity-60' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-[#1A3C34]">{doc.label}</p>
          <p className="text-xs text-gray-400 font-mono">{doc.code}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${doc.available_for === 'A1' ? 'bg-blue-100 text-blue-700' : doc.available_for === 'A2' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
            {doc.available_for}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${doc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {doc.is_active ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{doc.description}</p>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#C9A03A]">{doc.price_xaf?.toLocaleString('fr-FR')} XAF</p>
        <div className="flex gap-2">
          <button onClick={() => onEdit(doc)}
            className="text-xs border border-[#1A3C34] text-[#1A3C34] px-3 py-1.5 rounded-md hover:bg-[#1A3C34] hover:text-white transition-colors">
            Modifier
          </button>
          <button onClick={() => onToggle(doc)}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
            {doc.is_active ? 'Désactiver' : 'Activer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DocForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code || !form.label || !form.price_xaf) { setErr('Code, libellé et prix sont requis.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        price_xaf: Number(form.price_xaf),
        required_uploads: form.required_uploads || '[]',
      };
      if (initial?.id) await api.patch(`/admin/catalogue/${initial.id}`, payload);
      else await api.post('/admin/catalogue', payload);
      onSave();
    } catch (e) { setErr(e.response?.data?.message || 'Erreur lors de la sauvegarde.'); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#1A3C34]/20 shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-[#1A3C34]">{initial?.id ? 'Modifier le document' : 'Nouveau document'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Code <span className="text-red-500">*</span></label>
          <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} className={inputCls} placeholder="NIU_PARTICULIER" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Disponible pour <span className="text-red-500">*</span></label>
          <select value={form.available_for} onChange={e => set('available_for', e.target.value)} className={inputCls}>
            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Libellé <span className="text-red-500">*</span></label>
        <input value={form.label} onChange={e => set('label', e.target.value)} className={inputCls} placeholder="NIU Particulier" />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Prix (XAF) <span className="text-red-500">*</span></label>
          <input type="number" value={form.price_xaf} onChange={e => set('price_xaf', e.target.value)} className={inputCls} min="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Documents requis (JSON)</label>
          <input value={form.required_uploads} onChange={e => set('required_uploads', e.target.value)} className={inputCls} placeholder='["CNI", "Photo"]' />
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="border border-gray-300 text-gray-600 rounded-md px-5 py-2 text-sm hover:bg-gray-50">Annuler</button>
        <button type="submit" disabled={saving} className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  );
}

export default function CatalogueManager() {
  const t = useT();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toggleError, setToggleError] = useState('');

  async function load() {
    try {
      const r = await api.get('/admin/catalogue');
      setDocs(r.data);
      setLoadError('');
    } catch {
      setLoadError('Impossible de charger le catalogue. Veuillez réessayer.');
    }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(doc) {
    setToggleError('');
    try {
      await api.patch(`/admin/catalogue/${doc.id}/toggle`);
      await load();
    } catch {
      setToggleError('Impossible de modifier l\'état du document. Veuillez réessayer.');
      setTimeout(() => setToggleError(''), 3000);
    }
  }

  function handleSaved() { setEditing(null); setShowNew(false); load(); }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('cat_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{docs.length} document{docs.length !== 1 ? 's' : ''} configuré{docs.length !== 1 ? 's' : ''}.</p>
        </div>
        {!showNew && !editing && (
          <button onClick={() => setShowNew(true)}
            className="bg-[#C9A03A] text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#B08A2E] transition-colors">
            + Nouveau document
          </button>
        )}
      </div>

      {showNew && <div className="mb-6"><DocForm onSave={handleSaved} onCancel={() => setShowNew(false)} /></div>}

      {loadError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{loadError}</div>}
      {toggleError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{toggleError}</div>}
      {loading ? <p className="text-gray-400 text-sm">{t('loading')}</p> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {docs.map(doc => (
            editing?.id === doc.id
              ? <div key={doc.id} className="sm:col-span-2"><DocForm initial={editing} onSave={handleSaved} onCancel={() => setEditing(null)} /></div>
              : <DocCard key={doc.id} doc={doc} onEdit={setEditing} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
