import { useState } from 'react';

export default function MockPaymentForm({ onSuccess, fee = 15000 }) {
  const [operator, setOperator] = useState('MTN');
  const [phone, setPhone]       = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [stage, setStage]       = useState('idle'); // idle | waiting | done

  function handlePay() {
    if (!phone.trim()) { setPhoneError('Phone number is required.'); return; }
    if (!/^\+?[0-9\s]{9,15}$/.test(phone.trim())) { setPhoneError('Enter a valid phone number.'); return; }
    setPhoneError('');
    setStage('waiting');
    setTimeout(() => {
      setStage('done');
      const ref = `MOMO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setTimeout(() => onSuccess(ref), 800);
    }, 2000);
  }

  const isMTN   = operator === 'MTN';
  const btnColor = isMTN
    ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
    : 'bg-orange-500 hover:bg-orange-600 text-white';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-[#1A3C34]">Mobile Money Payment</h3>
        <div className="text-right">
          <p className="text-xs text-gray-400">Service Fee</p>
          <p className="text-lg font-bold text-[#C9A03A]">{fee.toLocaleString()} XAF</p>
        </div>
      </div>

      {stage === 'idle' && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-[#1C1C1C] mb-2">Select Operator</p>
            <div className="flex gap-3">
              {['MTN', 'Orange'].map(op => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setOperator(op)}
                  className={`flex-1 py-3 rounded-lg font-semibold text-sm border-2 transition-all ${
                    operator === op
                      ? op === 'MTN'
                        ? 'bg-yellow-400 text-black border-yellow-500'
                        : 'bg-orange-500 text-white border-orange-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {op === 'MTN' ? '🟡 MTN Mobile Money' : '🟠 Orange Money'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">
              {isMTN ? 'MTN' : 'Orange'} Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm"
            />
            {phoneError && <p className="mt-1 text-xs text-[#C53030]">{phoneError}</p>}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
            A payment request of <strong className="text-[#1C1C1C]">{fee.toLocaleString()} XAF</strong> will be sent to your {isMTN ? 'MTN' : 'Orange'} number. Confirm on your phone to complete.
          </div>

          <button
            type="button"
            onClick={handlePay}
            className={`w-full rounded-md px-6 py-3 font-semibold transition-colors ${btnColor}`}
          >
            Pay {fee.toLocaleString()} XAF with {isMTN ? 'MTN MoMo' : 'Orange Money'}
          </button>
        </div>
      )}

      {stage === 'waiting' && (
        <div className="text-center py-10">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isMTN ? 'bg-yellow-400' : 'bg-orange-500'}`}>
            <svg className="animate-spin h-7 w-7 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
          <p className="font-semibold text-[#1C1C1C] mb-1">Waiting for confirmation…</p>
          <p className="text-sm text-gray-500">A push notification was sent to <strong>{phone}</strong>. Please confirm on your phone.</p>
        </div>
      )}

      {stage === 'done' && (
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-[#2F855A] mb-4 text-3xl">
            ✓
          </div>
          <p className="font-semibold text-[#2F855A] text-lg">Payment confirmed!</p>
          <p className="text-sm text-gray-500 mt-1">Submitting your request…</p>
        </div>
      )}
    </div>
  );
}
