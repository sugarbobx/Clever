import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { getEmployees, createEmployee, toggleEmployee, resetPassword, deleteEmployee } from '../../services/employeeService';
import { useT } from '../../context/LanguageContext';

const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

export default function EmployeeList() {
  const t = useT();

  const schema = yup.object({
    name:     yup.string().required(t('emp_name_req')),
    email:    yup.string().email(t('emp_email_invalid')).required(t('emp_email_invalid')),
    phone:    yup.string(),
    password: yup.string().min(8, t('emp_pwd_min_req')).required(t('emp_pwd_min_req')),
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [toggleError, setToggleError] = useState('');
  const [resetId, setResetId]     = useState(null);
  const [newPwd, setNewPwd]       = useState('');
  const [pwdMsg, setPwdMsg]       = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    getEmployees()
      .then(res => setEmployees(res.data))
      .catch(() => setDeleteError(t('emp_load_error')))
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(data) {
    setCreateError('');
    try {
      const res = await createEmployee({ ...data, role: 'admin' });
      setEmployees(prev => [...prev, res.data]);
      reset();
      setShowForm(false);
    } catch (err) {
      setCreateError(err.response?.data?.message || t('error_generic'));
    }
  }

  async function handleToggle(id) {
    try {
      const res = await toggleEmployee(id);
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, is_active: res.data.is_active } : e));
    } catch {
      setToggleError(t('emp_toggle_error'));
      setTimeout(() => setToggleError(''), 3000);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(t('emp_delete_confirm').replace('{name}', name))) return;
    try {
      await deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setDeleteError(err.response?.data?.message || t('emp_delete_error'));
      setTimeout(() => setDeleteError(''), 3000);
    }
  }

  async function handleResetPwd(id) {
    if (newPwd.length < 8) { setPwdMsg(t('emp_pwd_min')); return; }
    try {
      await resetPassword(id, newPwd);
      setPwdMsg(t('emp_pwd_reset_ok'));
      setNewPwd('');
      setTimeout(() => { setResetId(null); setPwdMsg(''); }, 1500);
    } catch (err) {
      setPwdMsg(err.response?.data?.message || t('error_generic'));
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/root" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        {t('emp_back')}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">{t('emp_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('emp_subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] transition-colors">
          {showForm ? t('cancel') : t('emp_new')}
        </button>
      </div>

      {deleteError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{deleteError}</div>}
      {toggleError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{toggleError}</div>}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-[#1A3C34] mb-4">{t('emp_create_title')}</h2>
          {createError && <p className="mb-3 text-sm text-[#C53030]">{createError}</p>}
          <form onSubmit={handleSubmit(onCreate)} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('emp_full_name')}</label>
              <input {...register('name')} className={inputCls} />
              {errors.name && <p className="mt-1 text-xs text-[#C53030]">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('emp_email')}</label>
              <input {...register('email')} type="email" className={inputCls} placeholder="agent@thecleverest.com" />
              {errors.email && <p className="mt-1 text-xs text-[#C53030]">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('emp_phone')}</label>
              <input {...register('phone')} className={inputCls} placeholder="+237 6XX XXX XXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{t('emp_password')}</label>
              <input {...register('password')} type="password" className={inputCls} placeholder={t('emp_pwd_ph')} />
              {errors.password && <p className="mt-1 text-xs text-[#C53030]">{errors.password.message}</p>}
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={isSubmitting} className="bg-[#C9A03A] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#B08A2E] transition-colors disabled:opacity-60">
                {isSubmitting ? t('emp_creating') : t('emp_create_btn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-sm">{t('loading')}</p> : employees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 text-sm">
          {t('emp_empty')}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">{t('emp_full_name')}</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">{t('emp_email')}</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">{t('emp_active_requests')}</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">{t('emp_status')}</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">{t('emp_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#1C1C1C]">{e.name}</td>
                  <td className="px-6 py-4 text-gray-500">{e.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.active_requests > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      {e.active_requests} {t('emp_active_requests')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.is_active ? 'bg-green-100 text-[#2F855A]' : 'bg-gray-100 text-gray-400'}`}>
                      {e.is_active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleToggle(e.id)} className="text-xs border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50 transition-colors">
                        {e.is_active ? t('emp_deactivate') : t('emp_activate')}
                      </button>
                      <button onClick={() => { setResetId(resetId === e.id ? null : e.id); setNewPwd(''); setPwdMsg(''); }} className="text-xs border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50 transition-colors">
                        {t('emp_reset_pwd')}
                      </button>
                      <button onClick={() => handleDelete(e.id, e.name)} className="text-xs border border-[#C53030] text-[#C53030] rounded-md px-3 py-1 hover:bg-red-50 transition-colors">
                        {t('emp_delete')}
                      </button>
                    </div>
                    {resetId === e.id && (
                      <div className="mt-2 flex gap-2">
                        <input value={newPwd} onChange={ev => setNewPwd(ev.target.value)} type="password" placeholder={t('emp_new_pwd_ph')} className="border border-gray-300 rounded-md px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A3C34]" />
                        <button onClick={() => handleResetPwd(e.id)} className="text-xs bg-[#1A3C34] text-white rounded-md px-3 py-1">{t('emp_set_pwd')}</button>
                      </div>
                    )}
                    {resetId === e.id && pwdMsg && <p className="text-xs mt-1 text-[#2F855A]">{pwdMsg}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
