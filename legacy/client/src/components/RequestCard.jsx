import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function RequestCard({ request }) {
  const date = new Date(request.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <Link
      to={`/requests/${request.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Reference</p>
          <p className="font-semibold text-[#1A3C34] tracking-tight">{request.reference_number}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
        <span>{request.document_type}</span>
        <span>·</span>
        <span>{date}</span>
      </div>
    </Link>
  );
}
