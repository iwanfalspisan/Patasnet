import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, RefreshCw, Download, ExternalLink, Search, CheckCircle2, Database, Table2 } from 'lucide-react';

interface GoogleSpreadsheetViewerProps {
  webAppUrl?: string;
  onRefreshParent?: () => void;
  className?: string;
}

export default function GoogleSpreadsheetViewer({
  webAppUrl,
  onRefreshParent,
  className = '',
}: GoogleSpreadsheetViewerProps) {
  const [activeTab, setActiveTab] = useState<'Pelanggan' | 'Pembayaran' | 'Tiket' | 'Pengaturan'>('Pelanggan');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetsDb, setSheetsDb] = useState<{
    sheets: {
      Pelanggan: any[][];
      Pembayaran: any[][];
      Tiket: any[][];
      Pengaturan: any[][];
    };
    headers: {
      Pelanggan: string[];
      Pembayaran: string[];
      Tiket: string[];
      Pengaturan: string[];
    };
    lastSyncedAt?: string;
    totalRecords?: number;
  }>({
    sheets: { Pelanggan: [], Pembayaran: [], Tiket: [], Pengaturan: [] },
    headers: {
      Pelanggan: ['Timestamp', 'ID Pelanggan', 'Nama Lengkap', 'Email', 'Nomor WA', 'Alamat', 'Koordinat', 'Paket', 'Status', 'URL KTP'],
      Pembayaran: ['Timestamp', 'ID Pembayaran', 'ID Pelanggan', 'Nama', 'Nominal', 'Periode', 'Metode', 'Status', 'URL Bukti Bayar'],
      Tiket: ['Timestamp', 'ID Tiket', 'ID Pelanggan', 'Nama', 'Nomor WA', 'Pesan Masalah', 'Status'],
      Pengaturan: ['Key', 'Value', 'UpdatedAt'],
    },
    totalRecords: 0,
  });

  const fetchSheetsData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheets/database');
      if (res.ok) {
        const data = await res.json();
        if (data && data.database) {
          setSheetsDb(data.database);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch sheets database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetsData();
    const interval = setInterval(fetchSheetsData, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentHeaders = sheetsDb.headers?.[activeTab] || [];
  const currentRows = sheetsDb.sheets?.[activeTab] || [];

  const filteredRows = currentRows.filter((row) => {
    if (!searchQuery.trim()) return true;
    return row.some((cell) => String(cell || '').toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const exportCurrentSheetToCsv = () => {
    if (!currentHeaders.length) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [currentHeaders.join(','), ...filteredRows.map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PatasNet_Sheet_${activeTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getColLetter = (idx: number) => {
    return String.fromCharCode(65 + idx);
  };

  const tabColors = {
    Pelanggan: 'border-blue-600 text-blue-600 bg-blue-50/50',
    Pembayaran: 'border-emerald-600 text-emerald-600 bg-emerald-50/50',
    Tiket: 'border-amber-600 text-amber-600 bg-amber-50/50',
    Pengaturan: 'border-indigo-600 text-indigo-600 bg-indigo-50/50',
  };

  const tabHeaderBgs = {
    Pelanggan: 'bg-blue-600 text-white',
    Pembayaran: 'bg-emerald-600 text-white',
    Tiket: 'bg-amber-600 text-white',
    Pengaturan: 'bg-indigo-600 text-white',
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden flex flex-col ${className}`}>
      {/* Top Google Sheets Style Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xs sm:text-sm tracking-tight text-white flex items-center gap-1.5">
                Google Sheets Live Database
              </h3>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 2-Arah Aktif
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Database Utama: Semua perubahan langsung terekam & tersinkronisasi otomatis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              fetchSheetsData();
              if (onRefreshParent) onRefreshParent();
            }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5"
            title="Refresh tabel lembar kerja"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={exportCurrentSheetToCsv}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5"
            title="Unduh Lembar Ini ke File CSV / Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          {webAppUrl ? (
            <a
              href={webAppUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Buka Spreadsheet di Google Drive"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Google Sheets</span>
            </a>
          ) : (
            <a
              href="https://sheets.new"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Buat Google Spreadsheet Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buat Spreadsheet Baru</span>
            </a>
          )}
        </div>
      </div>

      {/* Tabs Selector for the 4 Sheets */}
      <div className="bg-slate-100/80 px-3 pt-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {(['Pelanggan', 'Pembayaran', 'Tiket', 'Pengaturan'] as const).map((tab) => {
            const count = sheetsDb.sheets?.[tab]?.length || 0;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-t-xl text-xs font-bold transition-all border-t-2 flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? `bg-white ${tabColors[tab]} shadow-xs`
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Sheet: {tab}</span>
                <span className="text-[10px] bg-slate-200/80 text-slate-700 font-extrabold px-1.5 py-0.2 rounded-full">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search in Active Sheet */}
        <div className="relative pb-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari di Sheet ${activeTab}...`}
            className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-56"
          />
        </div>
      </div>

      {/* Spreadsheet Grid Table */}
      <div className="flex-1 overflow-x-auto max-h-[420px] divide-y divide-slate-100 font-mono text-[11px]">
        <table className="w-full text-left border-collapse">
          <thead>
            {/* Letters Row (A, B, C, D...) */}
            <tr className="bg-slate-100 text-slate-400 text-[10px] select-none border-b border-slate-200">
              <th className="w-12 px-2 py-1 text-center font-normal border-r border-slate-200 bg-slate-200/60">#</th>
              {currentHeaders.map((_, i) => (
                <th key={i} className="px-3 py-1 text-center font-normal border-r border-slate-200 last:border-r-0">
                  {getColLetter(i)}
                </th>
              ))}
            </tr>

            {/* Header Columns Row */}
            <tr className={`${tabHeaderBgs[activeTab]} text-[11px] font-bold select-none shadow-xs sticky top-0 z-10`}>
              <th className="w-12 px-2 py-2 text-center border-r border-white/20 bg-black/10">1</th>
              {currentHeaders.map((header, idx) => (
                <th key={idx} className="px-3 py-2 border-r border-white/20 last:border-r-0 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/80 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={currentHeaders.length + 1} className="py-12 text-center text-slate-400 font-sans text-xs">
                  {searchQuery ? 'Tidak ada data yang cocok dengan pencarian.' : `Sheet "${activeTab}" masih kosong.`}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, rowIdx) => {
                const rowNumber = rowIdx + 2; // header is row 1
                return (
                  <tr key={rowIdx} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="w-12 px-2 py-2 text-center text-slate-400 font-mono bg-slate-50 border-r border-slate-200 select-none group-hover:text-blue-600">
                      {rowNumber}
                    </td>
                    {row.map((cell: any, cellIdx: number) => {
                      const cellStr = String(cell !== undefined && cell !== null ? cell : '');
                      const isLink = cellStr.startsWith('http://') || cellStr.startsWith('https://');
                      const isStatus = cellIdx === 8 && activeTab === 'Pelanggan';

                      return (
                        <td
                          key={cellIdx}
                          className="px-3 py-2 border-r border-slate-200/60 last:border-r-0 whitespace-nowrap max-w-xs truncate text-slate-800"
                          title={cellStr}
                        >
                          {isLink ? (
                            <a
                              href={cellStr}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline hover:text-blue-800 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{cellStr}</span>
                            </a>
                          ) : isStatus ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                cellStr === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : cellStr === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {cellStr}
                            </span>
                          ) : (
                            <span>{cellStr}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Spreadsheet Bottom Status Bar */}
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 font-sans gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            Menampilkan <strong>{filteredRows.length}</strong> dari <strong>{currentRows.length}</strong> baris data di Sheet{' '}
            <strong>{activeTab}</strong>.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            Terakhir disinkronkan:{' '}
            <strong className="text-slate-700">
              {sheetsDb.lastSyncedAt
                ? new Date(sheetsDb.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Baru saja'}
            </strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-bold">Auto-sync: Setiap ada perubahan data</span>
        </div>
      </div>
    </div>
  );
}
