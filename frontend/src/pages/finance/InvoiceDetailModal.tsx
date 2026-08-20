import React, { useState } from 'react';
import { ModalPortal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { Invoice } from '../../types/finance';
import { formatCurrency, formatDateIndo } from '../../lib/utils';
import {
  Printer,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Plus,
  Zap,
} from 'lucide-react';
import { OnlinePaymentModal } from '../../components/payment/OnlinePaymentModal';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onOpenRecordPayment: (invoice: Invoice) => void;
  onPaymentSuccess?: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onOpenRecordPayment,
  onPaymentSuccess,
}) => {
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  if (!isOpen || !invoice) return null;

  const total = Number(invoice.total_amount);
  const paid = Number(invoice.paid_amount);
  const remaining = Number(invoice.remaining_amount);

  const getStatusBadge = () => {
    switch (invoice.status) {
      case 'paid':
        return (
          <div className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-extrabold tracking-wider uppercase inline-block print:bg-emerald-50 print:border-emerald-600 print:text-emerald-900">
            Lunas (Paid)
          </div>
        );
      case 'partially_paid':
        return (
          <div className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-extrabold tracking-wider uppercase inline-block print:bg-amber-50 print:border-amber-600 print:text-amber-900">
            Dibayar Sebagian
          </div>
        );
      case 'cancelled':
        return (
          <div className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-extrabold tracking-wider uppercase inline-block">
            Dibatalkan
          </div>
        );
      default:
        return (
          <div className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-extrabold tracking-wider uppercase inline-block print:bg-rose-50 print:border-rose-600 print:text-rose-900">
            Belum Dibayar (Unpaid)
          </div>
        );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important; /* Removes browser default header (date, 'frontend') and footer (url, page #) */
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            visibility: hidden !important;
            background: #ffffff !important;
          }
          #invoice-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            background: #ffffff !important;
            padding: 12mm 16mm !important;
            margin: 0 !important;
            display: block !important;
            visibility: visible !important;
            box-sizing: border-box !important;
          }
          #invoice-modal-card {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            visibility: visible !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #invoice-modal-card * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-no-print {
            display: none !important;
            visibility: hidden !important;
          }
          #invoice-printable-body {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <div
        id="invoice-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      >
        <div
          id="invoice-modal-card"
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Modal Header Actions (Hidden in Print) */}
          <div className="invoice-no-print flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/80 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Pratinjau Faktur Penjualan:</span>
              <strong className="text-sm text-slate-900 font-bold">{invoice.invoice_number}</strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5 text-amber-600" /> Cetak / Print Faktur
              </Button>

              {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setIsGatewayOpen(true)}
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Zap className="w-3.5 h-3.5" /> Bayar Online
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => onOpenRecordPayment(invoice)}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Catat Manual
                  </Button>
                </>
              )}

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Body */}
          <div id="invoice-printable-body" className="overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* Header / Kop Faktur */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm print:bg-amber-600 print:text-white">
                    🥘
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {invoice.tenant?.name || 'Berkah Catering Nusantara'}
                    </h1>
                    <span className="text-xs text-slate-500 block">
                      Layanan Katering Nasi Kotak, Prasmanan &amp; Snack Box Berkualitas
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-0.5">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {invoice.tenant?.address || 'Jl. RS Fatmawati No. 45, Cilandak, Jakarta Selatan'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {invoice.tenant?.phone || '0812-3456-7890'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {invoice.tenant?.email || 'kontak@berkahcatering.com'}
                  </p>
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="sm:text-right flex flex-col sm:items-end gap-1.5">
                <div className="inline-block">{getStatusBadge()}</div>
                <h2 className="text-lg font-black text-slate-900 mt-1">FAKTUR TAGIHAN</h2>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p>
                    No. Faktur: <strong className="text-slate-900">{invoice.invoice_number}</strong>
                  </p>
                  <p>
                    Tgl. Terbit: <span>{formatDateIndo(invoice.invoice_date)}</span>
                  </p>
                  {invoice.due_date && (
                    <p className="text-amber-800 font-semibold print:text-slate-900">
                      Jatuh Tempo: <span>{formatDateIndo(invoice.due_date)}</span>
                    </p>
                  )}
                  {invoice.order && (
                    <p>
                      No. Pesanan: <strong className="text-slate-900">{invoice.order.order_number}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Customer & Event Delivery Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 text-xs print:bg-slate-50 print:border-slate-300">
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Ditagihkan Kepada:
                </span>
                <strong className="text-sm font-bold text-slate-900 block">
                  {invoice.customer?.name || 'Pelanggan'}
                </strong>
                <p className="text-slate-600 mt-0.5">{invoice.customer?.phone || '—'}</p>
                <p className="text-slate-600">{invoice.customer?.email || '—'}</p>
                <p className="text-slate-600 mt-1">{invoice.customer?.address || '—'}</p>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Detail Acara &amp; Pengiriman:
                </span>
                <strong className="text-sm font-bold text-slate-900 block">
                  {invoice.order?.event_name || 'Pesanan Catering'}
                </strong>
                <p className="text-slate-600 mt-0.5">
                  Tipe: <span className="font-semibold text-slate-800">{invoice.order?.event_type || 'Nasi Kotak'}</span>
                </p>
                <p className="text-slate-600">
                  Waktu Kirim: {invoice.order?.delivery_date ? formatDateIndo(invoice.order.delivery_date) : '—'}
                  {invoice.order?.delivery_time ? ` pk ${invoice.order.delivery_time}` : ''}
                </p>
                <p className="text-slate-600 mt-1">
                  Alamat Kirim: {invoice.order?.delivery_address || invoice.customer?.address || '—'}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <table className="w-full text-left text-xs text-slate-600 print:text-slate-900">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider print:bg-slate-100 print:border-slate-300">
                  <tr>
                    <th className="px-4 py-2.5 text-center w-12">No</th>
                    <th className="px-4 py-2.5">Deskripsi Menu / Paket</th>
                    <th className="px-4 py-2.5 text-center w-28">Jumlah Porsi</th>
                    <th className="px-4 py-2.5 text-right w-32">Harga Satuan</th>
                    <th className="px-4 py-2.5 text-right w-36">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {invoice.order?.items && invoice.order.items.length > 0 ? (
                    invoice.order.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-center font-medium text-slate-400 print:text-slate-600">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <strong className="text-slate-900 block font-semibold">
                            {item.item_name || item.package?.name || item.menu_item?.name}
                          </strong>
                          {item.notes && <span className="text-[11px] text-slate-400 italic block mt-0.5">{item.notes}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                          {item.quantity} {item.portion_unit || 'pax'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600 print:text-slate-900 font-medium">
                          {formatCurrency(Number(item.unit_price))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                          {formatCurrency(Number(item.subtotal_price))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-slate-400">
                        Tagihan Faktur Catering
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Bank Transfer Box */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1">
              {/* Payment Instructions & Bank info */}
              <div className="md:col-span-7 space-y-3">
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs print:bg-slate-50 print:border-slate-300">
                  <h4 className="font-bold text-amber-900 print:text-slate-900 flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-4 h-4 text-amber-700 print:text-slate-700" /> Rekening Pembayaran Resmi Katering:
                  </h4>
                  <div className="space-y-1 text-slate-700">
                    <p className="font-medium">
                      • <strong>BCA:</strong> 8881234567 (a.n PT Berkah Nusantara Sejahtera)
                    </p>
                    <p className="font-medium">
                      • <strong>Mandiri:</strong> 1370098765432 (a.n PT Berkah Nusantara Sejahtera)
                    </p>
                  </div>
                  <span className="text-[11px] text-amber-800 print:text-slate-700 block mt-2">
                    * Harap cantumkan nomor faktur <strong>{invoice.invoice_number}</strong> pada berita transfer.
                  </span>
                </div>

                {invoice.notes && (
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 block mb-0.5">Catatan:</span>
                    <p className="italic">{invoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Financial Totals */}
              <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 print:border-slate-300 print:bg-slate-50">
                <div className="flex justify-between text-slate-600 print:text-slate-800">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(Number(invoice.subtotal_amount))}</span>
                </div>

                {Number(invoice.delivery_fee) > 0 && (
                  <div className="flex justify-between text-slate-600 print:text-slate-800">
                    <span>Ongkos Kirim:</span>
                    <span className="font-medium">{formatCurrency(Number(invoice.delivery_fee))}</span>
                  </div>
                )}

                {Number(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700 print:text-slate-800">
                    <span>Potongan Diskon:</span>
                    <span className="font-medium">-{formatCurrency(Number(invoice.discount_amount))}</span>
                  </div>
                )}

                {Number(invoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-slate-600 print:text-slate-800">
                    <span>Pajak (PPN):</span>
                    <span className="font-medium">+{formatCurrency(Number(invoice.tax_amount))}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-200 print:border-slate-300 pt-2 text-sm font-extrabold text-slate-900">
                  <span>Total Tagihan:</span>
                  <span className="text-base">{formatCurrency(total)}</span>
                </div>

                <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-dashed border-slate-200 print:border-slate-300">
                  <span>Total Telah Dibayar:</span>
                  <span>{formatCurrency(paid)}</span>
                </div>

                <div className="flex justify-between text-amber-900 print:text-slate-900 font-extrabold text-sm pt-1">
                  <span>Sisa Tagihan (Piutang):</span>
                  <span className="text-amber-800 print:text-slate-900">{formatCurrency(remaining)}</span>
                </div>
              </div>
            </div>

            {/* Payment History Log */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="border-t border-slate-200 pt-4 print:border-slate-300">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Riwayat Pembayaran Masuk
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                  <table className="w-full text-left text-xs text-slate-600 print:text-slate-900">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 print:bg-slate-100">
                      <tr>
                        <th className="px-4 py-2">No. Transaksi</th>
                        <th className="px-4 py-2">Tanggal</th>
                        <th className="px-4 py-2">Metode</th>
                        <th className="px-4 py-2">Rekening / Ref</th>
                        <th className="px-4 py-2 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {invoice.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 font-bold text-slate-900">{p.payment_number}</td>
                          <td className="px-4 py-2">{formatDateIndo(p.payment_date)}</td>
                          <td className="px-4 py-2 capitalize">{p.payment_method.replace('_', ' ')}</td>
                          <td className="px-4 py-2 text-slate-500 print:text-slate-700">{p.destination_bank_account || p.reference_number || '—'}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-emerald-700 print:text-slate-900">
                            {formatCurrency(Number(p.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer (Hidden in Print) */}
          <div className="invoice-no-print px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-slate-400">
              Diterbitkan oleh: <strong>{invoice.creator?.name || 'Staff Finance'}</strong>
            </span>
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>

          {/* Online Payment Modal */}
          <OnlinePaymentModal
            isOpen={isGatewayOpen}
            onClose={() => setIsGatewayOpen(false)}
            orderNumber={invoice.order?.order_number || invoice.invoice_number}
            orderAmount={remaining}
            onPaymentSuccess={() => {
              setIsGatewayOpen(false);
              if (onPaymentSuccess) onPaymentSuccess();
            }}
          />
        </div>
      </div>
    </ModalPortal>
  );
};
