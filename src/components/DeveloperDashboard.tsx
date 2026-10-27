import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  HardDrive,
  Save,
  RefreshCw,
  Sliders,
  Users,
  ShieldCheck,
  FileJson,
  Key,
  LogOut,
  Settings,
  AlertTriangle,
  Info,
  Copy,
  Check,
  CheckCircle,
  ExternalLink,
  Server,
  Layers,
  Table,
  Cpu,
  Activity,
  Link,
  Radio,
  Send,
  Zap,
  Eye,
  Upload,
  Image as ImageIcon,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import Logo from './Logo';
import ImagePreviewModal from './ImagePreviewModal';
import GoogleSpreadsheetViewer from './GoogleSpreadsheetViewer';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../lib/googleSheetsIntegration';
import { CustomerUser, PaymentRecord, SupportTicket } from '../types';

interface DeveloperDashboardProps {
  onLogout: () => void;
  companyName: string;
  logoUrl?: string;
  onUpdateCompanySettings?: (newSettings: {
    name: string;
    address: string;
    logoText: string;
    themeColor: string;
    logoUrl?: string;
  }) => Promise<boolean>;
}

export default function DeveloperDashboard({
  onLogout,
  companyName,
  logoUrl,
  onUpdateCompanySettings,
}: DeveloperDashboardProps) {
  const [activeTab, setActiveTab] = useState<'connect_sheets' | 'sheets_tables' | 'sheets_script' | 'settings_override' | 'overview'>('connect_sheets');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dbData, setDbData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSheetsTable, setActiveSheetsTable] = useState<'customers' | 'payments' | 'tickets' | 'settings'>('customers');

  // Google Sheets Config Form State
  const [sheetsForm, setSheetsForm] = useState({
    webAppUrl: '',
    driveFolderName: 'PatasNet_Drive',
    autoSync: true,
    syncIntervalSeconds: 4,
    lastSyncedAt: '',
  });

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [syncingDataUp, setSyncingDataUp] = useState(false);
  const [syncingDataDown, setSyncingDataDown] = useState(false);
  const [testingRegistration, setTestingRegistration] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
    subtitle?: string;
  }>({
    isOpen: false,
    imageUrl: '',
    title: '',
    subtitle: '',
  });

  // Settings Override Form State
  const [overrideSettings, setOverrideSettings] = useState({
    name: companyName || 'Patas Net WiFi',
    address: 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110',
    logoText: 'PATAS NET',
    themeColor: '#2563eb',
    logoUrl: logoUrl || '',
  });

  const fetchDatabaseAndConfig = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [resDb, resMetrics, resConfig] = await Promise.all([
        fetch('/api/dev/db'),
        fetch('/api/dev/db/metrics'),
        fetch('/api/dev/sheets/config'),
      ]);

      if (resDb.ok) {
        const data = await resDb.json();
        setDbData(data);
        if (data.companySettings) {
          setOverrideSettings((prev) => ({
            ...prev,
            name: data.companySettings.name || prev.name,
            address: data.companySettings.address || prev.address,
            logoText: data.companySettings.logoText || prev.logoText,
            themeColor: data.companySettings.themeColor || prev.themeColor,
            logoUrl: data.companySettings.logoUrl !== undefined ? data.companySettings.logoUrl : prev.logoUrl,
          }));
        }
      }

      if (resMetrics.ok) {
        const m = await resMetrics.json();
        setMetrics(m.metrics);
      }

      if (resConfig.ok) {
        const cfgData = await resConfig.json();
        if (cfgData.config) {
          setSheetsForm((prev) => ({
            ...prev,
            webAppUrl: cfgData.config.webAppUrl || '',
            driveFolderName: cfgData.config.driveFolderName || 'PatasNet_Drive',
            autoSync: cfgData.config.autoSync !== undefined ? cfgData.config.autoSync : true,
            syncIntervalSeconds: cfgData.config.syncIntervalSeconds || 4,
            lastSyncedAt: cfgData.config.lastSyncedAt || '',
          }));
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Terjadi kesalahan memuat data developer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseAndConfig();
  }, []);

  const handleSaveSheetsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/dev/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetsForm),
      });

      if (res.ok) {
        setSuccessMessage('Konfigurasi Google Sheets & Google Drive berhasil disimpan!');
        // Also save to client local storage for fallback
        try {
          localStorage.setItem('patasnet_google_sheets_url', sheetsForm.webAppUrl.trim());
        } catch {}
        handleTestConnection();
      } else {
        const errData = await res.json();
        setErrorMessage(errData.message || 'Gagal menyimpan konfigurasi.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal menyimpan konfigurasi.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    setErrorMessage('');
    try {
      const res = await fetch('/api/dev/sheets/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: sheetsForm.webAppUrl }),
      });
      const data = await res.json();
      setTestResult(data);
      if (res.ok && data.reachable) {
        setSuccessMessage(data.message);
        if (data.settings && data.settings.logoUrl) {
          setOverrideSettings((prev) => ({
            ...prev,
            logoUrl: data.settings.logoUrl,
            name: data.settings.name || prev.name,
          }));
        }
      } else {
        setErrorMessage(data.message || 'Gagal menghubungi Google Sheets Web App.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Koneksi error: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncDataUp = async () => {
    setSyncingDataUp(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/dev/sheets/sync-up', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        await fetchDatabaseAndConfig();
      } else {
        setErrorMessage(data.message || 'Gagal sinkronisasi ke Google Sheets.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Sinkronisasi upload gagal: ${err.message}`);
    } finally {
      setSyncingDataUp(false);
    }
  };

  const handleSyncDataDown = async () => {
    setSyncingDataDown(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/dev/sheets/sync-down');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSuccessMessage(data.message);
        if (data.settings) {
          setOverrideSettings((prev) => ({
            ...prev,
            name: data.settings.name || prev.name,
            logoUrl: data.settings.logoUrl || prev.logoUrl,
            logoText: data.settings.logoText || prev.logoText,
          }));
          if (onUpdateCompanySettings) {
            await onUpdateCompanySettings(data.settings);
          }
        }
        await fetchDatabaseAndConfig();
      } else {
        setErrorMessage(data.message || 'Gagal menarik data dari Google Sheets.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Sinkronisasi download gagal: ${err.message}`);
    } finally {
      setSyncingDataDown(false);
    }
  };

  const handleTestRegistration = async () => {
    setTestingRegistration(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/dev/sheets/test-registration', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        await fetchDatabaseAndConfig();
      } else {
        setErrorMessage(data.message || 'Gagal simulasi pendaftaran ke Google Sheets.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Uji pendaftaran error: ${err.message}`);
    } finally {
      setTestingRegistration(false);
    }
  };

  const handleSaveSettingsOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideSettings),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMessage('Pengaturan identitas perusahaan & LOGO berhasil diperbarui ke seluruh portal!');
        if (onUpdateCompanySettings) {
          await onUpdateCompanySettings(overrideSettings);
        }
        await fetchDatabaseAndConfig();
      } else {
        setErrorMessage('Gagal memperbarui pengaturan identitas.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const customersList: CustomerUser[] = dbData?.customers || [];
  const ticketsList: SupportTicket[] = dbData?.tickets || [];
  const paymentsList: any[] = [];
  customersList.forEach((c) => {
    if (c.payments) {
      c.payments.forEach((p) => {
        paymentsList.push({ ...p, customerName: c.name, customerEmail: c.email, customerId: c.id });
      });
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <Logo companyName={overrideSettings.name || companyName} logoUrl={overrideSettings.logoUrl || logoUrl} tagline={overrideSettings.tagline} />
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-800">
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Database: Google Sheets & Drive
            </span>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-mono rounded">
              v2.8 Realtime 2-Way
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
            title={isSidebarOpen ? "Sembunyikan Menu Navigasi" : "Tampilkan Menu Navigasi"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-blue-400" /> : <PanelLeftOpen className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isSidebarOpen ? "Sembunyikan Menu" : "Buka Menu"}</span>
          </button>

          <button
            onClick={() => fetchDatabaseAndConfig()}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-1 text-xs"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden md:inline font-semibold">Refresh</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container with Left Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 relative">
        {/* Left Sidebar Navigation (Collapses to icon-only rail when hidden) */}
        <aside className={`shrink-0 transition-all duration-300 lg:sticky lg:top-20 h-fit ${isSidebarOpen ? 'w-full lg:w-64' : 'w-full lg:w-20'}`}>
          <div className={`bg-slate-900/90 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col transition-all duration-300 ${isSidebarOpen ? 'p-5 gap-4' : 'p-3 gap-3 items-center'}`}>
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between pb-3 border-b border-slate-800 w-full' : 'justify-center pb-2 border-b border-slate-800 w-full'}`}>
              {isSidebarOpen ? (
                <>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-extrabold flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> DEV MENU
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                    title="Sembunyikan Label Menu (Tampilkan Hanya Icon)"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition flex flex-col items-center justify-center gap-1 group"
                  title="Buka Dev Menu Lengkap"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <PanelLeftOpen className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
                </button>
              )}
            </div>

            <nav className={`flex ${isSidebarOpen ? 'flex-col gap-1.5 text-xs w-full' : 'flex-row flex-wrap lg:flex-col gap-2 items-center justify-center w-full'}`}>
              <button
                onClick={() => {
                  setActiveTab('connect_sheets');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                title="Koneksi Google Sheets & Drive"
                className={`rounded-xl font-bold transition flex items-center ${
                  isSidebarOpen
                    ? 'w-full text-left px-3.5 py-2.5 gap-2.5'
                    : 'justify-center p-3 text-center'
                } ${
                  activeTab === 'connect_sheets'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <HardDrive className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Koneksi Google Sheets & Drive</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab('sheets_tables');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                title="Tabel Data Live"
                className={`rounded-xl font-bold transition flex items-center ${
                  isSidebarOpen
                    ? 'w-full text-left px-3.5 py-2.5 gap-2.5'
                    : 'justify-center p-3 text-center'
                } ${
                  activeTab === 'sheets_tables'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Table className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Tabel Data Live</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab('sheets_script');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                title="Script Google Apps Script"
                className={`rounded-xl font-bold transition flex items-center ${
                  isSidebarOpen
                    ? 'w-full text-left px-3.5 py-2.5 gap-2.5'
                    : 'justify-center p-3 text-center'
                } ${
                  activeTab === 'sheets_script'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileJson className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Script Google Apps Script</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab('settings_override');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                title="Identitas & Logo Global"
                className={`rounded-xl font-bold transition flex items-center ${
                  isSidebarOpen
                    ? 'w-full text-left px-3.5 py-2.5 gap-2.5'
                    : 'justify-center p-3 text-center'
                } ${
                  activeTab === 'settings_override'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ImageIcon className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Identitas & Logo Global</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab('overview');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                title="Metrik Server & Database"
                className={`rounded-xl font-bold transition flex items-center ${
                  isSidebarOpen
                    ? 'w-full text-left px-3.5 py-2.5 gap-2.5'
                    : 'justify-center p-3 text-center'
                } ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Metrik Server & Database</span>}
              </button>
            </nav>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <div className="flex-1 min-w-0 space-y-6">

        {/* Global Notifications */}
        {errorMessage && (
          <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-2xl text-red-200 text-xs flex items-start gap-3 shadow-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-emerald-200 text-xs flex items-start gap-3 shadow-lg">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{successMessage}</div>
          </div>
        )}

        {/* TAB 1: KONEKSI GOOGLE SHEETS & DRIVE */}
        {activeTab === 'connect_sheets' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Connection Form */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="space-y-1 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Database Engine: Google Sheets & Drive</span>
                  </div>
                  <h2 className="text-xl font-black text-white">Hubungkan Google Spreadsheet & Google Drive</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sistem akan menyinkronkan seluruh data pelanggan, tagihan pembayaran, dan tiket ke Google Spreadsheet. Foto KTP, bukti transfer pembayaran, dan gambar logo otomatis disimpan rapi ke Google Drive secara realtime 2-arah.
                  </p>
                </div>

                <form onSubmit={handleSaveSheetsConfig} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      URL Web App Google Apps Script *
                    </label>
                    <input
                      type="url"
                      value={sheetsForm.webAppUrl}
                      onChange={(e) => setSheetsForm({ ...sheetsForm, webAppUrl: e.target.value })}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                    <p className="text-[11px] text-slate-500">
                      Dapatkan URL ini dari menu <strong>Deploy &gt; New deployment &gt; Web app</strong> di Google Apps Script spreadsheet Anda.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 uppercase">
                        Folder Penyimpanan Google Drive
                      </label>
                      <input
                        type="text"
                        value={sheetsForm.driveFolderName}
                        onChange={(e) => setSheetsForm({ ...sheetsForm, driveFolderName: e.target.value })}
                        placeholder="PatasNet_Drive"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-500">Otomatis dibuat di Google Drive Anda.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 uppercase">
                        Interval Auto-Sync Realtime (Detik)
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="60"
                        value={sheetsForm.syncIntervalSeconds}
                        onChange={(e) => setSheetsForm({ ...sheetsForm, syncIntervalSeconds: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-500">Default: 4 detik untuk update instan di HP & PC.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!sheetsForm.webAppUrl.trim()) {
                          setErrorMessage('Masukkan URL Web App Google Apps Script Anda terlebih dahulu, atau uji sinkronisasi data internal di tombol bawah.');
                          return;
                        }
                        handleTestConnection();
                      }}
                      disabled={testingConnection}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Zap className={`w-4 h-4 ${testingConnection ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
                      <span>{testingConnection ? 'Menguji...' : 'Test & Ping Webhook'}</span>
                    </button>
                  </div>
                </form>

                {/* 2-Way Sync Action Center */}
                <div className="pt-6 border-t border-slate-800/80 space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" /> Operasi Sinkronisasi Realtime 2-Arah
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleSyncDataDown}
                      disabled={syncingDataDown}
                      className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition flex items-start gap-3 group active:scale-98 cursor-pointer"
                    >
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition">
                        <ArrowDownCircle className={`w-5 h-5 ${syncingDataDown ? 'animate-bounce' : ''}`} />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs text-white">Tarik Data (Sync Down)</p>
                        <p className="text-[10px] text-slate-400">Ambil data terbaru dari Google Sheet ke sistem</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncDataUp}
                      disabled={syncingDataUp}
                      className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition flex items-start gap-3 group active:scale-98 cursor-pointer"
                    >
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition">
                        <ArrowUpCircle className={`w-5 h-5 ${syncingDataUp ? 'animate-bounce' : ''}`} />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs text-white">Kirim Data (Sync Up)</p>
                        <p className="text-[10px] text-slate-400">Unggah seluruh data lokal ke Google Sheet & Drive</p>
                      </div>
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleTestRegistration}
                      disabled={testingRegistration}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-800/60 hover:border-emerald-600 text-emerald-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{testingRegistration ? 'Mengirim simulasi...' : 'Uji Pendaftaran Simulasi & Upload KTP ke Google Drive'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Status Card & Diagnostic */}
              <div className="lg:col-span-5 space-y-6">
                {/* Live Status Box */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-white">Status Database</h3>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                      sheetsForm.webAppUrl ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${sheetsForm.webAppUrl ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {sheetsForm.webAppUrl ? 'Terhubung (Online)' : 'Belum Konfigurasi'}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Engine:</span>
                      <strong className="text-white">Google Sheets & Drive</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Status Sinkronisasi:</span>
                      <strong className="text-emerald-400">Realtime 2-Arah Aktif</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Latency Ping:</span>
                      <strong className="text-blue-400">{testResult ? `${testResult.latencyMs} ms` : '~'}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Data Pelanggan:</span>
                      <strong className="text-white">{customersList.length} Akun</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Data Tagihan:</span>
                      <strong className="text-white">{paymentsList.length} Transaksi</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Tiket Kendala:</span>
                      <strong className="text-white">{ticketsList.length} Tiket</strong>
                    </div>
                  </div>

                  {/* Diagnostic Test Result Box */}
                  {testResult && (
                    <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      testResult.reachable
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                        : 'bg-red-950/40 border-red-800 text-red-200'
                    }`}>
                      <div className="font-bold flex items-center gap-1.5">
                        {testResult.reachable ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                        <span>Hasil Pengujian Webhook:</span>
                      </div>
                      <p className="text-[11px] font-sans leading-relaxed">{testResult.message}</p>
                      {testResult.settings && (
                        <div className="pt-2 border-t border-emerald-800/40 text-[10px] font-mono text-slate-300">
                          Identitas Terbaca: <strong>{testResult.settings.name}</strong> ({testResult.settings.logoText})
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step Guide Quick Link */}
                  <div className="p-4 bg-gradient-to-br from-slate-950 to-blue-950/30 border border-slate-800 rounded-2xl text-xs space-y-2">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-400" /> Otomatis Buat Sheet saat Run / Deploy Apps Script
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Salin script <strong>Code.gs</strong> di tab sebelah. Saat Anda klik <strong>Run</strong> (<code>setupDatabaseOtomatis</code>) atau <strong>Deploy</strong> di Apps Script, seluruh 6 Sheet &amp; Folder Google Drive <code>PatasNet_Drive</code> akan langsung dibuat otomatis!
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sheets_script')}
                      className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] flex items-center gap-1 pt-1"
                    >
                      Buka &amp; Salin Script Code.gs Otomatis &rarr;
                    </button>
                  </div>

                  {/* Vercel Hosting Ready Card */}
                  <div className="p-4 bg-gradient-to-br from-slate-950 to-emerald-950/30 border border-emerald-800/50 rounded-2xl text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Server className="w-4 h-4" /> Siap Hosting di Vercel (Multi-Device)
                      </p>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 rounded text-[10px] font-mono font-bold">
                        Vercel Ready
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Agar saat di-deploy ke <strong>Vercel</strong> semua HP &amp; laptop pengunjung otomatis membaca data Google Sheet &amp; gambar Google Drive yang sama, tambahkan <strong>Environment Variable</strong> ini di Dashboard Vercel Anda:
                    </p>
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[10px] space-y-1">
                      <div className="text-slate-400">
                        Key: <strong className="text-emerald-400 select-all">VITE_GOOGLE_SHEETS_URL</strong>
                      </div>
                      <div className="text-slate-400 truncate">
                        Value: <strong className="text-blue-300 select-all">{sheetsForm.webAppUrl || 'https://script.google.com/macros/s/.../exec'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE SPREADSHEET TABLES */}
        {activeTab === 'sheets_tables' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            {/* Live Interactive Spreadsheet Grid */}
            <GoogleSpreadsheetViewer
              webAppUrl={sheetsForm.webAppUrl}
              onRefreshParent={fetchDatabaseAndConfig}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-black text-white">Detail Tabel Database Sistem</h2>
                <p className="text-xs text-slate-400">
                  Data individual yang tersimpan di sistem dan tersinkronisasi 2-arah dengan Google Spreadsheet & Google Drive.
                </p>
              </div>

              {/* Sub-table tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveSheetsTable('customers')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activeSheetsTable === 'customers' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pelanggan ({customersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheetsTable('payments')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activeSheetsTable === 'payments' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pembayaran ({paymentsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheetsTable('tickets')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activeSheetsTable === 'tickets' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tiket ({ticketsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheetsTable('settings')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activeSheetsTable === 'settings' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pengaturan & Logo
                </button>
              </div>
            </div>

            {/* Content Table: Customers */}
            {activeSheetsTable === 'customers' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-3.5">ID Pelanggan</th>
                      <th className="p-3.5">Nama & Kontak</th>
                      <th className="p-3.5">Alamat & GPS</th>
                      <th className="p-3.5">Paket</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">KTP (Google Drive)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {customersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                          Belum ada pelanggan terdaftar di database.
                        </td>
                      </tr>
                    ) : (
                      customersList.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-bold text-emerald-400">{c.id}</td>
                          <td className="p-3.5 font-sans">
                            <p className="font-bold text-white">{c.name}</p>
                            <p className="text-[11px] text-slate-400">{c.email} &bull; {c.phone}</p>
                          </td>
                          <td className="p-3.5 font-sans text-slate-300 max-w-xs truncate">
                            <p className="truncate">{c.address}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{c.coordinates?.join(', ')}</p>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold">
                              {c.packageId}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3.5 font-sans">
                            {c.ktpImageUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModal({
                                    isOpen: true,
                                    imageUrl: c.ktpImageUrl!,
                                    title: `Foto KTP: ${c.name}`,
                                    subtitle: `ID: ${c.id} | Google Drive Image`,
                                  })
                                }
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                              >
                                <Eye className="w-3 h-3 text-emerald-400" />
                                <span>Lihat KTP</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Content Table: Payments */}
            {activeSheetsTable === 'payments' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-3.5">ID Pembayaran</th>
                      <th className="p-3.5">Pelanggan</th>
                      <th className="p-3.5">Nominal</th>
                      <th className="p-3.5">Periode / Metode</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Bukti Bayar (Google Drive)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {paymentsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                          Belum ada data pembayaran di database.
                        </td>
                      </tr>
                    ) : (
                      paymentsList.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-bold text-blue-400">{p.id}</td>
                          <td className="p-3.5 font-sans">
                            <p className="font-bold text-white">{p.customerName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{p.customerId}</p>
                          </td>
                          <td className="p-3.5 font-bold text-emerald-400">
                            Rp {(p.amount || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3.5 font-sans text-slate-300">
                            <p>{p.billingPeriod || 'Berjalan'}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-mono">{p.method || 'Transfer'}</p>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : p.status === 'pending_verification'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3.5 font-sans">
                            {p.proofOfPaymentUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModal({
                                    isOpen: true,
                                    imageUrl: p.proofOfPaymentUrl,
                                    title: `Bukti Bayar: ${p.customerName}`,
                                    subtitle: `Nominal: Rp ${(p.amount || 0).toLocaleString('id-ID')} | Google Drive`,
                                  })
                                }
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                              >
                                <Eye className="w-3 h-3 text-blue-400" />
                                <span>Lihat Bukti</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Content Table: Tickets */}
            {activeSheetsTable === 'tickets' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-3.5">ID Tiket</th>
                      <th className="p-3.5">Pelanggan</th>
                      <th className="p-3.5">Keluhan Masalah</th>
                      <th className="p-3.5">Tanggal</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {ticketsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                          Belum ada tiket kendala di database.
                        </td>
                      </tr>
                    ) : (
                      ticketsList.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-bold text-amber-400">{t.id}</td>
                          <td className="p-3.5 font-sans">
                            <p className="font-bold text-white">{t.userName}</p>
                            <p className="text-[10px] text-slate-400">{t.phone}</p>
                          </td>
                          <td className="p-3.5 font-sans text-slate-200 max-w-md">{t.message}</td>
                          <td className="p-3.5 text-slate-400 text-[11px]">{t.date}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Content Table: Settings & Logo */}
            {activeSheetsTable === 'settings' && (
              <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="font-extrabold text-sm text-white">Sheet Pengaturan & Identitas Visual</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <p className="text-slate-400 text-[10px] uppercase">Nama Perusahaan WiFi</p>
                    <p className="text-white font-bold">{overrideSettings.name}</p>
                  </div>
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <p className="text-slate-400 text-[10px] uppercase">Teks Logo</p>
                    <p className="text-white font-bold">{overrideSettings.logoText}</p>
                  </div>
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <p className="text-slate-400 text-[10px] uppercase">Alamat Kantor</p>
                    <p className="text-white font-bold font-sans">{overrideSettings.address}</p>
                  </div>
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <p className="text-slate-400 text-[10px] uppercase">Logo Aktif (Google Drive URL)</p>
                    {overrideSettings.logoUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={overrideSettings.logoUrl}
                          alt="Logo Preview"
                          className="h-10 w-10 object-contain rounded-lg border border-slate-700 bg-white p-1"
                        />
                        <span className="text-[10px] text-emerald-400 truncate max-w-xs">{overrideSettings.logoUrl}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">Default SVG Logo</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GOOGLE APPS SCRIPT CODE.GS */}
        {activeTab === 'sheets_script' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white">Kode Google Apps Script (Code.gs)</h2>
                <p className="text-xs text-slate-400">
                  Script ini bertindak sebagai backend serverless otomatis yang mengelola Google Spreadsheet dan Google Drive.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyScript}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Kode Script'}</span>
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                  1
                </span>
                <p className="font-bold text-white">Buat Spreadsheet</p>
                <p className="text-[11px] text-slate-400">
                  Buat spreadsheet baru di Google Drive (misal: "Database Patas Net WiFi").
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                  2
                </span>
                <p className="font-bold text-white">Buka Apps Script</p>
                <p className="text-[11px] text-slate-400">
                  Klik menu <strong>Extensions &gt; Apps Script</strong>. Hapus isi default dan paste kode di bawah.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                  3
                </span>
                <p className="font-bold text-white">Deploy Sebagai Web App</p>
                <p className="text-[11px] text-slate-400">
                  Klik <strong>Deploy &gt; New deployment</strong>, pilih tipe <strong>Web app</strong>, Who has access: <strong>Anyone</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                  4
                </span>
                <p className="font-bold text-white">Tempel URL Web App</p>
                <p className="text-[11px] text-slate-400">
                  Salin URL berakhiran <code>/exec</code> lalu simpan di tab <strong>Koneksi Google Sheets</strong>.
                </p>
              </div>
            </div>

            {/* Code Box */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <pre className="p-4 text-slate-300 font-mono text-[11px] leading-relaxed max-h-[500px] overflow-y-auto selection:bg-emerald-600">
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: PENGATURAN IDENTITAS & GANTI LOGO GLOBAL */}
        {activeTab === 'settings_override' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="space-y-1 pb-4 border-b border-slate-800">
              <h2 className="text-xl font-black text-white">Pengaturan Identitas Perusahaan & Ganti Logo Global</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Setiap kali logo diganti di sini atau di dashboard admin, seluruh komponen yang memiliki logo (Home, Navbar, Footer, Dashboard Pelanggan, Dashboard Admin, Login Modal) akan otomatis berganti seketika di semua perangkat (HP maupun PC) secara realtime!
              </p>
            </div>

            <form onSubmit={handleSaveSettingsOverride} className="space-y-5 max-w-2xl">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Nama Perusahaan WiFi
                </label>
                <input
                  type="text"
                  value={overrideSettings.name}
                  onChange={(e) => setOverrideSettings({ ...overrideSettings, name: e.target.value })}
                  placeholder="Patas Net WiFi"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Teks Logo Identitas Visual
                </label>
                <input
                  type="text"
                  value={overrideSettings.logoText}
                  onChange={(e) => setOverrideSettings({ ...overrideSettings, logoText: e.target.value })}
                  placeholder="PATAS NET"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Alamat Kantor WiFi
                </label>
                <textarea
                  rows={2}
                  value={overrideSettings.address}
                  onChange={(e) => setOverrideSettings({ ...overrideSettings, address: e.target.value })}
                  placeholder="Alamat lengkap..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Upload Logo Component */}
              <div className="space-y-2 p-5 bg-slate-950 rounded-2xl border border-slate-800">
                <label className="block text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <Upload className="w-4 h-4" /> Upload File Logo Baru
                </label>
                <p className="text-[11px] text-slate-400">
                  Pilih gambar logo dari perangkat Anda. Gambar ini akan langsung menggantikan logo lama di seluruh halaman aplikasi dan disinkronkan ke Google Drive / Google Sheet.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                  <div className="w-20 h-20 rounded-2xl border border-slate-800 bg-slate-900 flex items-center justify-center p-2 shrink-0 shadow-inner">
                    {overrideSettings.logoUrl ? (
                      <img
                        src={overrideSettings.logoUrl}
                        alt="Preview Logo"
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    ) : (
                      <Logo companyName={overrideSettings.name} iconOnly={true} />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setOverrideSettings({
                              ...overrideSettings,
                              logoUrl: reader.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                    />

                    {overrideSettings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setOverrideSettings({ ...overrideSettings, logoUrl: '' })}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 underline block"
                      >
                        Reset ke Logo Default SVG
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview Logo in Light & Dark Mode */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4">
                  <div className="p-3 bg-white rounded-xl flex items-center gap-2 border shadow-sm">
                    <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Preview Terang:</span>
                    <Logo companyName={overrideSettings.name} logoUrl={overrideSettings.logoUrl} tagline={overrideSettings.tagline} />
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl flex items-center gap-2 border border-slate-800 shadow-sm">
                    <span className="text-[9px] text-slate-500 font-bold uppercase mr-1">Preview Gelap:</span>
                    <Logo companyName={overrideSettings.name} logoUrl={overrideSettings.logoUrl} tagline={overrideSettings.tagline} inverse={true} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan & Menyinkronkan...' : 'Simpan & Terapkan Logo ke Seluruh Aplikasi'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: OVERVIEW & METRICS */}
        {activeTab === 'overview' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-black text-white">Metrik Server & Arsitektur Database</h2>
              <p className="text-xs text-slate-400">
                Informasi status infrastruktur backend Patas Net.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Total Pelanggan</span>
                <p className="text-2xl font-black text-white">{metrics?.totalCustomers || customersList.length}</p>
                <span className="text-[10px] text-emerald-400 font-bold">Tersinkron di Google Sheets</span>
              </div>

              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Pelanggan Aktif</span>
                <p className="text-2xl font-black text-emerald-400">
                  {metrics?.activeCustomers || customersList.filter((c) => c.status === 'active').length}
                </p>
                <span className="text-[10px] text-slate-400">Internet Beroperasi</span>
              </div>

              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Menunggu Verifikasi</span>
                <p className="text-2xl font-black text-amber-400">
                  {metrics?.pendingVerificationPayments || paymentsList.filter((p) => p.status === 'pending_verification').length}
                </p>
                <span className="text-[10px] text-slate-400">Bukti bayar di Google Drive</span>
              </div>

              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Tiket Terbuka</span>
                <p className="text-2xl font-black text-blue-400">{ticketsList.length}</p>
                <span className="text-[10px] text-slate-400">Layanan Pelanggan</span>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Modal Image Viewer */}
      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ ...previewModal, isOpen: false })}
        imageUrl={previewModal.imageUrl}
        title={previewModal.title}
        subtitle={previewModal.subtitle}
      />
    </div>
  );
}
