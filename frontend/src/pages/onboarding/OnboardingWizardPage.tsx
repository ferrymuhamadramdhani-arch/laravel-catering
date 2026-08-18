import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Building2,
  Utensils,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import type { BankAccount } from '../../types/auth';

const CATERING_TYPES = [
  { id: 'nasi_kotak', label: 'Nasi Kotak / Box Rice', desc: 'Pesanan porsi per kotak untuk event & kantoran' },
  { id: 'prasmanan', label: 'Prasmanan / Buffet', desc: 'Penyajian prasmanan prasmanan untuk acara keluarga & pesta' },
  { id: 'wedding', label: 'Wedding & Resepsi', desc: 'Paket pernikahan skala sedang hingga besar' },
  { id: 'corporate', label: 'Catering Harian / Korporat', desc: 'Langganan makan siang harian kantor & pabrik' },
  { id: 'tumpeng', label: 'Nasi Tumpeng & Tradisional', desc: 'Tumpeng mini & jumbo untuk perayaan' },
  { id: 'snack_box', label: 'Snack Box & Coffee Break', desc: 'Kue basah, jajanan pasar & pastry untuk seminar' },
];

const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const OnboardingWizardPage: React.FC = () => {
  const { currentTenant, setCurrentTenant } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 State: Profil Bisnis
  const [businessName, setBusinessName] = useState(currentTenant?.name || '');
  const [phone, setPhone] = useState(currentTenant?.phone || '');
  const [email, setEmail] = useState(currentTenant?.email || '');
  const [address, setAddress] = useState(currentTenant?.address || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentTenant?.logo_url || null);

  // Step 2 State: Jenis Layanan & Area
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    currentTenant?.business_type || ['nasi_kotak', 'prasmanan']
  );
  const [areaInput, setAreaInput] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>(
    currentTenant?.service_areas || ['Jakarta Selatan', 'Jakarta Pusat']
  );

  // Step 3 State: Jam Operasional & Rekening
  const [openTime, setOpenTime] = useState(currentTenant?.operating_hours?.open || '07:00');
  const [closeTime, setCloseTime] = useState(currentTenant?.operating_hours?.close || '21:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(
    currentTenant?.operating_hours?.days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(
    currentTenant?.bank_accounts && currentTenant.bank_accounts.length > 0
      ? currentTenant.bank_accounts
      : [{ bank_name: 'BCA', account_number: '', account_name: '' }]
  );

  useEffect(() => {
    // Load existing tenant profile if available
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/tenant/profile');
        const data = res.data.data;
        if (data) {
          setBusinessName(data.name || '');
          setPhone(data.phone || '');
          setEmail(data.email || '');
          setAddress(data.address || '');
          if (data.logo_url) setLogoPreview(data.logo_url);
          if (data.business_type?.length) setSelectedTypes(data.business_type);
          if (data.service_areas?.length) setServiceAreas(data.service_areas);
          if (data.operating_hours) {
            setOpenTime(data.operating_hours.open || '07:00');
            setCloseTime(data.operating_hours.close || '21:00');
            setSelectedDays(data.operating_hours.days || DAYS_OF_WEEK);
          }
          if (data.bank_accounts?.length) setBankAccounts(data.bank_accounts);
        }
      } catch (e) {
        console.error('Error loading tenant profile:', e);
      }
    };
    fetchProfile();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const toggleType = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== typeId));
      }
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const addArea = () => {
    if (areaInput.trim() && !serviceAreas.includes(areaInput.trim())) {
      setServiceAreas([...serviceAreas, areaInput.trim()]);
      setAreaInput('');
    }
  };

  const removeArea = (index: number) => {
    setServiceAreas(serviceAreas.filter((_, i) => i !== index));
  };

  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, { bank_name: 'BCA', account_number: '', account_name: '' }]);
  };

  const updateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
    const updated = [...bankAccounts];
    updated[index][field] = value;
    setBankAccounts(updated);
  };

  const removeBankAccount = (index: number) => {
    if (bankAccounts.length > 1) {
      setBankAccounts(bankAccounts.filter((_, i) => i !== index));
    }
  };

  const handleSaveStep = async (nextStepNumber: number) => {
    setError(null);
    setIsLoading(true);

    try {
      // 1. Upload logo if changed
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        await apiClient.post('/tenant/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 2. Save profile data
      const payload = {
        name: businessName,
        phone,
        email,
        address,
        business_type: selectedTypes,
        service_areas: serviceAreas,
        operating_hours: {
          open: openTime,
          close: closeTime,
          days: selectedDays,
        },
        bank_accounts: bankAccounts.filter((b) => b.account_number.trim() !== ''),
      };

      const res = await apiClient.put('/tenant/profile', payload);
      setCurrentTenant(res.data.data);
      setStep(nextStepNumber);
    } catch (err: any) {
      console.error('Save step error:', err);
      setError(err.response?.data?.message || 'Gagal menyimpan perubahan. Periksa kembali form.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.post('/tenant/complete-onboarding');
      setCurrentTenant(res.data.data);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Complete onboarding error:', err);
      setError(err.response?.data?.message || 'Gagal menyelesaikan onboarding.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="max-w-3xl mx-auto w-full pt-4 pb-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-amber-500/20">
            C
          </div>
          <div>
            <span className="text-xl font-bold text-white block">CaterOS</span>
            <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
              Setup Wizard Bisnis Catering
            </span>
          </div>
        </div>
        <Badge variant="warning">Langkah {step} dari 4</Badge>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="max-w-3xl mx-auto w-full mb-8 relative z-10">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
          {[
            { num: 1, label: 'Identitas Bisnis', icon: Building2 },
            { num: 2, label: 'Jenis Catering', icon: Utensils },
            { num: 3, label: 'Jam & Rekening', icon: Clock },
            { num: 4, label: 'Selesai', icon: CheckCircle2 },
          ].map((item) => {
            const Icon = item.icon;
            const isCompleted = step > item.num;
            const isCurrent = step === item.num;
            return (
              <div
                key={item.num}
                className={`p-2.5 rounded-lg border transition-all ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : isCompleted
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold hidden sm:inline">{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="max-w-3xl mx-auto w-full flex-1 relative z-10">
        <Card className="bg-slate-950/80 border-slate-800 text-slate-100 shadow-2xl p-6 sm:p-8">
          {error && (
            <div className="p-3 mb-6 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: PROFIL BISNIS */}
          {step === 1 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle className="text-white text-xl">Profil & Identitas Catering</CardTitle>
                <CardDescription className="text-slate-400">
                  Lengkapi data profil usaha catering Anda yang akan muncul pada invoice dan portal pelanggan.
                </CardDescription>
              </CardHeader>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
                {/* Logo Upload Section */}
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 text-center">
                  <div className="w-24 h-24 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden mb-3 relative">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-xs font-medium text-white transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Pilih Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </label>
                  <span className="text-[10px] text-slate-500 mt-2">Maks. 2MB (PNG/JPG)</span>
                </div>

                {/* Form Fields */}
                <div className="sm:col-span-2 space-y-3.5">
                  <Input
                    label="Nama Bisnis Catering"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="No. Telepon / WhatsApp"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="081234567890"
                    />
                    <Input
                      label="Email Kontak Bisnis"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@catering.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Alamat Dapur Utama
                    </label>
                    <textarea
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Jl. Raya No. 123, Kelurahan, Kecamatan, Kota"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <Button
                  onClick={() => handleSaveStep(2)}
                  isLoading={isLoading}
                  className="gap-2"
                >
                  Lanjut ke Jenis Layanan <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: JENIS CATERING & AREA LAYANAN */}
          {step === 2 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle className="text-white text-xl">Jenis Layanan & Jangkauan Pengiriman</CardTitle>
                <CardDescription className="text-slate-400">
                  Pilih spesialisasi katering yang Anda sediakan dan cakupan wilayah antar pesanan.
                </CardDescription>
              </CardHeader>

              {/* Catering Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  Spesialisasi Menu & Layanan (Pilih minimal 1)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CATERING_TYPES.map((type) => {
                    const isSelected = selectedTypes.includes(type.id);
                    return (
                      <div
                        key={type.id}
                        onClick={() => toggleType(type.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm shadow-amber-500/10'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected ? 'bg-amber-500 text-white' : 'border border-slate-600'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{type.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{type.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Areas Tag Input */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Wilayah / Kota Jangkauan Layanan
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={areaInput}
                    onChange={(e) => setAreaInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArea())}
                    placeholder="Contoh: Jakarta Selatan, Depok, BSD..."
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                  <Button type="button" variant="secondary" onClick={addArea} className="gap-1">
                    <Plus className="w-4 h-4" /> Tambah Area
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeArea(idx)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2 text-slate-300">
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </Button>
                <Button onClick={() => handleSaveStep(3)} isLoading={isLoading} className="gap-2">
                  Lanjut ke Jam & Pembayaran <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: JAM OPERASIONAL & REKENING PEMBAYARAN */}
          {step === 3 && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle className="text-white text-xl">Jam Operasional & Rekening Pembayaran</CardTitle>
                <CardDescription className="text-slate-400">
                  Atur jam kerja dapur dan nomor rekening bank untuk menerima pembayaran manual dari pemesan.
                </CardDescription>
              </CardHeader>

              {/* Operating Hours */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Jam Buka & Tutup Dapur
                </label>
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <Input
                    label="Jam Buka"
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                  />
                  <Input
                    label="Jam Tutup"
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Hari Operasional
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bank Accounts */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Rekening Bank Pembayaran (Invoice Manual)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBankAccount}
                    className="gap-1 text-slate-300 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Rekening
                  </Button>
                </div>

                {bankAccounts.map((account, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-10 gap-2 items-end p-3 rounded-lg bg-slate-900/60 border border-slate-800"
                  >
                    <div className="sm:col-span-3">
                      <Input
                        label="Bank"
                        placeholder="BCA / Mandiri / BNI"
                        value={account.bank_name}
                        onChange={(e) => updateBankAccount(index, 'bank_name', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        label="No. Rekening"
                        placeholder="1234567890"
                        value={account.account_number}
                        onChange={(e) => updateBankAccount(index, 'account_number', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        label="Atas Nama"
                        placeholder="PT Catering Sejahtera"
                        value={account.account_name}
                        onChange={(e) => updateBankAccount(index, 'account_name', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeBankAccount(index)}
                        disabled={bankAccounts.length === 1}
                        className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2 text-slate-300">
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </Button>
                <Button onClick={() => handleSaveStep(4)} isLoading={isLoading} className="gap-2">
                  Tinjau & Konfirmasi <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: KONFIRMASI & SELESAI */}
          {step === 4 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Setup Bisnis Selesai! 🎉</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Workspace <span className="text-white font-semibold">{businessName}</span> telah siap digunakan.
                  Anda sekarang dapat mengelola menu, pesanan, dan mengundang tim staf.
                </p>
              </div>

              {/* Summary Box */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left max-w-md mx-auto space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Nama Usaha</span>
                  <span className="text-white font-medium">{businessName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Layanan</span>
                  <span className="text-white font-medium">{selectedTypes.join(', ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Area Layanan</span>
                  <span className="text-white font-medium">{serviceAreas.join(', ')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Jam Operasional</span>
                  <span className="text-white font-medium">{openTime} - {closeTime} ({selectedDays.length} hari)</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-2 text-slate-300">
                  <ArrowLeft className="w-4 h-4" /> Edit Data
                </Button>
                <Button onClick={handleCompleteOnboarding} isLoading={isLoading} className="gap-2 px-8">
                  Masuk ke Dashboard Utama <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto w-full pt-6 pb-2 text-center text-xs text-slate-600 relative z-10">
        &copy; {new Date().getFullYear()} CaterOS Platform. Dokumentasi API tersedia di <span className="text-slate-400">/api/documentation</span>
      </div>
    </div>
  );
};
