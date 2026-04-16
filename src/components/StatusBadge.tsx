import type { QuoteStatus } from '../types/quote';

const statusMap: Record<
  QuoteStatus,
  { label: string; className: string }
> = {
  draft: {
    label: '下書き',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  sent: {
    label: '送付済み',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  approved: {
    label: '承認',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: '失注',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  pending: {
    label: '保留',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

type Props = {
  status: QuoteStatus;
};

export default function StatusBadge({ status }: Props) {
  const config = statusMap[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}