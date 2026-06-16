import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useT } from '../context/LanguageContext';

const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

function strength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function SecurityPage() {
  const t = useT();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState('idle'); // idle | setup | verify
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpMsg, setTotpMsg] = useState('');
  const [totpError, setTotpError] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(r => setTotpEnabled(!!r.data.totp_enabled)).catch(() => {});
  }, []);

  const score = strength(form.new_password);
  const bars = [
    score >= 1 ? '#C53030' : '#E5E7EB',
    score >= 2 ? '#C9A03A' : '#E5E7EB',
    score >= 3 ? '#2F855A' : '#E5E7EB',
    score >= 4 ? '#1A3C34' : '#E5E7EB',
  ];
  const label = ['', t('security_strength_1'), t('security_strength_2'), t('security_strength_3'), t('security_strength_4')][score] || '';

  async function handleSave(e) {
    e.preventDefault();
    if (form.new_password !== form.confirm) { setError(t('security_mismatch')); return; }
    if (form.new_password.length < 8) { setError(t('security_short')); return; }
    if (!/[A-Z]/.test(form.new_password) || !/[0-9]/.test(form.new_password)) { setError(t('security_weak')); return; }
    setSaving(true); setError(''); setMsg('');
    try {
      await api.post('/auth/change-password', { current_password: form.current_password, new_password: form.new_password });
      setMsg(t('security_updated'));
      setForm({ current_password: '', new_password: '', confirm: '' });
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setError(err.response?.data?.message || t('security_error')); }
    finally { setSaving(false); }
  }

  async function startSetup() {
    setTotpLoading(true); setTotpError('');
    try {
      const res = await api.get('/auth/2fa/setup');
      setQrCode(res.data.qr_code);
      setSecret(res.data.secret);
      setSetupStep('verify');
    } catch { setTotpError(t('security_2fa_setup_error')); }
    finally { setTotpLoading(false); }
  }

  async function enableTotp() {
    if (!totpCode) return;
    setTotpLoading(true); setTotpError('');
    try {
      await api.post('/auth/2fa/enable', { code: totpCode });
      setTotpEnabled(true);
      setSetupStep('idle');
      setTotpCode('');
      setTotpMsg(t('security_2fa_enabled_msg'));
      setTimeout(() => setTotpMsg(''), 4000);
    } catch (err) { setTotpError(err.response?.data?.message || t('security_2fa_invalid')); }
    finally { setTotpLoading(false); }
  }

  async function disableTotp() {
    if (!window.confirm(t('security_2fa_confirm_disable'))) return;
    setTotpLoading(true); setTotpError('');
    try {
      await api.delete('/auth/2fa/disable');
      setTotpEnabled(false);
      setTotpMsg(t('security_2fa_disabled_msg'));
      setTimeout(() => setTotpMsg(''), 3000);
    } catch { setTotpError(t('security_2fa_disable_error')); }
    finally { setTotpLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('security_back')}
      </Link>
      <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight mb-8">{t('security_title')}</h1>

      {/* Password change */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">{t('security_change_pwd')}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('security_current')}</label>
            <input type="password" value={form.current_password} onChange={e => setForm(p => ({ ...p, current_password: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('security_new')}</label>
            <input type="password" value={form.new_password} onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))} className={inputCls} />
            {form.new_password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {bars.map((color, i) => <div key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: color }} />)}
                </div>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('security_confirm')}</label>
            <input type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} className={inputCls} />
          </div>
          {error && <p className="text-sm text-[#C53030]">{error}</p>}
          {msg && <p className="text-sm text-[#2F855A]">{msg}</p>}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
              {saving ? t('security_updating') : t('security_update')}
            </button>
          </div>
        </form>
      </div>

      {/* 2FA section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-[#1A3C34]">{t('security_2fa_title')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('security_2fa_desc')}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${totpEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {totpEnabled ? t('security_2fa_on') : t('security_2fa_off')}
          </span>
        </div>

        {totpMsg && <p className="text-sm text-[#2F855A] mb-3">{totpMsg}</p>}
        {totpError && <p className="text-sm text-[#C53030] mb-3">{totpError}</p>}

        {!totpEnabled && setupStep === 'idle' && (
          <button onClick={startSetup} disabled={totpLoading}
            className="bg-[#1A3C34] text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
            {totpLoading ? t('security_2fa_loading') : t('security_2fa_setup')}
          </button>
        )}

        {!totpEnabled && setupStep === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('security_2fa_scan')}</p>
            {qrCode && <img src={qrCode} alt="QR code 2FA" className="w-44 h-44 border border-gray-200 rounded-lg" />}
            <div>
              <p className="text-xs text-gray-400 mb-1">{t('security_2fa_manual')}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all flex-1">{secret}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(secret).then(() => {
                    setTotpMsg(t('security_2fa_copied'));
                    setTimeout(() => setTotpMsg(''), 2000);
                  })}
                  className="shrink-0 text-xs border border-gray-300 text-gray-600 rounded px-2 py-1 hover:bg-gray-100 transition-colors">
                  {t('security_2fa_copy')}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('security_2fa_code_label')}</label>
              <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('security_2fa_placeholder')} maxLength={6}
                className={`${inputCls} tracking-[0.3em] text-center text-lg`} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSetupStep('idle'); setTotpCode(''); setTotpError(''); }}
                className="border border-gray-300 text-gray-600 rounded-md px-4 py-2 text-sm hover:bg-gray-50">
                {t('cancel')}
              </button>
              <button onClick={enableTotp} disabled={totpCode.length !== 6 || totpLoading}
                className="bg-[#1A3C34] text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-[#122B25] disabled:opacity-60">
                {totpLoading ? t('security_2fa_verifying') : t('security_2fa_enable')}
              </button>
            </div>
          </div>
        )}

        {totpEnabled && (
          <button onClick={disableTotp} disabled={totpLoading}
            className="border border-red-300 text-red-600 rounded-md px-5 py-2.5 text-sm font-medium hover:bg-red-50 disabled:opacity-60">
            {totpLoading ? t('security_2fa_disabling') : t('security_2fa_disable')}
          </button>
        )}
      </div>
    </div>
  );
}
