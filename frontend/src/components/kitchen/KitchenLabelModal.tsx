import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../ui/Button';
import {
  Printer,
  X,
  AlertCircle,
} from 'lucide-react';
import type { KitchenLabelPayload } from '../../types/production';

interface KitchenLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
}

export const KitchenLabelModal: React.FC<KitchenLabelModalProps> = ({
  isOpen,
  onClose,
  orderId,
}) => {
  const [labelData, setLabelData] = useState<KitchenLabelPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      setIsLoading(true);
      setErrorMsg(null);
      apiClient
        .get(`/tenant/production/orders/${orderId}/label`)
        .then((res) => {
          if (res.data?.data) {
            setLabelData(res.data.data);
          }
        })
        .catch((err) => {
          console.error('Failed to load label:', err);
          setErrorMsg('Gagal memuat format label produksi.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setLabelData(null);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Pratinjau Label Kemasan &amp; Dapur
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat Label Kemasan...
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : labelData ? (
          <div className="space-y-4">
            {/* Printable Thermal Label Area (80mm standard width layout) */}
            <div
              id="printable-kitchen-label"
              className="p-5 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/60 font-mono text-xs text-slate-900 space-y-3 print:border-none print:p-0 print:bg-white print:m-0"
            >
              {/* Header */}
              <div className="text-center pb-2 border-b border-slate-300 space-y-0.5">
                <strong className="text-sm font-black uppercase tracking-wider block">
                  {labelData.tenant_name}
                </strong>
                <span className="text-[10px] text-slate-500 block uppercase">
                  LABEL PRODUKSI &amp; PACKAGING
                </span>
                <span className="text-[11px] font-bold block pt-1">
                  NO. ORDER: {labelData.order_number}
                </span>
              </div>

              {/* Delivery Timing & Recipient */}
              <div className="space-y-1 text-[11px] pb-2 border-b border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Jadwal Kirim:</span>
                  <strong>
                    {labelData.delivery_date} (pk {labelData.delivery_time})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Penerima:</span>
                  <strong>
                    {labelData.recipient_name} ({labelData.recipient_phone})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipe Acara:</span>
                  <span className="font-semibold">
                    {labelData.event_type} {labelData.event_name ? `(${labelData.event_name})` : ''}
                  </span>
                </div>
                <div className="pt-0.5">
                  <span className="text-slate-500 block">Alamat:</span>
                  <p className="font-semibold line-clamp-2">{labelData.delivery_address}</p>
                </div>
              </div>

              {/* Menu Items Breakdown */}
              <div className="space-y-1.5 pb-2 border-b border-slate-300">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                  <span>Menu &amp; Porsi</span>
                  <span>Qty</span>
                </div>
                {labelData.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div className="pr-2">
                      <span className="font-bold">{it.name}</span>
                      {it.notes && (
                        <span className="text-[10px] text-slate-500 italic block">
                          *{it.notes}
                        </span>
                      )}
                    </div>
                    <strong className="whitespace-nowrap font-bold">
                      {it.quantity} {it.unit}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Special Notes & Footer */}
              <div className="space-y-1 text-[10px] text-slate-600">
                {labelData.special_notes && (
                  <p className="font-bold italic bg-amber-100 p-1.5 rounded border border-amber-200 text-amber-900">
                    Instruksi Khusus: {labelData.special_notes}
                  </p>
                )}
                <div className="flex justify-between text-[9px] pt-1 text-slate-400">
                  <span>Resi: {labelData.tracking_code}</span>
                  <span>Cetak: {labelData.printed_at}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Tutup
              </Button>
              <Button
                onClick={handlePrint}
                size="sm"
                className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Thermal / Nota
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
