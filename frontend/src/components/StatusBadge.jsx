const STATUS_MAP = {
  pending: { label: 'قيد الانتظار', tone: 'pending' },
  pending_verification: { label: 'قيد المراجعة', tone: 'pending' },
  reviewed: { label: 'تمت المراجعة', tone: 'good' },
  completed: { label: 'مكتملة', tone: 'good' },
  active: { label: 'نشط', tone: 'good' },
  blocked: { label: 'محظور', tone: 'bad' },
  verified: { label: 'موثّق', tone: 'good' },

  payment_review: { label: 'بانتظار مراجعة الدفع', tone: 'pending' },
  payment_rejected: { label: 'تم رفض الدفع', tone: 'bad' },
  preparing: { label: 'قيد التجهيز', tone: 'pending' },
  out_for_delivery: { label: 'في الطريق', tone: 'good' },
  delivered: { label: 'تم التسليم', tone: 'good' },
  cancelled: { label: 'ملغى', tone: 'bad' },
};

export default function StatusBadge({ status }) {
  const entry = STATUS_MAP[status] || { label: status, tone: 'pending' };
  return <span className={`badge badge-tone-${entry.tone}`}>{entry.label}</span>;
}
