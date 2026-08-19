import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckSquare,
  Square,
  Lock,
  X,
  AlertCircle,
  KeyRound,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import type { Role, PermissionGroup } from '../../types/role';

export const RoleManagementPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Active Tab / View
  const [activeRoleForView, setActiveRoleForView] = useState<Role | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get('/tenant/roles'),
        apiClient.get('/tenant/permissions'),
      ]);

      const rolesData: Role[] = rolesRes.data.data || [];
      setRoles(rolesData);
      setPermissionGroups(permsRes.data.data || []);

      if (rolesData.length > 0 && !activeRoleForView) {
        setActiveRoleForView(rolesData[0]);
      }
    } catch (err: any) {
      console.error('Fetch roles error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data role dan hak akses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: Role) => {
    if (role.is_system) {
      alert('Role sistem bawaan dilindungi dan tidak dapat diubah namanya.');
      return;
    }
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedPermissions(role.permissions || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const togglePermission = (key: string) => {
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  const toggleModulePermissions = (group: PermissionGroup) => {
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((k) => !groupKeys.includes(k)));
    } else {
      setSelectedPermissions(Array.from(new Set([...selectedPermissions, ...groupKeys])));
    }
  };

  const handleSelectAll = () => {
    const allKeys: string[] = [];
    permissionGroups.forEach((g) => {
      g.permissions.forEach((p) => allKeys.push(p.key));
    });
    setSelectedPermissions(allKeys);
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPermissions.length === 0) {
      setFormError('Pilih minimal 1 hak akses (permission) untuk role ini.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingRole) {
        // Update
        const res = await apiClient.put(`/tenant/roles/${editingRole.id}`, {
          name: roleName,
          description: roleDescription || undefined,
          permissions: selectedPermissions,
        });
        const updated = res.data.data;
        setRoles(roles.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        if (activeRoleForView?.id === updated.id) {
          setActiveRoleForView({ ...activeRoleForView, ...updated });
        }
        toast.success(`Role "${roleName}" berhasil diperbarui!`, 'Berhasil Disimpan');
      } else {
        // Create
        const res = await apiClient.post('/tenant/roles', {
          name: roleName,
          description: roleDescription || undefined,
          permissions: selectedPermissions,
        });
        const created = res.data.data;
        setRoles([...roles, created]);
        setActiveRoleForView(created);
        toast.success(`Role baru "${roleName}" berhasil ditambahkan!`, 'Berhasil Disimpan');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save role error:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) {
      toast.warning('Role sistem bawaan tidak dapat dihapus.');
      return;
    }

    if (role.users_count > 0) {
      toast.warning(`Role "${role.name}" sedang digunakan oleh ${role.users_count} staf. Pindahkan staf terlebih dahulu.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus custom role "${role.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/roles/${role.id}`);
      setRoles(roles.filter((r) => r.id !== role.id));
      if (activeRoleForView?.id === role.id) {
        setActiveRoleForView(roles.find((r) => r.id !== role.id) || null);
      }
      toast.success(`Role "${role.name}" berhasil dihapus.`, 'Data Dihapus');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus role.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-amber-600" /> Role & Hak Akses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Atur izin akses menu dan fungsi operasional untuk setiap peran staf catering
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Buat Custom Role
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Layout: Role List Sidebar (Left) & Permission Matrix Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Role Cards List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Daftar Peran ({roles.length})
            </span>
            <span className="text-xs text-slate-400">Klik untuk melihat izin</span>
          </div>

          {isLoading ? (
            <Card className="p-6 text-center text-slate-400 text-sm">Memuat data role...</Card>
          ) : (
            roles.map((role) => {
              const isSelected = activeRoleForView?.id === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => setActiveRoleForView(role)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-white shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          role.is_system
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {role.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm">{role.name}</h3>
                          {role.is_system ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-50">
                              <Lock className="w-2.5 h-2.5 mr-1 inline" /> System
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {role.description || 'Tidak ada deskripsi'}
                        </p>
                      </div>
                    </div>

                    {/* Actions for custom roles */}
                    {!role.is_system && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEditModal(role)}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-100"
                          title="Edit Role"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                          title="Hapus Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700">{role.users_count}</span> Staf Aktif
                    </span>
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-medium text-slate-700">{role.permissions_count || role.permissions?.length || 0}</span> Hak Akses
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Permission Matrix Inspector for Selected Role */}
        <div className="lg:col-span-7">
          {activeRoleForView ? (
            <Card className="p-6">
              <CardHeader className="p-0 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg text-slate-900">{activeRoleForView.name}</CardTitle>
                      {activeRoleForView.is_system ? (
                        <Badge variant="outline">Default System Role</Badge>
                      ) : (
                        <Badge variant="warning">Custom Tenant Role</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {activeRoleForView.description || 'Hak akses yang aktif untuk peran ini:'}
                    </CardDescription>
                  </div>
                  {!activeRoleForView.is_system && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(activeRoleForView)}
                      className="gap-1.5 text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Hak Akses
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Permission Groups Breakdown */}
              <CardContent className="p-0 pt-4 space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {permissionGroups.map((group) => {
                  const groupPermissions = group.permissions;
                  const activeInGroup = groupPermissions.filter((p) =>
                    activeRoleForView.permissions?.includes(p.key) || activeRoleForView.permissions?.includes('*')
                  );

                  return (
                    <div
                      key={group.module}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            {group.label}
                          </p>
                          <p className="text-[11px] text-slate-500">{group.description}</p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            activeInGroup.length === groupPermissions.length
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : activeInGroup.length > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          {activeInGroup.length} / {groupPermissions.length} Akses Aktif
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {groupPermissions.map((perm) => {
                          const isGranted =
                            activeRoleForView.permissions?.includes(perm.key) ||
                            activeRoleForView.permissions?.includes('*');

                          return (
                            <div
                              key={perm.key}
                              className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                                isGranted
                                  ? 'bg-white border-emerald-200 text-slate-800 shadow-2xs'
                                  : 'bg-slate-100/50 border-slate-200 text-slate-400 opacity-60'
                              }`}
                            >
                              {isGranted ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                              )}
                              <div className="overflow-hidden">
                                <p className="font-medium truncate">{perm.label}</p>
                                <p className="text-[10px] text-slate-400 truncate">{perm.key}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8 text-center text-slate-400">
              Pilih salah satu role di sebelah kiri untuk melihat rincian hak akses.
            </Card>
          )}
        </div>
      </div>

      {/* MODAL BUILDER ROLE & PERMISSION MATRIX */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingRole ? `Edit Role: ${editingRole.name}` : 'Buat Custom Role Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Tentukan nama role dan pilih izin akses menu & aksi yang diizinkan
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 my-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSubmitRole} className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Role"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Contoh: Supervisor CS & Dapur"
                  required
                />
                <Input
                  label="Deskripsi Tugas (Opsional)"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Contoh: Mengawasi order dan dapur"
                />
              </div>

              {/* Permission Matrix Header */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Matriks Hak Akses (Terpilih: {selectedPermissions.length} Izin)
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-amber-600 hover:underline font-semibold"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-slate-500 hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {/* Module Permission Groups */}
                <div className="space-y-3">
                  {permissionGroups.map((group) => {
                    const groupKeys = group.permissions.map((p) => p.key);
                    const allInGroupSelected = groupKeys.every((k) => selectedPermissions.includes(k));

                    return (
                      <div
                        key={group.module}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                          <div>
                            <span className="font-semibold text-slate-800 text-xs uppercase">
                              {group.label}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{group.description}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(group)}
                            className="text-xs text-amber-600 font-semibold hover:underline"
                          >
                            {allInGroupSelected ? 'Batal Semua Modul' : 'Pilih Semua Modul'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {group.permissions.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-white border-amber-500/50 text-slate-900 shadow-2xs'
                                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.key)}
                                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                  <p className="text-xs font-semibold leading-tight">{perm.label}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{perm.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {editingRole ? 'Simpan Perubahan' : 'Buat Custom Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
