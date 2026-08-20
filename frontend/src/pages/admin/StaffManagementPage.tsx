import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Shield,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  ChefHat,
  Truck,
  Boxes,
  ShoppingBag,
  ShieldCheck,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import { ModalPortal } from '../../components/ui/Modal';
import { toast } from '../../stores/toastStore';
import type { StaffUser } from '../../types/auth';
import type { Role } from '../../types/role';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  owner: { label: 'Pemilik (Owner)', color: 'bg-amber-100 text-amber-900 border-amber-300', icon: Shield },
  admin: { label: 'Administrator', color: 'bg-purple-100 text-purple-900 border-purple-300', icon: Shield },
  sales: { label: 'Sales / CS', color: 'bg-blue-100 text-blue-900 border-blue-300', icon: ShoppingBag },
  kitchen: { label: 'Kepala Dapur', color: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: ChefHat },
  warehouse: { label: 'Staff Gudang', color: 'bg-orange-100 text-orange-900 border-orange-300', icon: Boxes },
  courier: { label: 'Kurir / Driver', color: 'bg-teal-100 text-teal-900 border-teal-300', icon: Truck },
};

export const StaffManagementPage: React.FC = () => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Pagination State (Default 10)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<string>('sales');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsersAndRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        per_page: perPage,
      };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get('/tenant/users', { params }),
        apiClient.get('/tenant/roles'),
      ]);

      setUsers(usersRes.data.data || []);
      if (usersRes.data.meta) {
        setPaginationMeta(usersRes.data.meta);
      } else {
        setPaginationMeta({
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: (usersRes.data.data || []).length,
        });
      }
      setRoles(rolesRes.data.data || []);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      setError(err.response?.data?.message || 'Gagal mengambil data staf tenant.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, [page, perPage, roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsersAndRoles();
  };

  const handleOpenAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormRole(roles.find((r) => r.slug !== 'owner')?.slug || 'sales');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: StaffUser) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormPassword('');
    setFormRole(user.role);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/tenant/users', {
        name: formName,
        email: formEmail,
        password: formPassword,
        phone: formPhone || undefined,
        role: formRole,
      });
      toast.success(`Akun staf "${formName}" berhasil dibuat!`, 'Berhasil Disimpan');
      setIsAddModalOpen(false);
      fetchUsersAndRoles();
    } catch (err: any) {
      console.error('Create user error:', err);
      setFormError(err.response?.data?.message || 'Gagal menambahkan staf baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.put(`/tenant/users/${selectedUser.id}`, {
        name: formName,
        phone: formPhone || undefined,
        role: formRole,
        password: formPassword ? formPassword : undefined,
      });
      toast.success(`Data staf "${formName}" berhasil diperbarui!`, 'Berhasil Disimpan');
      setIsEditModalOpen(false);
      fetchUsersAndRoles();
    } catch (err: any) {
      console.error('Update user error:', err);
      setFormError(err.response?.data?.message || 'Gagal memperbarui staf.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: StaffUser) => {
    try {
      await apiClient.patch(`/tenant/users/${user.id}/toggle-status`);
      toast.success(`Status akun "${user.name}" berhasil diubah!`);
      fetchUsersAndRoles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status staf.');
    }
  };

  const handleDeleteUser = async (user: StaffUser) => {
    if (user.role === 'owner') {
      toast.warning('Akun Owner utama tidak dapat dihapus.');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus "${user.name}" dari tim catering?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/users/${user.id}`);
      toast.success(`Staf "${user.name}" berhasil dihapus.`, 'Data Dihapus');
      fetchUsersAndRoles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus staf.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-amber-600" /> Daftar Pengguna & Staf
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data staf operasional catering dan posisi penugasan tim
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="gap-2 self-start sm:self-auto">
          <UserPlus className="w-4 h-4" /> Tambah Staf Baru
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-96">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama, email, atau telepon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Cari
            </Button>
          </form>

          {/* Dynamic Role Filter Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex items-center w-full md:w-72">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-700 font-medium cursor-pointer appearance-none shadow-2xs transition-colors hover:border-slate-300"
              >
                <option value="all">Semua Role / Hak Akses ({users.length} Staf)</option>
                {roles.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name} {r.is_system ? '(Default)' : '(Custom)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Staff Table / Cards */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama & Kontak</th>
                <th className="px-6 py-3.5">Role / Peran</th>
                <th className="px-6 py-3.5">Status Akun</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    Memuat data tim staf...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    Tidak ada data staf yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                users.map((staff) => {
                  const roleMeta = ROLE_CONFIG[staff.role] || {
                    label: roles.find((r) => r.slug === staff.role)?.name || staff.role,
                    color: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                    icon: ShieldCheck,
                  };
                  const RoleIcon = roleMeta.icon;

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-snug">{staff.name}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" /> {staff.email}
                              </span>
                              {staff.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5" /> {staff.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleMeta.color}`}
                        >
                          <RoleIcon className="w-3.5 h-3.5" /> {roleMeta.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          disabled={staff.role === 'owner'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer disabled:cursor-not-allowed ${
                            staff.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {staff.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Aktif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-red-500" /> Nonaktif
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(staff)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit Staf"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {staff.role !== 'owner' && (
                            <button
                              onClick={() => handleDeleteUser(staff)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Hapus Staf"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

        {/* Pagination */}
        <Pagination
          meta={paginationMeta}
          onPageChange={(newPage) => setPage(newPage)}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
        />
      </Card>

      {/* MODAL TAMBAH STAF */}
      <ModalPortal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Tambah Staf Baru</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 my-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 mt-4">
              <Input
                label="Nama Lengkap"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Rina Melati"
                required
              />

              <Input
                label="Email Login"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="rina@catering.com"
                required
              />

              <Input
                label="No. WhatsApp / Telepon"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="081234567890"
              />

              <Select
                label="Role / Hak Akses Staf"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
              >
                {roles
                  .filter((r) => r.slug !== 'owner')
                  .map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name} {r.is_system ? '(Default)' : '(Custom)'}
                    </option>
                  ))}
              </Select>

              <Input
                label="Kata Sandi Awal"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                required
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Simpan Staf
                </Button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* MODAL EDIT STAF */}
      {selectedUser && (
        <ModalPortal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Edit Staf: {selectedUser.name}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 my-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3.5 mt-4">
              <Input
                label="Nama Lengkap"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />

              <Input
                label="Email (Tidak dapat diubah)"
                type="email"
                value={formEmail}
                disabled
              />

              <Input
                label="No. WhatsApp / Telepon"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />

              <Select
                label="Role / Posisi Staf"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                disabled={selectedUser.role === 'owner'}
              >
                {selectedUser.role === 'owner' && <option value="owner">Pemilik (Owner)</option>}
                {roles
                  .filter((r) => r.slug !== 'owner')
                  .map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name} {r.is_system ? '(Default)' : '(Custom)'}
                    </option>
                  ))}
              </Select>

              <Input
                label="Kata Sandi Baru (Opsional)"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Kosongkan jika tidak ingin mengubah sandi"
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
