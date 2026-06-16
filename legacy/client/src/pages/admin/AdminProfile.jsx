import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const profileSchema = yup.object({
  name:  yup.string().required('Name is required.'),
  phone: yup.string(),
});

const pwdSchema = yup.object({
  current_password: yup.string().required('Current password is required.'),
  new_password: yup.string().min(8).matches(/[A-Z]/, '1 uppercase required.').matches(/[0-9]/, '1 number required.').required(),
});

const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

export default function AdminProfile() {
  const { user, login, token } = useAuth();
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
      login(token, user.role, data.name);
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Update failed.');
    }
  }

  async function onPasswordChange(data) {
    setPwdMsg(''); setPwdError('');
    try {
      await api.patch('/auth/password', data);
      setPwdMsg('Password changed successfully.');
      resetW();
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Failed to change password.');
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        ← Back to Dashboard
      </Link>
      <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight mb-8">My Account</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">Personal Information</h2>
        {profileMsg   && <p className="mb-3 text-sm text-[#2F855A]">{profileMsg}</p>}
        {profileError && <p className="mb-3 text-sm text-[#C53030]">{profileError}</p>}
        <form onSubmit={handleP(onProfileSave)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Full Name</label>
            <input {...regP('name')} className={inputCls} />
            {errP.name && <p className="mt-1 text-xs text-[#C53030]">{errP.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Email</label>
            <input value={user?.email || ''} disabled className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Phone</label>
            <input {...regP('phone')} className={inputCls} placeholder="+237 6XX XXX XXX" />
          </div>
          <button type="submit" disabled={subP} className="w-full bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors disabled:opacity-60">
            {subP ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">Change Password</h2>
        {pwdMsg   && <p className="mb-3 text-sm text-[#2F855A]">{pwdMsg}</p>}
        {pwdError && <p className="mb-3 text-sm text-[#C53030]">{pwdError}</p>}
        <form onSubmit={handleW(onPasswordChange)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Current Password</label>
            <input {...regW('current_password')} type="password" className={inputCls} />
            {errW.current_password && <p className="mt-1 text-xs text-[#C53030]">{errW.current_password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">New Password</label>
            <input {...regW('new_password')} type="password" className={inputCls} placeholder="Min 8 chars, 1 uppercase, 1 number" />
            {errW.new_password && <p className="mt-1 text-xs text-[#C53030]">{errW.new_password.message}</p>}
          </div>
          <button type="submit" disabled={subW} className="w-full bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors disabled:opacity-60">
            {subW ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
