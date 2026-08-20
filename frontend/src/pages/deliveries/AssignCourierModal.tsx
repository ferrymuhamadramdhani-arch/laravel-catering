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
  UserCheck,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import type { Order } from '../../types/order';
import type { Delivery } from '../../types/delivery';
import type {
  AvailableCourierResource,
  AvailableVehicleResource,
} from '../../types/fleet';

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
  const [selectedCourierId, setSelectedCourierId] = useState<number | ''>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');

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

  const [availableCouriers, setAvailableCouriers] = useState<AvailableCourierResource[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicleResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const targetDate = order?.delivery_date || (delivery?.order?.delivery_date ?? new Date().toISOString().split('T')[0]);

  // Load available resources for the delivery date
  useEffect(() => {
    if (isOpen) {
      setIsLoadingResources(true);
      apiClient
        .get('/tenant/deliveries/available-resources', {
          params: { date: targetDate },
        })
        .then((res) => {
          if (res.data?.data) {
            setAvailableCouriers(res.data.data.couriers || []);
            setAvailableVehicles(res.data.data.vehicles || []);
          }
        })
        .catch((err) => {
          console.error('Failed to load available fleet:', err);
        })
        .finally(() => {
          setIsLoadingResources(false);
        });
    }
  }, [isOpen, targetDate]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSelectedCourierId('');
      setSelectedVehicleId('');

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

  // Handle master courier selection
  const handleSelectMasterCourier = (courierIdStr: string) => {
    if (!courierIdStr) {
      setSelectedCourierId('');
      return;
    }
    const cId = Number(courierIdStr);
    setSelectedCourierId(cId);
    const selected = availableCouriers.find((c) => c.id === cId);
    if (selected) {
      setCourierName(selected.name);
      setCourierPhone(selected.phone);
      if (selected.vehicle_type_preference) {
        setVehicleType(selected.vehicle_type_preference);
      }
    }
  };

  // Handle master vehicle selection
  const handleSelectMasterVehicle = (vehicleIdStr: string) => {
    if (!vehicleIdStr) {
      setSelectedVehicleId('');
      return;
    }
    const vId = Number(vehicleIdStr);
    setSelectedVehicleId(vId);
    const selected = availableVehicles.find((v) => v.id === vId);
    if (selected) {
      setVehicleType(selected.vehicle_type);
      setVehiclePlateNumber(selected.license_plate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrderId) {
      setErrorMsg('Order ID tidak ditemukan.');
      return;
    }

    if (!courierName.trim()) {
      setErrorMsg('Nama Kurir / Driver wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        order_id: targetOrderId,
        courier_id: selectedCourierId || undefined,
        vehicle_id: selectedVehicleId || undefined,
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
        toast.success(`Kurir ${courierName} berhasil ditugaskan untuk pesanan ${orderNumber}.`, 'Penugasan Berhasil');
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
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Penugasan Kurir &amp; Armada
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Pesanan: <strong>{orderNumber}</strong> ({targetDate})
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
          {/* Smart Master Courier Selector */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                Pilih Driver dari Master Data
              </label>
              <span className="text-[10px] text-amber-700 font-medium">
                {isLoadingResources ? 'Mengecek ketersediaan...' : `${availableCouriers.filter(c => c.is_available).length} Siap Standby`}
              </span>
            </div>

            <select
              value={selectedCourierId}
              onChange={(e) => handleSelectMasterCourier(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
            >
              <option value="">-- Pilih dari Master Kurir atau Ketik Manual --</option>
              {availableCouriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.is_available ? '🟢' : '🟡'} {c.name} ({c.phone}) - {c.status_label}
                  {!c.is_available && c.current_job ? ` (Tiba: ${c.current_job.time_target})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Courier Name & Phone (Auto-filled or manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nama Driver *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rahmat Hidayat"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                No. WhatsApp Driver
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

          {/* Smart Master Vehicle Selector */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-blue-600" />
                Pilih Armada Kendaraan dari Master Fleet
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                {isLoadingResources ? 'Mengecek...' : `${availableVehicles.filter(v => v.is_available).length} Siap Jalan`}
              </span>
            </div>

            <select
              value={selectedVehicleId}
              onChange={(e) => handleSelectMasterVehicle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
            >
              <option value="">-- Pilih dari Master Armada atau Ketik Manual --</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.is_available ? '🟢' : v.condition_status !== 'good' ? '🔴' : '🟡'} {v.name} ({v.license_plate}) - {v.max_capacity_box} Box - {v.status_label}
                </option>
              ))}
            </select>
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
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="motorcycle">Sepeda Motor (Box)</option>
                  <option value="car">Mobil Pribadi / MPV</option>
                  <option value="van">Blind Van (GranMax)</option>
                  <option value="truck">Truk Box Ekspedisi</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Plat Nomor Polisi
              </label>
              <input
                type="text"
                placeholder="B 1234 ABC"
                value={vehiclePlateNumber}
                onChange={(e) => setVehiclePlateNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 text-xs uppercase font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Target Time & Batch Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Target Jam Tiba di Lokasi
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
                Batch Rute (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: RUTE-SELATAN-01"
                value={deliveryBatchCode}
                onChange={(e) => setDeliveryBatchCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Alamat Lengkap Tujuan Pengiriman *
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
                Nama Penerima Acara
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
              Catatan Pengiriman / Patokan Lokasi
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
              {isSubmitting ? 'Menyimpan...' : 'Tugaskan Driver Sekarang'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
