import { useT } from '../context/LanguageContext';

const STATUS_STYLES = {
  'Pending':      'bg-yellow-100 text-[#B7791F]',
  'En attente':   'bg-yellow-100 text-[#B7791F]',
  'In Progress':  'bg-blue-100 text-blue-700',
  'En cours':     'bg-blue-100 text-blue-700',
  'Delivered':    'bg-green-100 text-[#2F855A]',
  'Livré':        'bg-green-100 text-[#2F855A]',
  'Cancelled':    'bg-gray-100 text-gray-600',
  'Rejeté':       'bg-red-100 text-[#C53030]',
};

export default function StatusBadge({ status }) {
  const t = useT();
  const cls = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600';
  const labelMap = {
    'Pending': t('badge_pending'),
    'In Progress': t('badge_in_progress'),
    'En cours': t('badge_in_progress'),
    'Delivered': t('badge_delivered'),
    'Livré': t('badge_delivered'),
    'Cancelled': t('badge_cancelled'),
    'Rejeté': t('badge_rejected'),
    'En attente': t('badge_pending'),
  };
  const label = labelMap[status] || status;
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
