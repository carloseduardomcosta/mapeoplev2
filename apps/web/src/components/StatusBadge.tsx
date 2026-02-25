import { ResidentStatus } from '@/types/resident';

const STATUS_CONFIG: Record<ResidentStatus, { label: string; className: string }> = {
  NAO_CONTATADO: {
    label: 'Não Contatado',
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  },
  CONTATADO: {
    label: 'Contatado',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  AUSENTE: {
    label: 'Ausente',
    className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  },
  RECUSOU: {
    label: 'Recusou',
    className: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  INTERESSADO: {
    label: 'Interessado',
    className: 'bg-green-500/20 text-green-300 border-green-500/30',
  },
};

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label]),
) as Record<ResidentStatus, string>;

export default function StatusBadge({ status }: { status: ResidentStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.NAO_CONTATADO;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
