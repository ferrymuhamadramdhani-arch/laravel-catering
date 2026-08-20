import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  X,
  Plus,
  Trash2,
  User,
  ShoppingBag,
  UtensilsCrossed,
  TrendingUp,
  CreditCard,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { ModalPortal } from '../../components/ui/Modal';
import type { Customer, DeliveryArea } from '../../types/crm';
import type { MenuItem, MenuPackage } from '../../types/menu';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormItem {
  item_type: 'menu_package' | 'menu_item' | 'custom';
  menu_package_id?: number | null;
  menu_item_id?: number | null;
  item_name: string;
  unit_price: number;
  unit_hpp: number;
  quantity: number;
  portion_unit: string;
  notes: string;
}

const EVENT_TYPES = [
  'Nasi Kotak (Box)',
  'Prasmanan (Buffet)',
  'Snack Box / Coffee Break',
  'Tumpeng & Syukuran',
  'Wedding & Resepsi',
  'Pernikahan / Catering Harian',
  'Corporate Lunch / Rapat',
  'Lainnya',
];

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<MenuPackage[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('Nasi Kotak (Box)');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [deliveryTime, setDeliveryTime] = useState('11:30');
  const [deliveryAreaId, setDeliveryAreaId] = useState<number | ''>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  // Items
  const [items, setItems] = useState<FormItem[]>([
    {
      item_type: 'menu_package',
      menu_package_id: null,
      menu_item_id: null,
      item_name: '',
      unit_price: 0,
      unit_hpp: 0,
      quantity: 20,
      portion_unit: 'box',
      notes: '',
    },
  ]);

  // Financials
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [orderStatus, setOrderStatus] = useState<'confirmed' | 'draft'>('confirmed');

  useEffect(() => {
    if (!isOpen) return;

    const fetchMasterData = async () => {
      try {
        const [custRes, pkgRes, menuRes, areaRes] = await Promise.all([
          apiClient.get('/tenant/customers?all=1'),
          apiClient.get('/tenant/menu-packages?all=1'),
          apiClient.get('/tenant/menu-items?all=1'),
          apiClient.get('/tenant/delivery-areas?all=1'),
        ]);

        setCustomers(custRes.data.data || []);
        setPackages(pkgRes.data.data || []);
        setMenuItems(menuRes.data.data || []);
        setDeliveryAreas(areaRes.data.data || []);
      } catch (err: any) {
        console.error('Error fetching order master data:', err);
      }
    };

    fetchMasterData();
  }, [isOpen]);

  // Handle Customer Selection -> Auto fill address & recipient
  const handleCustomerChange = (id: number) => {
    setCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    if (selected) {
      if (!recipientName) setRecipientName(selected.pic_name || selected.name);
      if (!recipientPhone && selected.phone) setRecipientPhone(selected.phone);
      if (!deliveryAddress && selected.address) setDeliveryAddress(selected.address);
    }
  };

  // Handle Delivery Area Selection -> Auto fill delivery fee
  const handleDeliveryAreaChange = (areaId: number | '') => {
    setDeliveryAreaId(areaId);
    if (areaId) {
      const selected = deliveryAreas.find((a) => a.id === areaId);
      if (selected) {
        setDeliveryFee(Number(selected.delivery_fee) || 0);
      }
    }
  };

  // Item handlers
  const handleItemTypeChange = (idx: number, type: 'menu_package' | 'menu_item' | 'custom') => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = {
        item_type: type,
        menu_package_id: null,
        menu_item_id: null,
        item_name: '',
        unit_price: 0,
        unit_hpp: 0,
        quantity: next[idx].quantity || 1,
        portion_unit: type === 'menu_package' ? 'box' : 'porsi',
        notes: '',
      };
      return next;
    });
  };

  const handlePackageSelect = (idx: number, pkgId: number) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    setItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        menu_package_id: pkg.id,
        item_name: pkg.name,
        unit_price: Number(pkg.selling_price) || 0,
        unit_hpp: Number(pkg.calculated_hpp) || 0,
        portion_unit: 'box/pax',
      };
      return next;
    });
  };

  const handleMenuItemSelect = (idx: number, menuId: number) => {
    const menu = menuItems.find((m) => m.id === menuId);
    if (!menu) return;
    setItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        menu_item_id: menu.id,
        item_name: menu.name,
        unit_price: Number(menu.selling_price) || 0,
        unit_hpp: Number(menu.calculated_hpp) || 0,
        portion_unit: menu.portion_unit || 'porsi',
      };
      return next;
    });
  };

  const handleUpdateItem = (idx: number, key: keyof FormItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_type: 'menu_package',
        menu_package_id: null,
        menu_item_id: null,
        item_name: '',
        unit_price: 0,
        unit_hpp: 0,
        quantity: 10,
        portion_unit: 'box',
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Totals & Margin Calculations
  const subtotal = items.reduce((acc, it) => acc + (Number(it.unit_price) || 0) * (it.quantity || 0), 0);
  const totalHpp = items.reduce((acc, it) => acc + (Number(it.unit_hpp) || 0) * (it.quantity || 0), 0);
  const grossProfit = subtotal - totalHpp;
  const marginPct = subtotal > 0 ? ((grossProfit / subtotal) * 100).toFixed(1) : '0';
  const totalAmount = Math.max(0, subtotal + Number(deliveryFee || 0) - Number(discountAmount || 0));
  const remainingBill = Math.max(0, totalAmount - Number(downPaymentAmount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Silakan pilih pelanggan terlebih dahulu.');
      return;
    }

    if (items.length === 0 || items.some((it) => !it.item_name && !it.menu_package_id && !it.menu_item_id)) {
      setError('Pastikan semua item menu atau paket telah dipilih dengan benar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_id: customerId,
        event_name: eventName || undefined,
        event_type: eventType,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime || undefined,
        delivery_area_id: deliveryAreaId || undefined,
        delivery_address: deliveryAddress || undefined,
        recipient_name: recipientName || undefined,
        recipient_phone: recipientPhone || undefined,
        delivery_fee: Number(deliveryFee) || 0,
        discount_amount: Number(discountAmount) || 0,
        down_payment_amount: Number(downPaymentAmount) || 0,
        status: orderStatus,
        notes: notes || undefined,
        items: items.map((it) => ({
          item_type: it.item_type,
          menu_package_id: it.menu_package_id || undefined,
          menu_item_id: it.menu_item_id || undefined,
          item_name: it.item_name || undefined,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          notes: it.notes || undefined,
        })),
      };

      const res = await apiClient.post('/tenant/orders', payload);
      const newOrderNum = res.data.data?.order_number || '';
      toast.success(`Pesanan ${newOrderNum} berhasil disimpan dan dicatat ke sistem!`, 'Pesanan Berhasil Dibuat');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Create order error:', err);
      setError(err.response?.data?.message || 'Gagal membuat pesanan baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" /> Input Pesanan Katering Baru
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Form cepat pembuatan pesanan untuk tim Sales/CS &amp; reservasi dapur
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Customer & Event Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-amber-600" /> 1. Data Pelanggan &amp; Acara
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Selector */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Pelanggan *
                </label>
                <div className="relative">
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerChange(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 font-medium cursor-pointer appearance-none"
                    required
                  >
                    <option value="">-- Pilih dari database pelanggan --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.type === 'corporate' ? '(Korporat)' : '(Individu)'} - {c.phone || c.city || ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Layanan / Acara
                </label>
                <div className="relative">
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 font-medium cursor-pointer appearance-none"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Nama Acara / Keterangan Order"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Contoh: Rapat Evaluasi Bulanan Q3 / Resepsi Pernikahan"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tanggal Kirim *
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Waktu Sampai
                  </label>
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Zona Pengiriman
                </label>
                <div className="relative">
                  <select
                    value={deliveryAreaId}
                    onChange={(e) =>
                      handleDeliveryAreaChange(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium cursor-pointer appearance-none"
                  >
                    <option value="">-- Bebas / Tanpa Zona --</option>
                    {deliveryAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.delivery_fee)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <Input
                  label="Nama Penerima (di Lokasi)"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nama PIC di lokasi kirim"
                />
              </div>

              <div>
                <Input
                  label="Nomor Telepon Penerima"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Lengkap Pengiriman
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={2}
                placeholder="Gedung, Lantai, Ruang, Jl. Sudirman No..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none transition"
              />
            </div>
          </div>

          {/* Section 2: Items & Packages Builder */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-600" /> 2. Rincian Item Pesanan / Menu
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Tambah Item Menu
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Item Type Switcher */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-500">#{idx + 1}</span>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleItemTypeChange(idx, 'menu_package')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            item.item_type === 'menu_package'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Paket Menu
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemTypeChange(idx, 'menu_item')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            item.item_type === 'menu_item'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Menu Satuan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemTypeChange(idx, 'custom')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            item.item_type === 'custom'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    </div>

                    {/* Delete button */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Item Selectors & Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    {/* Item Dropdown or Name */}
                    <div className="md:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pilihan {item.item_type === 'menu_package' ? 'Paket' : 'Menu'}
                      </label>

                      {item.item_type === 'menu_package' ? (
                        <div className="relative">
                          <select
                            value={item.menu_package_id || ''}
                            onChange={(e) => handlePackageSelect(idx, Number(e.target.value))}
                            className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium cursor-pointer appearance-none"
                            required
                          >
                            <option value="">-- Pilih Paket Menu --</option>
                            {packages.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatCurrency(p.selling_price)})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      ) : item.item_type === 'menu_item' ? (
                        <div className="relative">
                          <select
                            value={item.menu_item_id || ''}
                            onChange={(e) => handleMenuItemSelect(idx, Number(e.target.value))}
                            className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium cursor-pointer appearance-none"
                            required
                          >
                            <option value="">-- Pilih Menu Satuan --</option>
                            {menuItems.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({formatCurrency(m.selling_price)})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => handleUpdateItem(idx, 'item_name', e.target.value)}
                          placeholder="Nama item kustom..."
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                          required
                        />
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Porsi / Jumlah
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-bold text-slate-800"
                        required
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Harga Satuan (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'unit_price', Math.max(0, Number(e.target.value)))
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-slate-800"
                        required
                      />
                    </div>

                    {/* Subtotal Display */}
                    <div className="md:col-span-3 text-right pb-1">
                      <span className="text-[10px] text-slate-400 block">Subtotal Item</span>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency((Number(item.unit_price) || 0) * (item.quantity || 0))}
                      </span>
                    </div>
                  </div>

                  {/* Item Notes */}
                  <div>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => handleUpdateItem(idx, 'notes', e.target.value)}
                      placeholder="Catatan khusus koki (mis: 10 tanpa sambal, pisah kuah...)"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Financial Summary & Confirmation */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <CreditCard className="w-4 h-4 text-amber-600" /> 3. Perhitungan Biaya &amp; Uang Muka (DP)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Financial Inputs */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Ongkos Kirim (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Diskon Potongan (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-red-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Uang Muka / DP Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={downPaymentAmount}
                    onChange={(e) => setDownPaymentAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-bold text-emerald-700"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {downPaymentAmount >= totalAmount && totalAmount > 0
                      ? '● Status: LUNAS (Paid in Full)'
                      : downPaymentAmount > 0
                      ? `● Status: DP Diterima (Sisa: ${formatCurrency(remainingBill)})`
                      : '● Status: Belum Bayar (Unpaid)'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Catatan Khusus Pesanan
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Keterangan tambahan untuk tim dapur & kurir..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* Live Cost & Margin Calculation Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Subtotal Menu ({items.length} item)</span>
                    <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Estimasi HPP Modal Bahan (BOM)</span>
                    <span className="text-amber-400 font-medium">{formatCurrency(totalHpp)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Estimasi Laba Kotor (Margin)</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {formatCurrency(grossProfit)} ({marginPct}%)
                    </span>
                  </div>

                  {deliveryFee > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Ongkos Kirim</span>
                      <span>+{formatCurrency(deliveryFee)}</span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-red-400">
                      <span>Diskon</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">TOTAL TAGIHAN</span>
                    <span className="text-xl font-extrabold text-amber-400">{formatCurrency(totalAmount)}</span>
                  </div>

                  {downPaymentAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Uang Muka (DP)</span>
                      <span className="text-emerald-400 font-medium">-{formatCurrency(downPaymentAmount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 font-medium">Sisa Pelunasan</span>
                    <span className="font-bold text-white">{formatCurrency(remainingBill)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Simpan sebagai:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs bg-slate-50">
                <button
                  type="button"
                  onClick={() => setOrderStatus('confirmed')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                    orderStatus === 'confirmed'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✓ Konfirmasi (Confirmed)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatus('draft')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                    orderStatus === 'draft'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Simpan Draft
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" isLoading={isSubmitting} className="min-w-[140px]">
                {orderStatus === 'confirmed' ? 'Buat & Konfirmasi Order' : 'Simpan Draft Order'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
