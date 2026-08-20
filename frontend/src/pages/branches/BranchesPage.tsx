import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle2,
  RefreshCw,
  Search,
  Home,
} from 'lucide-react';
import type { Branch } from '../../types/branch';

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [picName, setPicName] = useState('');
  const [isMain, setIsMain] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/tenant/branches');
      setBranches(res.data.data || []);
    } catch (err) {
      console.error('Fetch branches failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleOpenCreateModal = () => {
    setEditingBranch(null);
    setName('');
    setCode('');
    setPhone('');
    setEmail('');
    setCity('');
    setAddress('');
    setPicName('');
    setIsMain(false);
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setName(branch.name);
    setCode(branch.code || '');
    setPhone(branch.phone || '');
    setEmail(branch.email || '');
    setCity(branch.city || '');
    setAddress(branch.address || '');
    setPicName(branch.pic_name || '');
    setIsMain(branch.is_main);
    setIsActive(branch.is_active);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama cabang wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      pic_name: picName.trim() || undefined,
      is_main: isMain,
      is_active: isActive,
    };

    try {
      if (editingBranch) {
        await apiClient.put(`/tenant/branches/${editingBranch.id}`, payload);
      } else {
        await apiClient.post('/tenant/branches', payload);
      }
      setIsModalOpen(false);
      fetchBranches();
    } catch (err: any) {
      console.error('Save branch failed:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan data cabang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (branch.is_main) {
      alert('Cabang utama (Central Kitchen) tidak dapat dihapus.');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus cabang "${branch.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/branches/${branch.id}`);
      fetchBranches();
    } catch (err: any) {
      console.error('Delete branch failed:', err);
      alert(err.response?.data?.message || 'Gagal menghapus cabang.');
    }
  };

  const filteredBranches = branches.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.code && b.code.toLowerCase().includes(q)) ||
      (b.city && b.city.toLowerCase().includes(q)) ||
      (b.pic_name && b.pic_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-amber-600" /> Manajemen Cabang &amp; Dapur Satelit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola jaringan multi-lokasi dapur katering: Dapur Utama (Central Kitchen), dapur satelit per kota, dan penanggung jawab operasional
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBranches}
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </Button>

          <Button onClick={handleOpenCreateModal} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs">
            <Plus className="w-4 h-4" /> Tambah Cabang Dapur
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama cabang, kode, kota, atau nama PIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
            />
          </div>

          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
            {branches.length} Lokasi Terdaftar
          </span>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama &amp; Kode Cabang</th>
                <th className="px-6 py-3.5">Kota &amp; Alamat</th>
                <th className="px-6 py-3.5">Kontak &amp; Email</th>
                <th className="px-6 py-3.5">Penanggung Jawab (PIC)</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Memuat data cabang...
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">Belum Ada Cabang Dapur Tambahan</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Tambahkan dapur satelit atau cabang operasional baru untuk mendukung ekspansi pengiriman multi-kota.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleOpenCreateModal}
                        className="mt-2 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Cabang Dapur
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBranches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            b.is_main
                              ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-500/20'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {b.is_main ? <Home className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="font-bold text-slate-900 text-xs block">{b.name}</strong>
                            {b.is_main && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Dapur Utama (HQ)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            Kode: {b.code || 'Tanpa Kode'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-xs">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{b.city || 'Kota belum diisi'}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 pl-4">
                          {b.address || '—'}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-xs text-slate-700">
                        {b.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="font-mono">{b.phone}</span>
                          </div>
                        )}
                        {b.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{b.email}</span>
                          </div>
                        )}
                        {!b.phone && !b.email && <span className="text-slate-400">—</span>}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.pic_name || 'Belum ditugaskan'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          b.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {b.is_active ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(b)}
                          className="p-1.5 text-slate-600 hover:text-slate-900"
                          title="Edit Cabang"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {!b.is_main && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(b)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 border-rose-200"
                            title="Hapus Cabang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingBranch ? 'Edit Cabang Dapur' : 'Tambah Cabang Dapur Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Isi detail lokasi operasional dan penanggung jawab
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Cabang / Dapur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="mis: Dapur Satelit BSD Serpong"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kode Singkatan Cabang
                  </label>
                  <input
                    type="text"
                    placeholder="mis: KDS-BSD"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kota Operasional
                  </label>
                  <input
                    type="text"
                    placeholder="mis: Tangerang Selatan"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="mis: 081288990011"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Cabang
                  </label>
                  <input
                    type="email"
                    placeholder="mis: bsd@catering.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Penanggung Jawab Cabang (PIC)
                  </label>
                  <input
                    type="text"
                    placeholder="mis: Chef Anton / Bpk. Rudi"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Alamat Lengkap Dapur
                  </label>
                  <textarea
                    rows={2}
                    placeholder="mis: Ruko BSD Boulevard No. 12, Sektor 7"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isMain}
                    onChange={(e) => setIsMain(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Jadikan Dapur Utama (Central Kitchen)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Status Aktif</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Cabang'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
