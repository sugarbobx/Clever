import { useSearchParams, Link } from 'react-router-dom';

export default function Confirmation() {
  const [params] = useSearchParams();
  const ref = params.get('ref');

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#2F855A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1A3C34] mb-2">Request Submitted Successfully</h1>
          <p className="text-sm text-gray-500 mb-6">Your reference number is:</p>
          <p className="text-2xl font-bold text-[#1A3C34] tracking-wide bg-gray-50 rounded-lg py-3 px-4 mb-6">
            {ref}
          </p>
          <p className="text-sm text-gray-500 mb-8">
            You will be notified when your document is ready.
          </p>
          <Link
            to="/dashboard"
            className="inline-block bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
