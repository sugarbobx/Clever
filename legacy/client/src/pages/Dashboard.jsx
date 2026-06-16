import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getRequests } from '../services/requestService';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import NewRequestModal from '../components/NewRequestModal';
import { SkeletonCard } from '../components/Skeleton';

function MiniRow({ r }) {
  const sla = r.sla_deadline ? new Date(r.sla_deadline) : null;
  const now = new Date();
  const hoursLeft = sla ? Math.floor((sla - now) / 3600000) : null;
  const slaColor = hoursLeft === null ? '' : hoursLeft < 4 ? 'text-red-600' : hoursLeft < 24 ? 'text-orange-500' : 'text-gray-400';

  return (
    <Link to={`/requests/${r.id}`}
      className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#1A3C34] group-hover:underline truncate">{r.document_type}</p>
        <p className="text-xs text-gray-400 mt-0.5">{r.reference_number}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {hoursLeft !== null && (
          <span className={`text-xs font-medium ${slaColor}`}>
            {hoursLeft < 0 ? 'Délai dépassé' : `${hoursLeft}h restantes`}
          </span>
        )}
        <StatusBadge status={r.status} />
      </div>
    </Link>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function LockedWing() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 opacity-50 grayscale pointer-events-none select-none relative overflow-hidden">
      <div className="absolute top-3 right-3">
        <span className="text-xs font-semibold bg-[#C9A03A] text-white px-2.5 py-1 rounded-full">Bientôt disponible</span>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📊</span>
        <h2 className="text-lg font-semibold text-[#1A3C34]">Comptabilité</h2>
      </div>
      <p className="text-sm text-gray-500 mb-8">Gestion comptable, notes de frais, et réconciliation bancaire.</p>
      <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-400">
        <span className="text-4xl">🔒</span>
        <p className="text-sm font-medium">Le module comptabilité sera disponible prochainement.</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const t = useT();
  const location = useLocation();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [preselectId, setPreselectId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const isEntreprise = user?.account_type === 'entreprise';

  useEffect(() => {
    const load = async () => {
      try {
        const [rRes] = await Promise.all([getRequests()]);
        setRequests(rRes.data);
        if (isEntreprise) {
          try {
            const cRes = await api.get('/auth/company-profile');
            setCompany(cRes.data);
          } catch { /* no company profile yet */ }
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, [isEntreprise]);

  // Handle navigation state: pre-open modal or show registration toast
  useEffect(() => {
    if (location.state?.openModal) {
      setShowModal(true);
      setPreselectId(location.state.preselectId || null);
    }
  }, []);

  // Onboarding banner: show once when user has no requests
  useEffect(() => {
    if (!loading && requests.length === 0 && !localStorage.getItem('clever_onboarding_seen')) {
      setShowOnboarding(true);
    }
  }, [loading, requests.length]);

  function dismissOnboarding() {
    localStorage.setItem('clever_onboarding_seen', '1');
    setShowOnboarding(false);
  }

  function handleSuccess(refNumber) {
    setShowModal(false);
    setPreselectId(null);
    toast(`Demande ${refNumber} soumise avec succès !`);
    getRequests().then(r => setRequests(r.data));
  }

  const pending = requests.filter(r => r.status === 'Pending').length;
  const inProgress = requests.filter(r => r.status === 'En cours' || r.status === 'In Progress').length;
  const delivered = requests.filter(r => r.status === 'Livré' || r.status === 'Delivered').length;
  const recent = requests.slice(0, 3);
  const ENTREPRISE_MAX = 10;
  const upcoming = requests.filter(r => r.sla_deadline && !['Livré','Delivered','Cancelled'].includes(r.status)).sort((a, b) => new Date(a.sla_deadline) - new Date(b.sla_deadline))[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {showModal && (
        <NewRequestModal
          preselectId={preselectId}
          onClose={() => { setShowModal(false); setPreselectId(null); }}
          onSuccess={handleSuccess}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">
          {t('dashboard_greeting')}, {user?.name?.split(' ')[0]} 👋
        </h1>
        {isEntreprise && company ? (
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">{company.business_name} — {company.legal_form}</p>
            {company.tax_regime && (
              <span className="text-xs bg-[#1A3C34]/10 text-[#1A3C34] font-medium px-2 py-0.5 rounded-full">{company.tax_regime}</span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-1">{t('dashboard_subtitle')}</p>
        )}
      </div>

      {/* Onboarding banner — shown once when user has no requests */}
      {showOnboarding && (
        <div className="bg-[#1A3C34] text-white rounded-2xl p-6 mb-8 relative overflow-hidden no-print">
          <button onClick={dismissOnboarding}
            className="absolute top-4 right-4 text-white/60 hover:text-white text-xl leading-none">✕</button>
          <h2 className="font-semibold text-lg mb-4">Bienvenue ! Voici comment ça marche 👋</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { n: '1', title: 'Choisissez', desc: 'Sélectionnez le document fiscal dont vous avez besoin.' },
              { n: '2', title: 'Déposez', desc: 'Envoyez vos pièces justificatives en quelques clics.' },
              { n: '3', title: 'Recevez', desc: 'Votre document est traité et livré sous 48h.' },
            ].map(s => (
              <div key={s.n} className="flex gap-3">
                <span className="text-[#C9A03A] font-bold text-lg shrink-0">{s.n}.</span>
                <div>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { dismissOnboarding(); setShowModal(true); }}
            className="bg-[#C9A03A] text-white rounded-md px-6 py-2.5 text-sm font-semibold hover:bg-[#B08A2E] transition-colors">
            Faire ma première demande →
          </button>
        </div>
      )}

      {/* Stats row — 4 cards for entreprise, 3 for particulier */}
      <div className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
      {!loading && (
        <div className={`grid gap-4 mb-8 ${isEntreprise ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
          <StatCard label="En attente" value={pending} color="text-[#C9A03A]" />
          <StatCard label="En cours" value={inProgress} color="text-blue-600" />
          <StatCard label="Livrées" value={delivered} color="text-[#2F855A]" />
          {isEntreprise && (
            <StatCard label="Prochaine échéance"
              value={upcoming ? new Date(upcoming.sla_deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
              color="text-[#C9A03A]" />
          )}
        </div>
      )}
      </div>

      {/* Two wings */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Wing 1 — FISCALITÉ */}
        <div className="bg-white rounded-xl border-l-4 border-l-[#1A3C34] border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💼</span>
              <h2 className="text-lg font-semibold text-[#1A3C34]">Fiscalité</h2>
            </div>
            <span className="text-xs font-semibold bg-green-100 text-[#1A3C34] px-2.5 py-1 rounded-full">Actif</span>
          </div>
          <p className="text-sm text-gray-500 mb-5 ml-10">Obtenez vos documents fiscaux officiels.</p>

          <button onClick={() => setShowModal(true)}
            className="w-full bg-[#C9A03A] text-white rounded-md px-5 py-2.5 font-medium hover:bg-[#B08A2E] transition-colors mb-5 text-sm">
            + Nouvelle Demande
          </button>

          {loading && <div className="space-y-2 px-1"><SkeletonCard /><SkeletonCard /></div>}

          {!loading && requests.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm mb-2">{t('dashboard_no_requests')}</p>
            </div>
          )}

          {!loading && requests.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-4">
                {isEntreprise ? t('dashboard_all_requests') : t('dashboard_recent')}
              </p>
              <div className="space-y-1">
                {(isEntreprise ? requests.slice(0, ENTREPRISE_MAX) : recent).map(r => <MiniRow key={r.id} r={r} />)}
              </div>
              {((!isEntreprise && requests.length > 3) || (isEntreprise && requests.length > ENTREPRISE_MAX)) && (
                <div className="mt-4 pt-4 border-t border-gray-100 px-4">
                  <Link to="/requests" className="text-sm text-[#1A3C34] font-medium hover:underline">
                    {t('dashboard_view_all', { count: requests.length })}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wing 2 — COMPTABILITÉ (locked) */}
        <LockedWing />
      </div>
    </div>
  );
}
