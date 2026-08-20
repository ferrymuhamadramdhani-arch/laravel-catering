import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import apiClient from '../../api/axios';
import type { Invoice, FinanceSummary } from '../../types/finance';
import type { Customer } from '../../types/crm';
import { formatCurrency, formatDateIndo } from '../../lib/utils';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CreditCard,
  Building2,
  DollarSign,
  TrendingUp,
  Wallet,
  ChevronDown,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/finance/summary');
      if (res.data?.data) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch finance summary:', err);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/customers', { params: { per_page: 100 } });
      if (res.data?.data) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 12 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (customerFilter !== 'all') params.customer_id = customerFilter;

      const res = await apiClient.get('/tenant/invoices', { params });
      if (res.data?.data) {
        setInvoices(res.data.data);
        setTotalPages(res.data.meta?.last_page || 1);
        setTotalCount(res.data.meta?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, customerFilter]);

  useEffect(() => {
    fetchSummary();
    fetchCustomers();
  }, [fetchSummary, fetchCustomers]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleRefresh = () => {
    fetchSummary();
    fetchInvoices();
  };

  const handleOpenDetail = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsDetailModalOpen(true);
    // Fetch latest fresh data with all nested relations
    apiClient.get(`/tenant/invoices/${inv.id}`).then((res: any) => {
      if (res.data?.data) {
        setSelectedInvoice(res.data.data);
      }
    }).catch(err => console.error('Failed to load full invoice:', err));
  };

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    fetchSummary();
    fetchInvoices();
    if (selectedInvoice) {
      apiClient.get(`/tenant/invoices/${selectedInvoice.id}`).then((res: any) => {
        if (res.data?.data) {
          setSelectedInvoice(res.data.data);
        }
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Lunas',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'partially_paid':
        return {
          label: 'Dibayar Sebagian',
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'cancelled':
        return {
          label: 'Dibatalkan',
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
        };
      default:
        return {
          label: 'Belum Lunas',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-amber-600" /> Keuangan &amp; Invoicing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola faktur tagihan catering, pembayaran bertahap (DP / Pelunasan), dan monitoring piutang pelanggan
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Outstanding Receivables */}
        <Card className="p-5 border-l-4 border-l-rose-500 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Piutang Belum Lunas
              </span>
              <strong className="text-2xl font-black text-rose-600 mt-1 block">
                {formatCurrency(summary?.total_receivables || 0)}
              </strong>
              <span className="text-xs text-slate-400 mt-0.5 block">
                {(summary?.unpaid_count || 0) + (summary?.partially_paid_count || 0)} Faktur belum selesai
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Kas Masuk Bulan Ini */}
        <Card className="p-5 border-l-4 border-l-emerald-500 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Kas Masuk Bulan Ini
              </span>
              <strong className="text-2xl font-black text-emerald-600 mt-1 block">
                {formatCurrency(summary?.paid_this_month || 0)}
              </strong>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Penerimaan kas bersih terverifikasi
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Total Invoices Lunas */}
        <Card className="p-5 border-l-4 border-l-amber-500 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Faktur Lunas
              </span>
              <strong className="text-2xl font-black text-slate-900 mt-1 block">
                {summary?.paid_count || 0}{' '}
                <span className="text-base font-medium text-slate-400">/ {summary?.total_invoices_count || 0}</span>
              </strong>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Total faktur yang telah diterbitkan
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-3">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nomor faktur, nama pelanggan, no. pesanan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div className="relative w-full lg:w-48">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 appearance-none font-medium text-slate-700 truncate"
            >
              <option value="all">Semua Status Faktur</option>
              <option value="unpaid">Belum Dibayar (Unpaid)</option>
              <option value="partially_paid">Dibayar Sebagian</option>
              <option value="paid">Lunas (Paid)</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Customer Filter */}
          <div className="relative w-full lg:w-56">
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 appearance-none font-medium text-slate-700 truncate"
            >
              <option value="all">Semua Pelanggan</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nomor Faktur</th>
                <th className="px-6 py-3.5">Pesanan &amp; Acara</th>
                <th className="px-6 py-3.5">Pelanggan</th>
                <th className="px-6 py-3.5">Tgl. Terbit &amp; Jatuh Tempo</th>
                <th className="px-6 py-3.5 text-right">Total Tagihan</th>
                <th className="px-6 py-3.5 text-right">Terbayar</th>
                <th className="px-6 py-3.5 text-right">Sisa Piutang</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Memuat data faktur &amp; piutang...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">Belum ada data faktur tagihan.</p>
                      <span className="text-xs text-slate-400">
                        Faktur dapat diterbitkan langsung melalui rincian pesanan di menu Pesanan.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const statusCfg = getStatusConfig(inv.status);
                  const remaining = Number(inv.remaining_amount);
                  const total = Number(inv.total_amount);
                  const paid = Number(inv.paid_amount);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div>
                            <strong className="font-bold text-slate-900 leading-snug">{inv.invoice_number}</strong>
                            <span className="text-[10px] text-slate-400 block capitalize">
                              Tipe: {inv.invoice_type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {inv.order ? (
                          <div>
                            <strong className="text-slate-800 text-xs font-semibold">{inv.order.order_number}</strong>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                              {inv.order.event_name || 'Catering'}
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-800 text-xs block">
                          {inv.customer?.name || 'Pelanggan'}
                        </span>
                        <span className="text-[10px] text-slate-400">{inv.customer?.phone || '—'}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="text-slate-600 font-medium">{formatDateIndo(inv.invoice_date)}</div>
                        {inv.due_date && (
                          <div className="text-[10px] text-amber-800 font-semibold">
                            Tempo: {formatDateIndo(inv.due_date)}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-xs">
                        {formatCurrency(total)}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold text-emerald-700 text-xs">
                        {formatCurrency(paid)}
                      </td>

                      <td className="px-6 py-4 text-right font-extrabold text-xs">
                        {remaining > 0 ? (
                          <span className="text-rose-600">{formatCurrency(remaining)}</span>
                        ) : (
                          <span className="text-slate-400">Rp 0</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(inv)}
                            className="gap-1 text-xs py-1 px-2.5 h-auto text-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> Faktur
                          </Button>

                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPayment(inv)}
                              className="gap-1 text-xs py-1 px-2.5 h-auto font-bold"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Bayar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Menampilkan hal {page} dari {totalPages} ({totalCount} total faktur)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <InvoiceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        invoice={selectedInvoice}
        onOpenRecordPayment={(inv) => {
          setIsDetailModalOpen(false);
          handleOpenPayment(inv);
        }}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={selectedInvoice}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
