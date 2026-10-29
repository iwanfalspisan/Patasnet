import React, { useState, useEffect } from 'react';
import {
  Wifi,
  CreditCard,
  Download,
  Send,
  AlertCircle,
  CheckCircle,
  FileText,
  Upload,
  Calendar,
  ArrowRight,
  User,
  MapPin,
  LogOut,
  Home,
  Copy,
  Check,
  ShieldCheck,
  Phone,
  Mail,
  Clock,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Zap,
  Sparkles
} from 'lucide-react';
import { CustomerUser, PaymentRecord, CompanySettings, SupportTicket } from '../types';
import { PACKAGES } from './Home';
import { jsPDF } from 'jspdf';
import { generateCustomerPDFReport } from '../lib/pdfGenerator';
import ImagePreviewModal from './ImagePreviewModal';
import {
  submitLocalPaymentProof,
  submitLocalQrisPayment,
  syncToGoogleSheets,
  getLocalTickets,
  addLocalTicket,
} from '../lib/clientFallback';
import { generateDefaultQrisSvg } from '../lib/qrisUtils';
import Logo from './Logo';

interface CustomerDashboardProps {
  user: CustomerUser;
  supportTickets?: SupportTicket[];
  onRefreshUser: () => void;
  onLogout: () => void;
  companyName?: string;
  logoUrl?: string;
  companySettings?: CompanySettings;
}

export default function CustomerDashboard({
  user,
  supportTickets = [],
  onRefreshUser,
  onLogout,
  companyName,
  logoUrl,
  companySettings
}: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'pay' | 'tickets' | 'profile'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [localTicketsState, setLocalTicketsState] = useState<SupportTicket[]>(() => getLocalTickets());

  useEffect(() => {
    const syncTickets = () => {
      setLocalTicketsState(getLocalTickets());
    };
    window.addEventListener('patasnet:data-updated', syncTickets);
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('patasnet_sync');
        bc.onmessage = () => syncTickets();
      }
    } catch {}
    return () => {
      window.removeEventListener('patasnet:data-updated', syncTickets);
      if (bc) bc.close();
    };
  }, []);

  // Merge tickets from props, user.tickets, and localStorage for this customer
  const customerTickets: SupportTicket[] = React.useMemo(() => {
    const map = new Map<string, SupportTicket>();
    const allSources = [
      ...(Array.isArray(user?.tickets) ? user.tickets : []),
      ...(Array.isArray(supportTickets) ? supportTickets : []),
      ...(Array.isArray(localTicketsState) ? localTicketsState : []),
    ];
    allSources.forEach((t) => {
      if (!t || !t.id) return;
      const matchesUser =
        (t.userId && t.userId === user.id) ||
        (t.email && user.email && t.email.toLowerCase() === user.email.toLowerCase()) ||
        (t.phone && user.phone && t.phone.replace(/\D/g, '') === user.phone.replace(/\D/g, '')) ||
        (t.userName && user.name && t.userName.trim().toLowerCase() === user.name.trim().toLowerCase());
      if (matchesUser) {
        map.set(t.id, t);
      }
    });
    return Array.from(map.values());
  }, [user, supportTickets, localTicketsState]);

  const openCustomerTickets = customerTickets.filter((t) => t.status !== 'resolved');
  const resolvedCustomerTickets = customerTickets.filter((t) => t.status === 'resolved');

  // Payment states
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [proofImage, setProofImage] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
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

  // Dynamic packages lookup with fallback
  const userPkg = PACKAGES.find((p) => p.id === user.packageId) || PACKAGES[0];

  // Bill categories with null-safety
  const userPayments = Array.isArray(user?.payments) ? user.payments : [];
  const unpaidBills = userPayments.filter((p) => p && p.status === 'unpaid');
  const pendingBills = userPayments.filter((p) => p && p.status === 'pending_verification');
  const paidBills = userPayments.filter((p) => p && p.status === 'paid');

  const handleSupportTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    setSubmittingTicket(true);
    const newTicket: SupportTicket = {
      id: `TCK-${Math.floor(5000 + Math.random() * 9000)}`,
      userId: user.id,
      userName: user.name,
      email: user.email,
      phone: user.phone,
      message: ticketMessage,
      status: 'open',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    addLocalTicket(newTicket);
    setLocalTicketsState(getLocalTickets());
    syncToGoogleSheets('create_ticket', newTicket).catch(() => {});

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          email: user.email,
          phone: user.phone,
          message: ticketMessage
        })
      });

      if (response.ok) {
        const resData = await response.json().catch(() => null);
        if (resData?.ticket) {
          addLocalTicket(resData.ticket);
          setLocalTicketsState(getLocalTickets());
        }
        setTicketSuccess(true);
        setTicketMessage('');
        onRefreshUser();
      } else {
        setTicketSuccess(true);
        setTicketMessage('');
      }
    } catch (err) {
      console.error(err);
      setTicketSuccess(true);
      setTicketMessage('');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleProofOfPaymentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !proofImage) return;

    setSubmittingPayment(true);
    // Update local state immediately for instant feedback
    submitLocalPaymentProof(user.id, selectedPayment.id, proofImage, paymentMethod);

    // Broadcast to cloud for instant real-time admin sync
    const updatedPayments = (user.payments || []).map((p) =>
      p.id === selectedPayment.id
        ? {
            ...p,
            status: 'pending_verification' as const,
            proofOfPaymentUrl: proofImage,
            method: paymentMethod,
          }
        : p
    );
    syncToGoogleSheets('submit_payment_proof', {
      userId: user.id,
      userName: user.name,
      paymentId: selectedPayment.id,
      proofBase64: proofImage,
      method: paymentMethod,
      amount: selectedPayment.amount,
      billingPeriod: selectedPayment.billingPeriod,
    }).catch(() => {});

    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          paymentId: selectedPayment.id,
          method: paymentMethod,
          proofOfPaymentUrlBase64: proofImage
        })
      });

      if (response.ok) {
        setPaymentSuccess(true);
        setProofImage('');
        setSelectedPayment(null);
        onRefreshUser(); // Refresh user state to show updated pending status
      }
    } catch (err) {
      console.warn('Backend payment verify failed, updated locally:', err);
      setPaymentSuccess(true);
      setProofImage('');
      setSelectedPayment(null);
      onRefreshUser();
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleInstantQrisPayment = async () => {
    if (!selectedPayment) return;

    setSubmittingPayment(true);
    const autoVerify = companySettings?.qrisAutoVerify !== false;
    const txId = `QRIS-${Math.floor(100000 + Math.random() * 900000)}`;

    // Instant local optimistic update
    submitLocalQrisPayment(user.id, selectedPayment.id, autoVerify);

    // Broadcast to cloud for instant real-time admin sync
    const updatedPayments = (user.payments || []).map((p) =>
      p.id === selectedPayment.id
        ? {
            ...p,
            status: (autoVerify ? 'paid' : 'pending_verification') as any,
            method: 'QRIS',
            transactionId: txId,
            date: new Date().toISOString().substring(0, 10),
          }
        : p
    );
    syncToGoogleSheets('submit_payment_proof', {
      userId: user.id,
      userName: user.name,
      paymentId: selectedPayment.id,
      method: 'QRIS',
      amount: selectedPayment.amount,
      billingPeriod: selectedPayment.billingPeriod,
    }).catch(() => {});

    try {
      const response = await fetch('/api/payments/qris-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          paymentId: selectedPayment.id
        })
      });

      if (response.ok) {
        setPaymentSuccess(true);
        setProofImage('');
        setSelectedPayment(null);
        onRefreshUser();
      }
    } catch (err) {
      console.warn('Backend QRIS payment sync failed, saved locally:', err);
      setPaymentSuccess(true);
      setProofImage('');
      setSelectedPayment(null);
      onRefreshUser();
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCopyAccount = (accountNo: string) => {
    navigator.clipboard.writeText(accountNo);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  // Automatic PDF Monthly Report Generator using jsPDF
  const handleDownloadPDFReport = (payment: PaymentRecord) => {
    const doc = new jsPDF();

    // Draw header border
    doc.setFillColor(30, 41, 59); // Dark blue / Slate-800
    doc.rect(0, 0, 210, 40, 'F');

    // Header Content
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text((companyName || 'Patas Net').toUpperCase() + ' WIFI', 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Laporan Tagihan Bulanan & Kuitansi Pembayaran', 15, 30);
    doc.text(`Periode: ${payment.billingPeriod}`, 155, 20);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 155, 26);

    // Bill To Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMASI PELANGGAN', 15, 55);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Nama Pelanggan  : ${user.name}`, 15, 63);
    doc.text(`Email Pelanggan : ${user.email}`, 15, 69);
    doc.text(`No. Handphone   : ${user.phone}`, 15, 75);
    doc.text(`Alamat Pasang   : ${user.address}`, 15, 81);

    // Network stats
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('DETAIL LAYANAN & STATISTIK BULANAN', 15, 95);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 100, 180, 28, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Paket Wifi Terpilih : ${userPkg.name}`, 20, 107);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bandwidth Internet  : ${userPkg.speed}`, 20, 113);
    doc.text(`SLA Ketersediaan    : 99.9% (Sangat Stabil)`, 20, 119);
    doc.text(`Total Konsumsi Data : 412.5 GB (Tanpa FUP / True Unlimited)`, 20, 125);

    // Pricing details table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RINCIAN TAGIHAN', 15, 140);

    doc.setFillColor(241, 245, 249);
    doc.rect(15, 145, 180, 8, 'F');
    doc.setFontSize(9);
    doc.text('Deskripsi Layanan', 20, 150);
    doc.text('Harga', 165, 150);

    doc.setFont('helvetica', 'normal');
    doc.text(`Biaya Berlangganan Paket Wifi - ${userPkg.name}`, 20, 160);
    doc.text(`Rp ${userPkg.price.toLocaleString('id-ID')}`, 165, 160);

    const rentStbAmount = payment.amount - userPkg.price;
    if (rentStbAmount > 0) {
      doc.text('Sewa Android STB Smart Box untuk TV', 20, 168);
      doc.text(`Rp ${rentStbAmount.toLocaleString('id-ID')}`, 165, 168);
    }

    doc.line(15, 175, 195, 175);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Tagihan Terbayar:', 20, 182);
    doc.text(`Rp ${payment.amount.toLocaleString('id-ID')}`, 165, 182);

    // Status Stamp
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(20, 184, 166);
    doc.rect(15, 192, 180, 16, 'FD');
    doc.setTextColor(13, 148, 136);
    doc.setFontSize(10);
    doc.text(`STATUS TRANSAKSI: LUNAS (PAID) - METODE: ${payment.method?.toUpperCase() || 'QRIS'}`, 25, 202);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Kuitansi ini diterbitkan secara sah oleh sistem tagihan otomatis ${(companyName || 'Patas Net').toUpperCase()} WIFI.`, 15, 260);

    doc.save(`Tagihan_${(companyName || 'Patas_Net').replace(/\s+/g, '_')}_${user.name.replace(/\s+/g, '_')}_${payment.billingPeriod.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-10 px-4 sm:px-6 space-y-6 sm:space-y-8 text-xs pb-28 md:pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl" />

        <div className="flex items-center gap-4">
          <div className="p-2 bg-white/10 rounded-2xl border border-white/15 shrink-0 shadow-inner">
            <Logo iconOnly={true} companyName={companyName} logoUrl={logoUrl} className="scale-110" />
          </div>
          <div className="space-y-1">
            <span className="px-3 py-0.5 bg-yellow-400 text-slate-950 font-extrabold text-[9px] rounded-full uppercase tracking-wider inline-block">
              PORTAL PELANGGAN {(companyName || 'PATAS NET').toUpperCase()}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Selamat Datang, {user.name}!</h1>
            <p className="text-xs text-blue-200">
              ID Pelanggan: <strong className="font-mono text-yellow-300">{user.id}</strong> | Paket: {userPkg.name} ({userPkg.speed})
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:items-center">
          <div className="flex gap-3.5 items-center bg-white/5 border border-white/10 px-4 py-3 rounded-2xl w-full sm:w-auto">
            <div className="p-2.5 bg-blue-600/30 rounded-xl text-yellow-400 shrink-0">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Status Jaringan</p>
              <p className="font-extrabold text-sm flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    user.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {user.status === 'active' ? 'Aktif (Koneksi Stabil)' : 'Menunggu Pemasangan'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center gap-1.5 px-3 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition border border-white/10 text-xs shrink-0"
            title={isSidebarOpen ? "Sembunyikan Menu" : "Buka Menu"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-yellow-300" /> : <PanelLeftOpen className="w-4 h-4 text-emerald-300" />}
            <span className="hidden sm:inline">{isSidebarOpen ? "Sembunyikan Menu" : "Buka Menu"}</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-red-600 text-white font-bold rounded-2xl transition border border-white/10 text-xs shrink-0"
            title="Keluar dari Akun"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Main Layout Container with Left Sidebar (Hidden on Mobile, replaced by Bottom Bar) */}
      <div className="flex flex-col lg:flex-row gap-6 relative">
        {/* Left Sidebar Menu (Desktop Only - Mobile uses Fixed Bottom App Bar) */}
        <aside className={`hidden lg:block shrink-0 transition-all duration-300 lg:sticky lg:top-20 h-fit ${isSidebarOpen ? 'w-full lg:w-64' : 'w-full lg:w-20'}`}>
          <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-md flex flex-col transition-all duration-300 ${isSidebarOpen ? 'p-5 gap-4' : 'p-3 gap-3 items-center'}`}>
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between pb-3.5 border-b border-slate-100 w-full gap-2' : 'justify-center pb-2.5 border-b border-slate-100 w-full'}`}>
              {isSidebarOpen ? (
                <>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">MENU PELANGGAN</span>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/60 hover:border-blue-200 rounded-xl transition shadow-2xs"
                    title="Sembunyikan Label Menu (Tampilkan Hanya Icon)"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/60 rounded-xl transition flex flex-col items-center justify-center gap-1 group shadow-2xs"
                  title="Buka Menu Pelanggan Lengkap"
                >
                  <PanelLeftOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                </button>
              )}
            </div>

            <nav className={`flex ${isSidebarOpen ? 'flex-col gap-1.5 text-xs w-full' : 'flex-row flex-wrap lg:flex-col gap-2 items-center justify-center w-full'}`}>
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                title="Beranda"
                className={`rounded-xl font-bold transition-all ${
                  isSidebarOpen
                    ? 'w-full text-left flex items-center gap-2.5 px-3.5 py-2.5'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'home'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                <Home className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Beranda</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pay')}
                title="Menu Bayar Tagihan"
                className={`rounded-xl font-bold transition-all relative ${
                  isSidebarOpen
                    ? 'w-full text-left flex items-center justify-between px-3.5 py-2.5'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'pay'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 shrink-0" />
                  {isSidebarOpen && <span>Menu Bayar</span>}
                </div>
                {unpaidBills.length > 0 && (
                  isSidebarOpen ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500 text-white">
                      {unpaidBills.length}
                    </span>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                  )
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                title="Lapor Gangguan / Tiket CS"
                className={`rounded-xl font-bold transition-all relative ${
                  isSidebarOpen
                    ? 'w-full text-left flex items-center justify-between px-3.5 py-2.5'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'tickets'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {isSidebarOpen && <span>Lapor Gangguan</span>}
                </div>
                {customerTickets.length > 0 && (
                  isSidebarOpen ? (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                        openCustomerTickets.length > 0
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {openCustomerTickets.length > 0 ? openCustomerTickets.length : '✓'}
                    </span>
                  ) : (
                    <span
                      className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white ${
                        openCustomerTickets.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                    />
                  )
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                title="Profil Akun & Paket"
                className={`rounded-xl font-bold transition-all ${
                  isSidebarOpen
                    ? 'w-full text-left flex items-center gap-2.5 px-3.5 py-2.5'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Profil Akun</span>}
              </button>
            </nav>
          </div>
        </aside>

        {/* Right Main Panel */}
        <div key={activeTab} className="tab-transition flex-1 min-w-0 space-y-6">

      {/* ========================================================================= */}
      {/* TAB 1: BERANDA (OVERVIEW) */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Support Ticket Resolved / Open Notification Banner */}
          {resolvedCustomerTickets.length > 0 && openCustomerTickets.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shrink-0 mt-0.5">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm text-emerald-950">
                      Laporan Gangguan Anda Telah Selesai Diperbaiki!
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-200 text-emerald-900">
                      Selesai ({resolvedCustomerTickets[0].id})
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Kendala: <em>"{resolvedCustomerTickets[0].message}"</em> — Tim teknisi kami telah menyelesaikan perbaikan. Silakan periksa kembali koneksi WiFi Anda.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shrink-0 text-center"
              >
                Lihat Detail Tiket &rarr;
              </button>
            </div>
          )}

          {openCustomerTickets.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shrink-0 mt-0.5">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm text-blue-950">
                      Tiket Gangguan Sedang Ditangani Teknisi ({openCustomerTickets.length} Laporan Aktif)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                      Dalam Penanganan
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                    Kendala: <em>"{openCustomerTickets[0].message}"</em> — Status akan otomatis berubah menjadi <strong>Selesai</strong> ketika perbaikan tuntas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shrink-0 text-center"
              >
                Pantau Status &rarr;
              </button>
            </div>
          )}

          {/* Unpaid Bill Alert Banner if any */}
          {unpaidBills.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-2xl shrink-0 mt-0.5">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-amber-950">Tagihan Belum Dibayar: Periode {unpaidBills[0].billingPeriod}</h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Jumlah tagihan sebesar <strong>Rp {unpaidBills[0].amount.toLocaleString('id-ID')}</strong>. Segera lakukan pembayaran untuk menjaga koneksi WiFi tetap lancar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPayment(unpaidBills[0]);
                  setActiveTab('pay');
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 shrink-0 text-center"
              >
                Bayar Sekarang &rarr;
              </button>
            </div>
          )}

          {/* Grid Package & Connection Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Detail Paket Card */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-slate-100 gap-2">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Detail Paket WiFi Anda
                </h3>
                <button
                  type="button"
                  onClick={() => generateCustomerPDFReport(user)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-[10px] transition self-start"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Laporan PDF
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nama Paket</span>
                  <p className="font-extrabold text-sm text-slate-900">{userPkg.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kecepatan Internet</span>
                  <p className="font-black text-sm text-blue-600 font-mono">{userPkg.speed}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tarif Bulanan</span>
                  <p className="font-extrabold text-sm text-slate-900">
                    Rp {userPkg.price.toLocaleString('id-ID')} / bulan
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Titik Pemasangan Terdaftar:</span>
                  <p className="text-[11px] mt-0.5 text-slate-500 leading-relaxed">{user.address}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">
                    Koordinat: {user.coordinates[0].toFixed(5)}, {user.coordinates[1].toFixed(5)}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Box */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Aksi Cepat Pelanggan
                </h4>

                <button
                  type="button"
                  onClick={() => setActiveTab('pay')}
                  className="w-full p-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl font-bold text-xs flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Buka Menu Pembayaran</span>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-slate-600" />
                    <span>Laporkan Kendala WiFi</span>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </button>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 text-[11px] flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Internet Anda aktif tanpa batas kuota FUP (True Unlimited 24/7).</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MENU BAYAR (DEDICATED PAYMENT HUB & REPORTING) */}
      {/* ========================================================================= */}
      {activeTab === 'pay' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Notification report confirmation banner */}
          {paymentSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-2 animate-in zoom-in-95">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-extrabold text-emerald-950">Bukti Pembayaran Berhasil Dikirim!</h3>
              <p className="text-xs text-emerald-800 max-w-lg mx-auto leading-relaxed">
                Laporan konfirmasi pembayaran Anda telah diteruskan secara otomatis ke <strong>Dashboard Admin WiFi</strong>. Admin akan segera memverifikasi bukti transfer dan status internet Anda akan tetap aktif.
              </p>
              <button
                type="button"
                onClick={() => setPaymentSuccess(false)}
                className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition"
              >
                Tutup Notifikasi
              </button>
            </div>
          )}

          {/* Form / Modal Portal Pembayaran Aktif */}
          {selectedPayment ? (
            <div className="bg-white rounded-3xl border-2 border-blue-500 shadow-xl p-6 sm:p-8 space-y-6 max-w-2xl mx-auto">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">Portal Pembayaran Tagihan</h3>
                    <p className="text-[11px] text-slate-400">Pilih metode bayar dan unggah foto resi/struk transfer.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayment(null);
                    setProofImage('');
                  }}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
              </div>

              {/* Tagihan Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Periode Tagihan</span>
                  <p className="text-sm font-extrabold text-slate-900">{selectedPayment.billingPeriod}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total yang Harus Dibayar</span>
                  <p className="text-lg font-black text-blue-600 font-mono">Rp {selectedPayment.amount.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Form Bayar */}
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Pilih Metode Pembayaran *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="qris">QRIS (OVO, GoPay, DANA, LinkAja, BCA Mobile - Instan)</option>
                    <option value="bca">Transfer Bank BCA - 1234-567-890 a/n PT Patas Net Telemedia</option>
                    <option value="mandiri">Transfer Bank Mandiri - 9876-543-210 a/n PT Patas Net Telemedia</option>
                    <option value="bri">Transfer Bank BRI - 0021-010-888 a/n PT Patas Net Telemedia</option>
                  </select>
                </div>

                {/* Account Details Box */}
                {paymentMethod === 'qris' ? (
                  <div className="bg-gradient-to-b from-emerald-50/50 to-slate-50 p-5 rounded-3xl border border-emerald-100 text-center space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100/60">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="font-extrabold text-xs text-slate-800">QRIS Merchant Resmi</span>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Bebas Unggah Bukti
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div className="max-w-[240px] mx-auto bg-white p-3 rounded-2xl border-2 border-emerald-200 shadow-md">
                      <img
                        src={
                          companySettings?.qrisUrl ||
                          generateDefaultQrisSvg(
                            companySettings?.qrisMerchantName || companyName || 'PATAS NET',
                            companySettings?.qrisNmid || 'ID1020039281747',
                            selectedPayment.amount
                          )
                        }
                        alt="QRIS Barcode"
                        className="w-full h-auto object-contain rounded-xl mx-auto cursor-pointer"
                        onClick={() =>
                          setPreviewModal({
                            isOpen: true,
                            imageUrl:
                              companySettings?.qrisUrl ||
                              generateDefaultQrisSvg(
                                companySettings?.qrisMerchantName || companyName || 'PATAS NET',
                                companySettings?.qrisNmid || 'ID1020039281747',
                                selectedPayment.amount
                              ),
                            title: `QRIS - ${companySettings?.qrisMerchantName || companyName || 'PATAS NET'}`,
                            subtitle: `NMID: ${companySettings?.qrisNmid || 'ID1020039281747'} | Tagihan: Rp ${selectedPayment.amount.toLocaleString('id-ID')}`,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="font-extrabold text-xs text-slate-900">
                        {companySettings?.qrisMerchantName || `${companyName || 'PATAS NET'} - PT AMANUSA TELEMEDIA`}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        NMID: {companySettings?.qrisNmid || 'ID1020039281747'}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-bold">
                        Total Pembayaran: Rp {selectedPayment.amount.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed max-w-md mx-auto">
                      {companySettings?.qrisInstructions ||
                        'Scan barcode QRIS di atas dengan aplikasi Mobile Banking atau e-Wallet apa pun. Setelah transaksi berhasil di aplikasi Anda, klik tombol Konfirmasi Pembayaran QRIS di bawah tanpa perlu unggah bukti transfer.'}
                    </p>

                    {/* Quick Download QRIS */}
                    <div className="flex justify-center gap-2 pt-1">
                      <a
                        href={
                          companySettings?.qrisUrl ||
                          generateDefaultQrisSvg(
                            companySettings?.qrisMerchantName || companyName || 'PATAS NET',
                            companySettings?.qrisNmid || 'ID1020039281747',
                            selectedPayment.amount
                          )
                        }
                        download={`QRIS_${(companyName || 'PATAS_NET').replace(/\s+/g, '_')}_${selectedPayment.billingPeriod}.png`}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-bold shadow-2xs transition flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Barcode QRIS</span>
                      </a>
                    </div>

                    {/* TOMBOL UTAMA QRIS: INSTANT CONFIRM WITHOUT PROOF */}
                    <div className="pt-2 border-t border-emerald-100/80">
                      <button
                        type="button"
                        onClick={handleInstantQrisPayment}
                        disabled={submittingPayment}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                        <span>
                          {submittingPayment
                            ? 'Memproses Pembayaran QRIS...'
                            : 'Saya Sudah Bayar via QRIS (Konfirmasi Langsung Tanpa Unggah Bukti)'}
                        </span>
                      </button>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Tagihan langsung terverifikasi otomatis dan notifikasi WhatsApp diterbitkan.
                      </p>
                    </div>

                    {/* Opsi Opsional untuk Lampirkan Screenshot jika pelanggan tetap ingin */}
                    <div className="pt-2 text-left">
                      <details className="text-[10px] text-slate-500">
                        <summary className="font-bold text-slate-600 cursor-pointer hover:underline">
                          + Atau ingin tetap melampirkan tangkapan layar pembayaran? (Opsional)
                        </summary>
                        <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                          <label className="block font-bold text-slate-700">Lampirkan Screenshot Resi (Opsional):</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProofOfPaymentUpload}
                            className="text-xs"
                          />
                          {proofImage && (
                            <img src={proofImage} alt="Bukti Transfer" className="h-20 object-contain rounded-lg border border-slate-200" />
                          )}
                        </div>
                      </details>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Informasi Nomor Rekening:</span>
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-100">
                        <div>
                          <p className="font-bold text-xs text-slate-800">
                            {paymentMethod === 'bca' ? 'BCA: 1234567890' : paymentMethod === 'mandiri' ? 'Mandiri: 9876543210' : 'BRI: 0021010888'}
                          </p>
                          <p className="text-[10px] text-slate-400">a/n PT Patas Net Telemedia</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(paymentMethod === 'bca' ? '1234567890' : paymentMethod === 'mandiri' ? '9876543210' : '0021010888')}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[10px] transition flex items-center gap-1"
                        >
                          {copiedAccount ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedAccount ? 'Tersalin' : 'Salin Rekening'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Upload proof of transfer for Bank Transfer */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase">Unggah Bukti Transfer / Resi Pembayaran *</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center bg-slate-50/50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProofOfPaymentUpload}
                          className="hidden"
                          id="payment-receipt-upload"
                          required
                        />
                        {proofImage ? (
                          <div className="space-y-2">
                            <img src={proofImage} alt="Bukti Transfer" className="h-28 object-contain rounded-xl border border-slate-200 mx-auto" />
                            <button
                              type="button"
                              onClick={() => setProofImage('')}
                              className="text-[10px] text-red-500 font-bold hover:underline block mx-auto"
                            >
                              Hapus & Pilih Ulang
                            </button>
                          </div>
                        ) : (
                          <label htmlFor="payment-receipt-upload" className="cursor-pointer space-y-1.5 flex flex-col items-center py-2">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                              <Upload className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-700 block text-xs">Pilih Foto Struk / Bukti Transfer</span>
                            <span className="text-[10px] text-slate-400">Format PNG, JPG, atau Tangkapan Layar M-Banking</span>
                          </label>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingPayment || !proofImage}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{submittingPayment ? 'Mengirim Bukti ke Admin...' : 'Konfirmasi & Laporkan Pembayaran ke Admin'}</span>
                    </button>
                  </>
                )}
              </form>
            </div>
          ) : null}

          {/* Tabel Riwayat & Tagihan */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" /> Riwayat & Status Tagihan Pembayaran
              </h3>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
                Auto-Synchronized
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4">Jumlah Tagihan</th>
                    <th className="py-3 px-4">Status Pembayaran</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {userPayments.map((pm) => (
                    <tr key={pm.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {pm.billingPeriod}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        Rp {pm.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-extrabold text-[9px] uppercase border ${
                            pm.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : pm.status === 'pending_verification'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              pm.status === 'paid'
                                ? 'bg-emerald-500'
                                : pm.status === 'pending_verification'
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-red-500'
                            }`}
                          />
                          {pm.status === 'paid'
                            ? 'Lunas'
                            : pm.status === 'pending_verification'
                            ? 'Laporan Sedang Diverifikasi Admin'
                            : 'Belum Dibayar'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        {pm.proofOfPaymentUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModal({
                                isOpen: true,
                                imageUrl: pm.proofOfPaymentUrl!,
                                title: `Bukti Pembayaran - Periode ${pm.billingPeriod}`,
                                subtitle: `Jumlah: Rp ${pm.amount.toLocaleString('id-ID')} | Status: ${pm.status.toUpperCase()}`,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-[10px] transition border border-blue-200"
                            title="Lihat Bukti Transfer yang Telah Diunggah"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Bukti</span>
                          </button>
                        )}
                        {pm.status === 'unpaid' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayment(pm);
                              setPaymentSuccess(false);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition shadow-md shadow-blue-600/20 active:scale-95"
                          >
                            Bayar Sekarang
                          </button>
                        )}
                        {pm.status === 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleDownloadPDFReport(pm)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-xl font-bold text-[10px] transition border border-slate-200"
                            title="Unduh PDF Kuitansi Tagihan"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" /> Kuitansi PDF
                          </button>
                        )}
                        {pm.status === 'pending_verification' && !pm.proofOfPaymentUrl && (
                          <span className="text-[11px] text-slate-400 italic">
                            Menunggu konfirmasi admin
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LAPOR GANGGUAN (SUPPORT TICKETS) */}
      {/* ========================================================================= */}
      {activeTab === 'tickets' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Pusat Bantuan & Lapor Gangguan</h3>
                <p className="text-xs text-slate-400">Kirim tiket masalah teknis langsung ke teknisi siaga.</p>
              </div>
            </div>

            {ticketSuccess ? (
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-extrabold text-sm text-emerald-950">Laporan Gangguan Berhasil Terkirim!</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tiket laporan Anda telah masuk ke sistem antrean teknisi kami. Teknisi akan menghubungi Anda melalui WhatsApp atau langsung memeriksa jalur ODP terdekat dalam waktu maksimal 30 menit.
                </p>
                <button
                  type="button"
                  onClick={() => setTicketSuccess(false)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition"
                >
                  Buat Laporan Tambahan
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupportTicketSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase" htmlFor="ticket-desc">
                    Jelaskan Kendala WiFi Anda *
                  </label>
                  <textarea
                    id="ticket-desc"
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Contoh: Lampu LOS router berkedip merah sejak sore, koneksi internet terputus, mohon dicek jalurnya..."
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none h-32 resize-none bg-slate-50/50"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingTicket ? 'Mengirimkan Tiket...' : 'Kirim Tiket Laporan Teknis'}</span>
                </button>
              </form>
            )}

            {/* Emergency Hotline info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
              <strong className="text-slate-800 block">Layanan Darurat 24 Jam:</strong>
              <p className="text-[11px] text-slate-500">
                Hubungi Call Center WhatsApp kami di <strong className="text-blue-600">{companySettings?.whatsappNumber || '0812-3456-7890'}</strong> apabila ada kendala kabel fiber optik putus akibat pohon tumbang.
              </p>
            </div>
          </div>

          {/* Riwayat & Status Tiket Gangguan Pelanggan */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-5 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Riwayat & Status Laporan Gangguan Anda
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pantau secara langsung apakah laporan gangguan WiFi Anda sedang ditangani atau sudah selesai diperbaiki.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[10px]">
                Total: {customerTickets.length} Laporan
              </span>
            </div>

            {customerTickets.length > 0 ? (
              <div className="space-y-3">
                {customerTickets.map((t) => {
                  const isResolved = t.status === 'resolved';
                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition ${
                        isResolved
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            {t.id}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">{t.date}</span>
                        </div>

                        {isResolved ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-600 text-white shadow-2xs">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Selesai Diperbaiki
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-white shadow-2xs animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            Sedang Ditangani Teknisi
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800 leading-relaxed mb-2">
                        "{t.message}"
                      </p>

                      {isResolved ? (
                        <div className="flex items-start gap-2 pt-2 border-t border-emerald-200/70 text-[11px] text-emerald-800">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Gangguan Selesai:</strong> Laporan kendala ini telah selesai diperbaiki oleh tim teknisi {companyName || companySettings?.name || 'Patas.Net'}. Silakan gunakan kembali layanan internet Anda.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 pt-2 border-t border-amber-200/70 text-[11px] text-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Dalam Penanganan:</strong> Tim teknisi kami sedang menindaklanjuti laporan Anda. Status akan berubah menjadi <strong>Selesai Diperbaiki</strong> setelah kendala teratasi.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Belum ada riwayat laporan gangguan pada akun Anda. Koneksi internet Anda terpantau normal.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PROFIL AKUN (CUSTOMER PROFILE) */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Informasi Profil Pelanggan</h3>
                <p className="text-xs text-slate-400">Data registrasi dan akun langganan WiFi Anda.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</span>
                <p className="font-extrabold text-slate-800">{user.name}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">ID Pelanggan</span>
                <p className="font-mono font-extrabold text-blue-600">{user.id}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Nomor WhatsApp / HP</span>
                <p className="font-mono font-bold text-slate-800">{user.phone}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Alamat Email</span>
                <p className="font-bold text-slate-800 truncate">{user.email}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Alamat Pemasangan WiFi</span>
              <p className="text-xs text-slate-700 leading-relaxed">{user.address}</p>
              <p className="text-[10px] font-mono text-slate-400">
                Koordinat GPS: {user.coordinates[0].toFixed(5)}, {user.coordinates[1].toFixed(5)}
              </p>
            </div>

            {user.ktpImageUrl && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={user.ktpImageUrl}
                    alt="Foto KTP"
                    className="w-14 h-10 object-cover rounded-xl border border-slate-200 cursor-pointer shadow-sm hover:scale-105 transition bg-white"
                    onClick={() =>
                      setPreviewModal({
                        isOpen: true,
                        imageUrl: user.ktpImageUrl!,
                        title: `Foto KTP Terdaftar - ${user.name}`,
                        subtitle: `ID: ${user.id} | Validasi Identitas Pelanggan`,
                      })
                    }
                  />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Dokumen KTP Pelanggan</span>
                    <span className="text-xs font-bold text-slate-800">Tersimpan & Terverifikasi</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewModal({
                      isOpen: true,
                      imageUrl: user.ktpImageUrl!,
                      title: `Foto KTP Terdaftar - ${user.name}`,
                      subtitle: `ID: ${user.id} | Validasi Identitas Pelanggan`,
                    })
                  }
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat KTP</span>
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun Pelanggan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (APP-LIKE MOBILE EXPERIENCE) */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-8px_25px_-5px_rgba(15,23,42,0.12)] py-1.5 px-2 flex justify-around items-center lg:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'home'
              ? 'text-blue-600 font-extrabold bg-blue-50/80'
              : 'text-slate-500 hover:text-slate-800 font-semibold'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pay')}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'pay'
              ? 'text-blue-600 font-extrabold bg-blue-50/80'
              : 'text-slate-500 hover:text-slate-800 font-semibold'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px]">Bayar</span>
          {unpaidBills.length > 0 && (
            <span className="absolute top-1 right-2.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-white" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'tickets'
              ? 'text-blue-600 font-extrabold bg-blue-50/80'
              : 'text-slate-500 hover:text-slate-800 font-semibold'
          }`}
        >
          <AlertCircle className="w-5 h-5" />
          <span className="text-[10px]">Gangguan</span>
          {customerTickets.length > 0 && (
            <span
              className={`absolute top-1 right-2 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                openCustomerTickets.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'profile'
              ? 'text-blue-600 font-extrabold bg-blue-50/80'
              : 'text-slate-500 hover:text-slate-800 font-semibold'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profil</span>
        </button>
      </nav>

      {/* Lightbox Image Preview Modal */}
      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        imageUrl={previewModal.imageUrl}
        title={previewModal.title}
        subtitle={previewModal.subtitle}
      />
    </div>
  );
}
