import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-2xl mb-4">
        404
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        Halaman yang Anda cari tidak tersedia atau sedang dalam tahap pengembangan.
      </p>
      <Link to="/dashboard">
        <Button>
          <Home className="w-4 h-4 mr-2" /> Kembali ke Dashboard
        </Button>
      </Link>
    </div>
  );
};
