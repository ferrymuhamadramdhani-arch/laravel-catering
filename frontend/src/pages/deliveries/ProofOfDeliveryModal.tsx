import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import {
  PackageCheck,
  X,
  AlertCircle,
  Camera,
  PenTool,
  RotateCcw,
  MapPin,
  Check,
  WifiOff,
} from 'lucide-react';
import type { Delivery, OfflineDeliveryRecord } from '../../types/delivery';

interface ProofOfDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
  onSuccess: (offline?: boolean) => void;
}

export const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({
  isOpen,
  onClose,
  delivery,
  onSuccess,
}) => {
  const [receiverName, setReceiverName] = useState('');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Canvas Signature state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && delivery) {
      setReceiverName(delivery.recipient_name || delivery.order?.recipient_name || delivery.order?.customer?.name || '');
      setNotes('');
      setPhotoPreview(null);
      setPhotoFile(null);
      setHasSignature(false);
      setErrorMsg(null);

      // Attempt to capture GPS location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocationCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          (err) => {
            console.warn('Geolocation capture skipped/denied:', err);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }
  }, [isOpen, delivery]);

  // Handle Canvas Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a'; // slate-900
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPhotoPreview(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen || !delivery) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName.trim()) {
      setErrorMsg('Nama penerima wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Get Signature data URL if drawn
    let signatureDataUrl: string | undefined;
    if (hasSignature && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    // Check online status
    const isOnline = navigator.onLine;

    if (!isOnline) {
      // OFFLINE MODE: Save to localStorage queue!
      try {
        const offlineQueueKey = `cateros_offline_deliveries_${delivery.tenant_id || 'default'}`;
        const existingRaw = localStorage.getItem(offlineQueueKey);
        const existing: OfflineDeliveryRecord[] = existingRaw ? JSON.parse(existingRaw) : [];

        const record: OfflineDeliveryRecord = {
          id: 'pod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          delivery_id: delivery.id,
          order_id: delivery.order_id,
          order_number: delivery.order?.order_number,
          status: 'delivered',
          receiver_name: receiverName.trim(),
          signature_data: signatureDataUrl,
          photo_url: photoPreview || undefined,
          notes: notes.trim() || undefined,
          delivered_at: new Date().toISOString(),
          synced: false,
          timestamp: Date.now(),
        };

        existing.push(record);
        localStorage.setItem(offlineQueueKey, JSON.stringify(existing));

        alert('Mode Offline: Bukti terima (POD) tersimpan di perangkat lokal dan akan disinkronkan otomatis saat kembali online.');
        onSuccess(true);
        onClose();
      } catch (err) {
        console.error('Save offline POD failed:', err);
        setErrorMsg('Gagal menyimpan data offline.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // ONLINE MODE: Send to API
    try {
      const formData = new FormData();
      formData.append('receiver_name', receiverName.trim());
      if (notes.trim()) formData.append('notes', notes.trim());
      if (signatureDataUrl) formData.append('signature_data', signatureDataUrl);
      if (locationCoords?.lat) formData.append('latitude', locationCoords.lat.toString());
      if (locationCoords?.lng) formData.append('longitude', locationCoords.lng.toString());
      if (photoFile) formData.append('photo', photoFile);

      const res = await apiClient.post(`/tenant/deliveries/${delivery.id}/proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        alert('Bukti penerimaan barang (POD) berhasil disimpan & pesanan selesai.');
        onSuccess(false);
        onClose();
      }
    } catch (err: any) {
      console.error('Submit POD failed:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal mengirim bukti terima.');
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
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Bukti Serah Terima Pesanan (POD)
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Order: <strong>{delivery.order?.order_number || delivery.delivery_number}</strong>
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

        {/* Offline Warning Banner */}
        {!navigator.onLine && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 shrink-0">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Perangkat sedang <strong>Offline</strong>. POD akan disimpan di memori HP dan disinkronkan otomatis saat ada sinyal.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Receiver Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Nama Lengkap Penerima di Lokasi *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ibu Rina / Satpam Pak Eko"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Photo Capture */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Foto Bukti Penerimaan / Serah Terima (Opsional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer border border-slate-200 transition-colors">
                <Camera className="w-4 h-4 text-slate-500" />
                <span>Ambil / Upload Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>

              {photoPreview && (
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                    className="absolute top-0 right-0 bg-slate-900/70 text-white p-0.5 rounded-bl"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Digital Signature Canvas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-slate-500" />
                Tanda Tangan Digital Penerima
              </label>
              {hasSignature && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Hapus Goresan
                </button>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden relative">
              <canvas
                ref={canvasRef}
                width={360}
                height={130}
                className="w-full h-[130px] touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none select-none">
                  Goreskan tanda tangan penerima di sini...
                </span>
              )}
            </div>
          </div>

          {/* GPS Coordinates preview */}
          {locationCoords && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <MapPin className="w-3 h-3 text-emerald-500" />
              <span>
                Lokasi GPS: {locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Catatan Serah Terima
            </label>
            <input
              type="text"
              placeholder="Contoh: Paket diterima utuh dan sudah diperiksa"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Selesai Kirim'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
