import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        tenant_slug: tenantSlug || undefined,
      });

      const { user, token, tenant } = response.data.data;
      login(user, token, tenant);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Masuk ke CaterOS</h2>
        <p className="text-sm text-slate-500">Kelola bisnis catering Anda secara terintegrasi</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Bisnis"
          type="email"
          placeholder="nama@cateringanda.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Kata Sandi"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          label="Slug Tenant / Subdomain (Opsional)"
          type="text"
          placeholder="berkah-catering"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          helperText="Kosongkan jika hanya memiliki 1 akun catering."
        />

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          <LogIn className="w-4 h-4 mr-1" /> Masuk ke Dashboard
        </Button>
      </form>

      <div className="text-center border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-600">
          Belum punya akun catering?{' '}
          <Link
            to="/register-tenant"
            className="text-amber-600 font-semibold hover:text-amber-700 hover:underline"
          >
            Daftar Tenant Baru (Gratis Trial)
          </Link>
        </p>
      </div>
    </div>
  );
};
