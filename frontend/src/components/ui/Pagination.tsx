import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  has_more_pages?: boolean;
}

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  meta,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 25, 50, 100],
}) => {
  const { current_page, last_page, per_page, total } = meta;

  if (total === 0) return null;

  const from = (current_page - 1) * per_page + 1;
  const to = Math.min(current_page * per_page, total);

  // Generate page numbers
  const pages: (number | string)[] = [];
  if (last_page <= 7) {
    for (let i = 1; i <= last_page; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (current_page > 3) {
      pages.push('...');
    }

    const start = Math.max(2, current_page - 1);
    const end = Math.min(last_page - 1, current_page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current_page < last_page - 2) {
      pages.push('...');
    }
    pages.push(last_page);
  }

  return (
    <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
      {/* Left: Summary & Per Page Selector */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>
          Menampilkan <strong className="font-semibold text-slate-800">{from}</strong> -{' '}
          <strong className="font-semibold text-slate-800">{to}</strong> dari{' '}
          <strong className="font-semibold text-slate-800">{total}</strong> data
        </span>

        {onPerPageChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span>Tampilkan:</span>
            <select
              value={per_page}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500"
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span>per halaman</span>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={current_page <= 1}
          onClick={() => onPageChange(current_page - 1)}
          className="h-8 w-8 p-0"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400">
                ...
              </span>
            );
          }

          const isCurrent = p === current_page;
          return (
            <button
              key={`page-${p}`}
              onClick={() => onPageChange(Number(p))}
              className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition-colors ${
                isCurrent
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          disabled={current_page >= last_page}
          onClick={() => onPageChange(current_page + 1)}
          className="h-8 w-8 p-0"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
