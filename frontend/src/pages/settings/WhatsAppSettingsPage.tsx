import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  MessageSquare,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  Phone,
  Eye,
  Clock,
  Settings,
} from 'lucide-react';
import type { WhatsAppTemplate, WhatsAppLog } from '../../types/whatsapp';

export const WhatsAppSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'simulator'>('templates');
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editing Template State
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateBody, setTemplateBody] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Simulator State
  const [simPhone, setSimPhone] = useState('081234567890');
  const [simName, setSimName] = useState('Bpk. Bambang');
  const [simTemplateCode, setSimTemplateCode] = useState('order_confirmed');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Logs Filter
  const [searchLog, setSearchLog] = useState('');
  const [statusLogFilter, setStatusLogFilter] = useState('all');
  const [logPage, setLogPage] = useState(1);
  const [logMeta, setLogMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/tenant/whatsapp/templates');
      const tmpls: WhatsAppTemplate[] = res.data.data || [];
      setTemplates(tmpls);
      if (tmpls.length > 0 && !selectedTemplate) {
        setSelectedTemplate(tmpls[0]);
        setTemplateBody(tmpls[0].body_text);
      }
    } catch (err) {
      console.error('Fetch templates failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: logPage,
        per_page: 15,
      };
      if (searchLog.trim()) params.search = searchLog.trim();
      if (statusLogFilter !== 'all') params.status = statusLogFilter;

      const res = await apiClient.get('/tenant/whatsapp/logs', { params });
      setLogs(res.data.data || []);
      if (res.data.meta) setLogMeta(res.data.meta);
    } catch (err) {
      console.error('Fetch logs failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [logPage, searchLog, statusLogFilter]);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, fetchTemplates, fetchLogs]);

  const handleSelectTemplate = (tmpl: WhatsAppTemplate) => {
    setSelectedTemplate(tmpl);
    setTemplateBody(tmpl.body_text);
  };

  const handleInsertVariable = (variableKey: string) => {
    const placeholder = `{${variableKey}}`;
    setTemplateBody((prev) => prev + placeholder);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setIsSavingTemplate(true);
    try {
      await apiClient.put(`/tenant/whatsapp/templates/${selectedTemplate.id}`, {
        body_text: templateBody,
      });
      alert('Template WhatsApp berhasil disimpan!');
      fetchTemplates();
    } catch (err: any) {
      console.error('Save template failed:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    try {
      const res = await apiClient.post('/tenant/whatsapp/test', {
        template_code: simTemplateCode,
        recipient_phone: simPhone,
        recipient_name: simName,
      });

      if (res.data?.success) {
        alert('Pesan uji coba WhatsApp berhasil dikirim!');
        setActiveTab('logs');
      }
    } catch (err: any) {
      console.error('Send test failed:', err);
      alert(err.response?.data?.message || 'Gagal mengirim pesan uji coba.');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Render sample preview by replacing variables
  const renderPreviewText = (text: string) => {
    return text
      .replace(/{customer_name}/g, simName)
      .replace(/{order_number}/g, 'ORD-2026-0088')
      .replace(/{event_type}/g, 'Prasmanan Kantor (150 Pax)')
      .replace(/{delivery_date}/g, '21 Agu 2026')
      .replace(/{delivery_time}/g, '11:30 WIB')
      .replace(/{total_amount}/g, 'Rp 4.500.000')
      .replace(/{payment_amount}/g, 'Rp 2.250.000')
      .replace(/{payment_method}/g, 'QRIS Instan')
      .replace(/{invoice_number}/g, 'INV-202608-0088')
      .replace(/{payment_status}/g, 'Lunas DP (50%)')
      .replace(/{remaining_amount}/g, 'Rp 2.250.000')
      .replace(/{delivery_address}/g, 'Gedung Wisma Mulia Lt. 12, Jakarta')
      .replace(/{courier_name}/g, 'Pak Budi (Armada Van B 1234 XYZ)')
      .replace(/{courier_phone}/g, '0812-3456-7890')
      .replace(/{receiver_name}/g, 'Ibu Ratna (Resepsionis)')
      .replace(/{tracking_url}/g, 'https://cateros.id/track/TRK-0088')
      .replace(/{invoice_url}/g, 'https://cateros.id/p/invoice/INV-0088')
      .replace(/{tenant_name}/g, 'Berkah Catering Official');
  };

  const getLogStatusBadge = (status: string) => {
    switch (status) {
      case 'read':
        return { label: 'Dibaca (Read)', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'delivered':
        return { label: 'Terkirim (Delivered)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'sent':
        return { label: 'Terkirim Server', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'failed':
        return { label: 'Gagal Kirim', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-emerald-600" /> WhatsApp Business API Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengaturan notifikasi pesan otomatis pelanggan: konfirmasi order, tanda terima kuitansi DP, live link kurir, dan bukti serah terima (POD)
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="bg-slate-200 p-1 rounded-xl flex items-center gap-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'templates'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Template Pesan
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'simulator'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Uji Coba Kirim (Test)
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'logs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Riwayat &amp; Log Pesan
          </button>
        </div>
      </div>

      {/* TAB 1: TEMPLATE MANAGER */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Template List Selection */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pilih Alur Template ({templates.length})
            </h3>

            <div className="space-y-2">
              {templates.map((tmpl) => {
                const isSelected = selectedTemplate?.id === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`w-full p-3.5 text-left rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-slate-900 block">
                        {tmpl.name}
                      </strong>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {tmpl.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {tmpl.body_text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Editor & Live WhatsApp Preview */}
          <div className="lg:col-span-8 space-y-4">
            {selectedTemplate && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Edit Template: {selectedTemplate.name}
                    </h2>
                    <span className="text-xs text-slate-400 font-mono">
                      Kode: <strong>{selectedTemplate.code}</strong>
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate}
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isSavingTemplate ? 'Menyimpan...' : 'Simpan Template'}
                  </Button>
                </div>

                {/* Variable Placeholder Quick Badges */}
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Klik untuk menyisipkan variabel otomatis:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.variables?.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleInsertVariable(v)}
                        className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-lg text-[11px] font-mono border border-slate-200 transition-colors"
                      >
                        +{'{' + v + '}'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Isi Teks Pesan WhatsApp (Mendukung format *tebal* dan link)
                  </label>
                  <textarea
                    rows={7}
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 leading-relaxed"
                  />
                </div>

                {/* Live WhatsApp Bubble Preview */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    Pratinjau Tampilan di WhatsApp Pelanggan:
                  </span>

                  <div className="p-4 bg-[#e5ddd5] rounded-2xl border border-slate-300/80 shadow-inner">
                    <div className="max-w-md bg-white rounded-2xl p-3.5 shadow-sm text-xs text-slate-800 space-y-2 whitespace-pre-line border border-slate-200">
                      <p className="leading-relaxed">{renderPreviewText(templateBody)}</p>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">11:30 ✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TEST SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="max-w-xl mx-auto space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Uji Coba Kirim Notifikasi WhatsApp
                </h2>
                <p className="text-xs text-slate-500">
                  Kirim pesan simulasi dengan data pesanan sampel ke nomor WhatsApp Anda
                </p>
              </div>
            </div>

            <form onSubmit={handleSendTestMessage} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Pilih Template yang Diuji *
                </label>
                <select
                  value={simTemplateCode}
                  onChange={(e) => setSimTemplateCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {templates.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Penerima Sampel
                  </label>
                  <input
                    type="text"
                    required
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    No. WhatsApp Tujuan *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="081234567890"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSendingTest}
                className="w-full gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs py-2.5 mt-2"
              >
                <Send className="w-4 h-4" />
                {isSendingTest ? 'Mengirim pesan...' : 'Kirim Pesan WhatsApp Sekarang'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 3: LOGS & DELIVERY HISTORY */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-3.5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari no. HP, nama penerima, isi pesan..."
                  value={searchLog}
                  onChange={(e) => {
                    setSearchLog(e.target.value);
                    setLogPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="relative w-44">
                <select
                  value={statusLogFilter}
                  onChange={(e) => {
                    setStatusLogFilter(e.target.value);
                    setLogPage(1);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 appearance-none font-medium text-slate-700"
                >
                  <option value="all">Semua Status Log</option>
                  <option value="sent">Terkirim Server</option>
                  <option value="delivered">Diterima Handphone</option>
                  <option value="read">Dibaca Pelanggan</option>
                  <option value="failed">Gagal</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Logs Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Penerima &amp; No. WhatsApp</th>
                    <th className="px-6 py-3.5">Template</th>
                    <th className="px-6 py-3.5">Cuplikan Pesan</th>
                    <th className="px-6 py-3.5">Waktu Kirim</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        Memuat riwayat WhatsApp...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                            <MessageSquare className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-slate-800 text-sm">Belum Ada Riwayat Pesan WhatsApp</p>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Pesan yang dikirim secara otomatis ke pelanggan saat konfirmasi pesanan, kuitansi pembayaran, dan pengiriman kurir akan tercatat di sini.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((lg) => {
                      const statusCfg = getLogStatusBadge(lg.status);

                      return (
                        <tr key={lg.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <strong className="font-bold text-slate-900 text-xs block">
                              {lg.recipient_name || 'Pelanggan'}
                            </strong>
                            <span className="text-xs font-mono text-emerald-700 font-semibold">
                              +{lg.recipient_phone}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                              {lg.template_code || 'manual_chat'}
                            </span>
                          </td>

                          <td className="px-6 py-4 max-w-sm">
                            <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                              {lg.message_body}
                            </p>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {lg.sent_at ? new Date(lg.sent_at).toLocaleString('id-ID') : '—'}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              meta={logMeta}
              onPageChange={(newPage) => setLogPage(newPage)}
              onPerPageChange={() => {}}
            />
          </Card>
        </div>
      )}
    </div>
  );
};
