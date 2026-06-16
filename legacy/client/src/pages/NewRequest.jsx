import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FileUpload from '../components/FileUpload';
import MockPaymentForm from '../components/MockPaymentForm';
import { createRequest } from '../services/requestService';
import { DOCUMENT_TYPES } from '../services/documentTypes';

const step1Schema = yup.object({
  document_type:      yup.string().required('Document type is required.'),
  full_name:          yup.string().required('Full name is required.'),
  date_of_birth:      yup.string().required('Date of birth is required.'),
  national_id_number: yup.string().required('National ID number is required.'),
  phone:              yup.string().required('Phone number is required.'),
  address:            yup.string().required('Address is required.'),
});

const STEPS = ['Request Info', 'Upload Documents', 'Payment'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
              ${i < current ? 'bg-[#2F855A] text-white' : i === current ? 'bg-[#1A3C34] text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium hidden sm:block ${i === current ? 'text-[#1A3C34]' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-16 sm:w-24 h-0.5 mx-1 -mt-4 sm:-mt-5 ${i < current ? 'bg-[#2F855A]' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1C1C1C] mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-[#C53030]">{error}</p>}
    </div>
  );
}

export default function NewRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill || {};
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const inputCls = 'w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm';

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(step1Schema),
    defaultValues: { ...formData, ...prefill },
  });

  const selectedType = watch('document_type');
  const selectedDoc = DOCUMENT_TYPES.find(d => d.value === selectedType);

  function onStep1Submit(data) {
    setFormData(data);
    setStep(1);
  }

  function goToPayment() {
    if (files.length === 0) { setFileError('Please upload at least one supporting document.'); return; }
    setFileError('');
    setStep(2);
  }

  async function onPaymentSuccess(ref) {
    setSubmitting(true);
    setSubmitError('');
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      files.forEach(f => fd.append('files', f));
      fd.append('payment_reference', ref);
      const res = await createRequest(fd);
      navigate(`/confirmation?ref=${res.data.reference_number}`);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors mb-6 block">
        ← Back to Dashboard
      </Link>
      <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight mb-2">New Document Request</h1>
      <p className="text-sm text-gray-500 mb-8">Complete all three steps to submit your request.</p>

      <StepIndicator current={step} />

      {step === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-[#1A3C34] mb-5">Step 1 — Request Information</h2>
          <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
            <Field label="Document Type" error={errors.document_type?.message}>
              <select {...register('document_type')} className={inputCls}>
                <option value="">Select document type</option>
                {DOCUMENT_TYPES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>
            {selectedDoc && (
              <p className="text-sm text-[#C9A03A] font-medium">Service fee: {selectedDoc.fee.toLocaleString()} XAF</p>
            )}
            <Field label="Full Name" error={errors.full_name?.message}>
              <input {...register('full_name')} placeholder="As on your national ID" className={inputCls} />
            </Field>
            <Field label="Date of Birth" error={errors.date_of_birth?.message}>
              <input {...register('date_of_birth')} type="date" className={inputCls} />
            </Field>
            <Field label="National ID Number" error={errors.national_id_number?.message}>
              <input {...register('national_id_number')} placeholder="CNI number" className={inputCls} />
            </Field>
            <Field label="Phone Number" error={errors.phone?.message}>
              <input {...register('phone')} placeholder="+237 6XX XXX XXX" className={inputCls} />
            </Field>
            <Field label="Address" error={errors.address?.message}>
              <textarea {...register('address')} rows={3} placeholder="Full address" className={inputCls} />
            </Field>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors">
                Next →
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-[#1A3C34] mb-2">Step 2 — Upload Supporting Documents</h2>
          <p className="text-sm text-gray-500 mb-5">Upload your national ID, proof of address, or any relevant documents.</p>
          <FileUpload files={files} onChange={setFiles} error={fileError} />
          <div className="flex justify-between pt-6">
            <button type="button" onClick={() => setStep(0)} className="border border-gray-300 text-gray-600 rounded-md px-6 py-2.5 font-medium hover:bg-gray-50 transition-colors">
              ← Back
            </button>
            <button type="button" onClick={goToPayment} className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[#1A3C34]">Step 3 — Payment</h2>
            <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-[#1A3C34]">← Back</button>
          </div>
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-[#C53030]">{submitError}</div>
          )}
          {submitting ? (
            <div className="text-center py-12 text-gray-500">Submitting your request…</div>
          ) : (
            <MockPaymentForm onSuccess={onPaymentSuccess} fee={selectedDoc?.fee || 15000} />
          )}
        </div>
      )}
    </div>
  );
}
