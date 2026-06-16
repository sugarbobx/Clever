import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { useState } from 'react';

const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

export default function RootProfile() {
  const { user, login, token } = useAuth();
  const t = useT();

  const profileSchema = yup.object({ name: yup.string().required(), phone: yup.string() });
  const pwdSchema = yup.object({
    current_password: yup.string().required(),
    new_password: yup.string().min(8).matches(/[A-Z]/, '1 uppercase required.').matches(/[0-9]/, '1 number required.').required(),
  });

  const [profileMsg, setProfileMsg]     = useState('');
  const [profileError, setProfileError] = useState('');
  const [pwdMsg, setPwdMsg]             = useState('');
  const [pwdError, setPwdError]         = useState('');

  const { register: regP, handleSubmit: handleP, formState: { errors: errP, isSubmitting: subP }, reset: resetP } = useForm({ resolver: yupResolver(profileSchema) });
  const { register: regW, handleSubmit: handleW, formState: { errors: errW, isSubmitting: subW }, reset: resetW } = useForm({ resolver: yupResolver(pwdSchema) });

  useEffect(() => {
    api.get('/auth/me').then(res => resetP({ name: res.data.name, phone: res.data.phone || '' }));
  }, []);

  async function onProfileSave(data) {
    setProfileMsg(''); setProfileError('');
    try {
      await api.patch('/auth/profile', data);
      login(token, user.role, data.name, user.account_type);
      setProfileMsg(t('root_profile_saved'));
    } catch (err) {
      setProfileError(err.response?.data?.message || t('root_profile_error'));
    }
  }

  async function onPasswordChange(data) {
    setPwdMsg(''); setPwdError('');
    try {
      await api.patch('/auth/password', data);
      setPwdMsg(t('root_profile_pwd_changed'));
      resetW();
    } catch (err) {
      setPwdError(err.response?.data?.message || t('root_profile_pwd_error'));
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link to="/root" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('root_profile_back')}
      </Link>
      <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight mb-8">{t('root_profile_title')}</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">{t('root_profile_personal')}</h2>
        {profileMsg   && <p className="mb-3 text-sm text-[#2F855A]">{profileMsg}</p>}
        {profileError && <p className="mb-3 text-sm text-[#C53030]">{profileError}</p>}
        <form onSubmit={handleP(onProfileSave)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('root_profile_name')}</label>
            <input {...regP('name')} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('root_profile_email')}</label>
            <input value={user?.email || ''} disabled className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('root_profile_phone')}</label>
            <input {...regP('phone')} className={inputCls} placeholder="+237 6XX XXX XXX" />
          </div>
          <button type="submit" disabled={subP} className="w-full bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors disabled:opacity-60">
            {subP ? t('saving') : t('save')}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">{t('root_profile_change_pwd')}</h2>
        {pwdMsg   && <p className="mb-3 text-sm text-[#2F855A]">{pwdMsg}</p>}
        {pwdError && <p className="mb-3 text-sm text-[#C53030]">{pwdError}</p>}
        <form onSubmit={handleW(onPasswordChange)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('root_profile_current')}</label>
            <input {...regW('current_password')} type="password" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('root_profile_new')}</label>
            <input {...regW('new_password')} type="password" className={inputCls} placeholder={t('root_profile_pwd_ph')} />
          </div>
          <button type="submit" disabled={subW} className="w-full bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors disabled:opacity-60">
            {subW ? t('saving') : t('root_profile_change_pwd')}
          </button>
        </form>
      </div>
    </div>
  );
}
