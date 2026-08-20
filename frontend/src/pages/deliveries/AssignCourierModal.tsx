import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import {
  Truck,
  X,
  AlertCircle,
  Clock,
  MapPin,
  User,
  Phone,
  Car,
} from 'lucide-react';
import type { Order } from '../../types/order';
import type { Delivery } from '../../types/delivery';

interface AssignCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  delivery?: Delivery | null;
  onSuccess: () => void;
}

export const AssignCourierModal: React.FC<AssignCourierModalProps> = ({
  isOpen,
  onClose,
  order,
  delivery,
  onSuccess,
}) => {
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car' | 'van' | 'truck'>('motorcycle');
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState('');
  const [deliveryBatchCode, setDeliveryBatchCode] = useState('');
  const [deliveryTimeTarget, setDeliveryTimeTarget] = useState('11:30');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (delivery) {
        setCourierName(delivery.courier_name || '');
        setCourierPhone(delivery.courier_phone || '');
        setVehicleType(delivery.vehicle_type || 'motorcycle');
        setVehiclePlateNumber(delivery.vehicle_plate_number || '');
        setDeliveryBatchCode(delivery.delivery_batch_code || '');
        setDeliveryTimeTarget(delivery.delivery_time_target || '11:30');
        setDestinationAddress(delivery.destination_address || '');
        setRecipientName(delivery.recipient_name || '');
        setRecipientPhone(delivery.recipient_phone || '');
        setNotes(delivery.notes || '');
      } else if (order) {
        setCourierName('');
        setCourierPhone('');
        setVehicleType('motorcycle');
        setVehiclePlateNumber('');
        setDeliveryBatchCode('');
        setDeliveryTimeTarget(order.delivery_time || '11:30');
        setDestinationAddress(order.delivery_address || '');
        setRecipientName(order.recipient_name || order.customer?.name || '');
        setRecipientPhone(order.recipient_phone || order.customer?.phone || '');
        setNotes(order.notes || '');
      }
    }
  }, [isOpen, order, delivery]);

  if (!isOpen) return null;

  const targetOrderId = order?.id || delivery?.order_id;
  const orderNumber = order?.order_number || delivery?.order?.order_number || 'N/A';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrderId) {
      setErrorMsg('Order ID tidak ditemukan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        order_id: targetOrderId,
        courier_name: courierName.trim(),
        courier_phone: courierPhone.trim() || undefined,
        vehicle_type: vehicleType,
        vehicle_plate_number: vehiclePlateNumber.trim() || undefined,
        delivery_batch_code: deliveryBatchCode.trim() || undefined,
        delivery_time_target: deliveryTimeTarget,
        destination_address: destinationAddress,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        notes: notes.trim() || undefined,
      };

      const res = await apiClient.post('/tenant/deliveries/assign', payload);

      if (res.data?.success) {
        alert('Kurir pengiriman berhasil ditugaskan.');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Assign courier failed:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal menugaskan kurir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Penugasan Kurir Pengiriman
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Pesanan: <strong>{orderNumber}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {/* Courier Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nama Kurir / Driver *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pak Budi"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                No. WhatsApp Kurir
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="0812xxxxxxxx"
                  value={courierPhone}
                  onChange={(e) => setCourierPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Type & Plate Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Jenis Armada *
              </label>
              <div className="relative">
                <Car className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                >
                  <option value="motorcycle">Motor (Box / Keranjang)</option>
                  <option value="car">Mobil / Sedan</option>
                  <option value="van">Blind Van (Catering Delivery)</option>
                  <option value="truck">Truk / Pickup Box</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Plat Nomor Kendaraan
              </label>
              <input
                type="text"
                placeholder="B 1234 XYZ"
                value={vehiclePlateNumber}
                onChange={(e) => setVehiclePlateNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs uppercase font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Target Time & Batch Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Target Waktu Tiba
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="time"
                  value={deliveryTimeTarget}
                  onChange={(e) => setDeliveryTimeTarget(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Batch / Rute (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: BATCH-JAKSEL-1"
                value={deliveryBatchCode}
                onChange={(e) => setDeliveryBatchCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Alamat Lengkap Pengiriman *
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                required
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Recipient details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nama Penerima di Lokasi
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                No. Telepon Penerima
              </label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Catatan Khusus Pengiriman / Patokan Lokasi
            </label>
            <input
              type="text"
              placeholder="Contoh: Masuk lewat loading dock basement 2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-2xs"
            >
              <Truck className="w-3.5 h-3.5" />
              {isSubmitting ? 'Menyimpan...' : 'Tugaskan Kurir'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
