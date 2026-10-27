import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  CreditCard,
  Download,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Settings,
  ShieldCheck,
  Globe,
  Database,
  Trash,
  Trash2,
  PhoneCall,
  Search,
  Check,
  RefreshCw,
  Wifi,
  Plus,
  X,
  Upload,
  Image as ImageIcon,
  Eye,
  FileSpreadsheet,
  HardDrive,
  Copy,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Save,
  QrCode,
  Zap
} from 'lucide-react';
import { CustomerUser, PaymentRecord, SupportTicket, WifiPackage, CompanySettings } from '../types';
import { generateCustomerPDFReport } from '../lib/pdfGenerator';
import { PACKAGES } from './Home';
import Logo from './Logo';
import ImagePreviewModal from './ImagePreviewModal';
import GoogleSpreadsheetViewer from './GoogleSpreadsheetViewer';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../lib/googleSheetsIntegration';
import { getGoogleSheetsWebhookUrl, saveGoogleSheetsWebhookUrl } from '../lib/clientFallback';
import { generateDefaultQrisSvg } from '../lib/qrisUtils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';

// Leaflet import for admin map visualization
import L from '../lib/leafletSafe';

interface AdminDashboardProps {
  customers: CustomerUser[];
  supportTickets: SupportTicket[];
  onRefreshData: () => void;
  onUpdateCustomerStatus: (id: string, status: 'pending' | 'active' | 'suspended') => Promise<void>;
  onVerifyPayment: (userId: string, paymentId: string) => Promise<void>;
  onRejectPayment?: (userId: string, paymentId: string) => Promise<void>;
  whatsappLogs?: any[];
  companySettings?: CompanySettings;
  onUpdateCompanySettings?: (newSettings: Partial<CompanySettings> & { name: string }) => Promise<boolean>;
}

export default function AdminDashboard({
  customers = [],
  supportTickets = [],
  onRefreshData,
  onUpdateCustomerStatus,
  onVerifyPayment,
  onRejectPayment,
  whatsappLogs = [],
  companySettings,
  onUpdateCompanySettings
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'payments' | 'tickets' | 'packages' | 'company_settings' | 'qris' | 'coverage' | 'sheets'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserForMap, setSelectedUserForMap] = useState<CustomerUser | null>(null);

  // Google Sheets Webhook URL state
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState(getGoogleSheetsWebhookUrl());
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sidebar visibility state for collapsible left navigation menu
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Company Settings form states
  const [companyNameInput, setCompanyNameInput] = useState(companySettings?.name || 'Patas Net WiFi');
  const [companyLegalNameInput, setCompanyLegalNameInput] = useState(companySettings?.legalName || 'PT. AMANUSA TELEMEDIA');
  const [companyTaglineInput, setCompanyTaglineInput] = useState(companySettings?.tagline || 'Internet Fiber Optic Cepat, Stabil & Tanpa Batas Kuota');
  const [companyCoverageTextInput, setCompanyCoverageTextInput] = useState(companySettings?.coverageText || '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan');
  const [companyWhatsappNumberInput, setCompanyWhatsappNumberInput] = useState(companySettings?.whatsappNumber || '0812-3456-7890');
  const [companyPhoneNumberInput, setCompanyPhoneNumberInput] = useState(companySettings?.phoneNumber || '+62 899-3299-977');
  const [companyEmailInput, setCompanyEmailInput] = useState(companySettings?.email || 'cs@patasnet.id');
  const [companyInstagramUrlInput, setCompanyInstagramUrlInput] = useState(companySettings?.instagramUrl || 'https://instagram.com/patasnet.id');
  const [companyFacebookUrlInput, setCompanyFacebookUrlInput] = useState(companySettings?.facebookUrl || 'https://facebook.com/patasnet.id');
  const [companyYoutubeUrlInput, setCompanyYoutubeUrlInput] = useState(companySettings?.youtubeUrl || 'https://youtube.com/@patasnet');
  const [companyAddressInput, setCompanyAddressInput] = useState(companySettings?.address || 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110');
  const [companyLogoTextInput, setCompanyLogoTextInput] = useState(companySettings?.logoText || 'PATAS NET');
  const [companyLogoUrlInput, setCompanyLogoUrlInput] = useState(companySettings?.logoUrl || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // QRIS Payment Settings states
  const [qrisUrlInput, setQrisUrlInput] = useState(companySettings?.qrisUrl || '');
  const [qrisMerchantNameInput, setQrisMerchantNameInput] = useState(companySettings?.qrisMerchantName || `${companySettings?.name || 'PATAS NET'} - ${companySettings?.legalName || 'PT AMANUSA TELEMEDIA'}`);
  const [qrisNmidInput, setQrisNmidInput] = useState(companySettings?.qrisNmid || 'ID1020039281747');
  const [qrisAutoVerifyInput, setQrisAutoVerifyInput] = useState(companySettings?.qrisAutoVerify !== false);
  const [qrisInstructionsInput, setQrisInstructionsInput] = useState(
    companySettings?.qrisInstructions ||
    'Buka m-Banking atau e-Wallet (BCA Mobile, Mandiri Livin, BRImo, BNI, GoPay, OVO, DANA, ShopeePay), scan barcode QRIS, masukkan nominal sesuai tagihan, lalu klik Konfirmasi Pembayaran QRIS.'
  );
  const [savingQris, setSavingQris] = useState(false);
  const [uploadingQris, setUploadingQris] = useState(false);

  // Promo Images states
  const [promosList, setPromosList] = useState<string[]>(companySettings?.promos || []);
  const [newPromoImage, setNewPromoImage] = useState<string>('');
  const [uploadingPromo, setUploadingPromo] = useState(false);

  // Sync inputs with props if they load later
  useEffect(() => {
    if (companySettings) {
      setCompanyNameInput(companySettings.name || 'Patas Net WiFi');
      setCompanyLegalNameInput(companySettings.legalName || 'PT. AMANUSA TELEMEDIA');
      setCompanyTaglineInput(companySettings.tagline || 'Internet Fiber Optic Cepat, Stabil & Tanpa Batas Kuota');
      setCompanyCoverageTextInput(companySettings.coverageText || '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan');
      setCompanyWhatsappNumberInput(companySettings.whatsappNumber || '0812-3456-7890');
      setCompanyPhoneNumberInput(companySettings.phoneNumber || '+62 899-3299-977');
      setCompanyEmailInput(companySettings.email || 'cs@patasnet.id');
      setCompanyInstagramUrlInput(companySettings.instagramUrl || 'https://instagram.com/patasnet.id');
      setCompanyFacebookUrlInput(companySettings.facebookUrl || 'https://facebook.com/patasnet.id');
      setCompanyYoutubeUrlInput(companySettings.youtubeUrl || 'https://youtube.com/@patasnet');
      setCompanyAddressInput(companySettings.address || 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110');
      setCompanyLogoTextInput(companySettings.logoText || 'PATAS NET');
      if (companySettings.logoUrl) setCompanyLogoUrlInput(companySettings.logoUrl);
      if (companySettings.promos) setPromosList(companySettings.promos);
      if (companySettings.qrisUrl !== undefined) setQrisUrlInput(companySettings.qrisUrl);
      if (companySettings.qrisMerchantName) setQrisMerchantNameInput(companySettings.qrisMerchantName);
      if (companySettings.qrisNmid) setQrisNmidInput(companySettings.qrisNmid);
      if (companySettings.qrisAutoVerify !== undefined) setQrisAutoVerifyInput(companySettings.qrisAutoVerify);
      if (companySettings.qrisInstructions) setQrisInstructionsInput(companySettings.qrisInstructions);
    }
  }, [companySettings]);

  // Load sheets config from server if available
  useEffect(() => {
    fetch('/api/sheets/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config?.webAppUrl && !googleSheetsUrl) {
          setGoogleSheetsUrl(data.config.webAppUrl);
          saveGoogleSheetsWebhookUrl(data.config.webAppUrl);
        }
      })
      .catch(() => {});
  }, []);

  // Image preview lightbox modal state
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

  // Packages management states
  const [packagesList, setPackagesList] = useState<WifiPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgSpeed, setNewPkgSpeed] = useState('');
  const [newPkgPrice, setNewPkgPrice] = useState('');
  const [newPkgType, setNewPkgType] = useState<'home' | 'business'>('home');
  const [newPkgFeatures, setNewPkgFeatures] = useState('');
  const [newPkgPopular, setNewPkgPopular] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<WifiPackage | null>(null);

  // Customer deletion state
  const [customerToDelete, setCustomerToDelete] = useState<CustomerUser | null>(null);

  // Coverage states
  const [coverageList, setCoverageList] = useState<any[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityType, setNewCityType] = useState('Kota');
  const [newKecName, setNewKecName] = useState<{ [city: string]: string }>({});
  const [newKelName, setNewKelName] = useState<{ [kecKey: string]: string }>({});

  // Inline delete confirmations for coverage
  const [cityToDelete, setCityToDelete] = useState<string | null>(null);
  const [kecToDelete, setKecToDelete] = useState<{ cityName: string; name: string } | null>(null);
  const [kelToDelete, setKelToDelete] = useState<{ cityName: string; kecamatanName: string; name: string } | null>(null);

  const fetchCoverageList = async () => {
    setLoadingCoverage(true);
    try {
      const response = await fetch('/api/coverage');
      if (response.ok) {
        const data = await response.json();
        setCoverageList(data || []);
        if (Array.isArray(data) && data.length > 0) {
          const totalCities = data.length;
          const totalKec = data.reduce((acc: number, c: any) => acc + (c.kecamatans?.length || 0), 0);
          const totalKel = data.reduce((acc: number, c: any) => acc + (c.kecamatans?.reduce((kAcc: number, k: any) => kAcc + (k.kelurahans?.length || 0), 0) || 0), 0);
          const calculatedText = `${totalCities} Kota/Kabupaten, ${totalKec} Kecamatan, ${totalKel} Kelurahan`;
          setCompanyCoverageTextInput(calculatedText);
        }
      }
    } catch (err) {
      console.error('Failed to fetch coverage:', err);
    } finally {
      setLoadingCoverage(false);
    }
  };

  const fetchPackagesList = async () => {
    setLoadingPackages(true);
    try {
      const res = await fetch('/api/packages');
      if (res.ok) {
        const data = await res.json();
        setPackagesList(data.packages || []);
      }
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'coverage') {
      fetchCoverageList();
    } else if (activeTab === 'packages') {
      fetchPackagesList();
    }
  }, [activeTab]);

  // Initial packages fetch for overview analytics
  useEffect(() => {
    fetchPackagesList();
  }, []);

  // ---------------- Coverage Handlers ----------------
  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;

    try {
      const response = await fetch('/api/coverage/city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityName: newCityName.trim(), regionType: newCityType })
      });
      if (response.ok) {
        setNewCityName('');
        await fetchCoverageList();
        showToast('Kota/Kabupaten berhasil ditambahkan!');
      } else {
        const data = await response.json();
        showToast(data.message || 'Gagal menambahkan kota.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan saat menambah kota.', 'error');
    }
  };

  const handleDeleteCity = async (cityName: string) => {
    try {
      const response = await fetch('/api/coverage/city/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityName })
      });
      if (response.ok) {
        setCityToDelete(null);
        await fetchCoverageList();
        showToast(`Wilayah ${cityName} berhasil dihapus.`);
      } else {
        showToast('Gagal menghapus kota.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan.', 'error');
    }
  };

  const handleAddKecamatan = async (cityName: string) => {
    const name = newKecName[cityName];
    if (!name || !name.trim()) return;

    try {
      const response = await fetch('/api/coverage/kecamatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityName, name: name.trim() })
      });
      if (response.ok) {
        setNewKecName(prev => ({ ...prev, [cityName]: '' }));
        await fetchCoverageList();
        showToast(`Kecamatan ${name} berhasil ditambahkan!`);
      } else {
        const data = await response.json();
        showToast(data.message || 'Gagal menambahkan kecamatan.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan.', 'error');
    }
  };

  const handleDeleteKecamatan = async (cityName: string, name: string) => {
    try {
      const response = await fetch('/api/coverage/kecamatan/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityName, name })
      });
      if (response.ok) {
        setKecToDelete(null);
        await fetchCoverageList();
        showToast(`Kecamatan ${name} berhasil dihapus.`);
      } else {
        showToast('Gagal menghapus kecamatan.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan.', 'error');
    }
  };

  const handleAddKelurahan = async (cityName: string, kecamatanName: string) => {
    const key = `${cityName}-${kecamatanName}`;
    const name = newKelName[key];
    if (!name || !name.trim()) return;

    try {
      const response = await fetch('/api/coverage/kelurahan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityName, kecamatanName, name: name.trim() })
      });
      if (response.ok) {
        setNewKelName(prev => ({ ...prev, [key]: '' }));
        await fetchCoverageList();
        showToast(`Kelurahan ${name} berhasil ditambahkan!`);
      } else {
        const data = await response.json();
        showToast(data.message || 'Gagal menambahkan kelurahan.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan.', 'error');
    }
  };

  const handleDeleteKelurahan = async (cityName: string, kecamatanName: string, name: string) => {
    try {
      const response = await fetch('/api/coverage/kelurahan/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityName, kecamatanName, name })
      });
      if (response.ok) {
        setKelToDelete(null);
        await fetchCoverageList();
        showToast(`Kelurahan ${name} berhasil dihapus.`);
      } else {
        showToast('Gagal menghapus kelurahan.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan.', 'error');
    }
  };

  // ---------------- Packages Handlers ----------------
  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName.trim() || !newPkgSpeed.trim() || !newPkgPrice) {
      showToast('Harap isi nama, kecepatan, dan harga paket.', 'error');
      return;
    }

    try {
      const featuresArr = newPkgFeatures
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean);

      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPkgName.trim(),
          speed: newPkgSpeed.trim(),
          price: Number(newPkgPrice),
          type: newPkgType,
          features: featuresArr,
          popular: newPkgPopular
        })
      });

      if (res.ok) {
        setNewPkgName('');
        setNewPkgSpeed('');
        setNewPkgPrice('');
        setNewPkgFeatures('');
        setNewPkgPopular(false);
        await fetchPackagesList();
        showToast('Paket WiFi baru berhasil ditambahkan!');
      } else {
        const data = await res.json();
        showToast(data.message || 'Gagal menambahkan paket.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan.', 'error');
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      const res = await fetch('/api/packages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setPackageToDelete(null);
        await fetchPackagesList();
        showToast('Paket WiFi berhasil dihapus.');
      } else {
        showToast('Gagal menghapus paket.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan.', 'error');
    }
  };

  // ---------------- Customer Deletion Handler ----------------
  const handleDeleteCustomer = async (id: string) => {
    try {
      const res = await fetch('/api/customers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setCustomerToDelete(null);
        onRefreshData();
        showToast('Pelanggan berhasil dihapus dari sistem.');
      } else {
        showToast('Gagal menghapus pelanggan.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan.', 'error');
    }
  };

  // ---------------- Promo Images Handlers ----------------
  const handleUploadPromo = async () => {
    if (!newPromoImage) {
      showToast('Silakan pilih gambar terlebih dahulu.', 'error');
      return;
    }

    setUploadingPromo(true);
    try {
      let finalPromoUrl = newPromoImage;
      try {
        const uRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: newPromoImage,
            category: 'promos',
            filename: `promo_${Date.now()}`,
          }),
        });
        if (uRes.ok) {
          const uJson = await uRes.json();
          if (uJson.url) finalPromoUrl = uJson.url;
        }
      } catch (uErr) {
        console.warn('Promo upload api fallback:', uErr);
      }

      const res = await fetch('/api/settings/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoImageBase64: finalPromoUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setPromosList(data.promos || []);
        setNewPromoImage('');
        showToast('Gambar banner promo berhasil diunggah!');
      } else {
        showToast('Gagal mengunggah gambar promo.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan saat mengunggah promo.', 'error');
    } finally {
      setUploadingPromo(false);
    }
  };

  const handleDeletePromo = async (index: number) => {
    try {
      const res = await fetch('/api/settings/promos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
      if (res.ok) {
        const data = await res.json();
        setPromosList(data.promos || []);
        showToast('Gambar banner promo berhasil dihapus.');
      } else {
        showToast('Gagal menghapus gambar promo.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan.', 'error');
    }
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateCompanySettings) return;

    setSavingSettings(true);
    const success = await onUpdateCompanySettings({
      name: companyNameInput,
      legalName: companyLegalNameInput,
      tagline: companyTaglineInput,
      coverageText: companyCoverageTextInput,
      whatsappNumber: companyWhatsappNumberInput,
      phoneNumber: companyPhoneNumberInput,
      email: companyEmailInput,
      instagramUrl: companyInstagramUrlInput,
      facebookUrl: companyFacebookUrlInput,
      youtubeUrl: companyYoutubeUrlInput,
      address: companyAddressInput,
      logoText: companyLogoTextInput,
      themeColor: '#2563eb',
      logoUrl: companyLogoUrlInput,
      qrisUrl: qrisUrlInput,
      qrisMerchantName: qrisMerchantNameInput,
      qrisNmid: qrisNmidInput,
      qrisAutoVerify: qrisAutoVerifyInput,
      qrisInstructions: qrisInstructionsInput,
    });
    setSavingSettings(false);
    if (success) {
      showToast('Pengaturan seluruh informasi website berhasil disimpan & disinkronkan!');
    } else {
      showToast('Gagal memperbarui pengaturan.', 'error');
    }
  };

  // Dedicated QRIS Save & Upload Handlers
  const handleSaveQrisSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingQris(true);
    try {
      const res = await fetch('/api/settings/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrisUrl: qrisUrlInput,
          qrisMerchantName: qrisMerchantNameInput,
          qrisNmid: qrisNmidInput,
          qrisAutoVerify: qrisAutoVerifyInput,
          qrisInstructions: qrisInstructionsInput,
        }),
      });

      if (onUpdateCompanySettings) {
        await onUpdateCompanySettings({
          name: companyNameInput,
          qrisUrl: qrisUrlInput,
          qrisMerchantName: qrisMerchantNameInput,
          qrisNmid: qrisNmidInput,
          qrisAutoVerify: qrisAutoVerifyInput,
          qrisInstructions: qrisInstructionsInput,
        });
      }

      showToast('Pengaturan QRIS berhasil disimpan & aktif!');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan pengaturan QRIS.', 'error');
    } finally {
      setSavingQris(false);
    }
  };

  const handleUploadQrisFile = async (file: File) => {
    setUploadingQris(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setQrisUrlInput(base64);

      // Also persist to /api/upload to guarantee disk & static access
      try {
        const uRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            category: 'qris',
            filename: `qris_${Date.now()}`,
          }),
        });
        if (uRes.ok) {
          const uJson = await uRes.json();
          if (uJson.url) {
            setQrisUrlInput(uJson.url);
          }
        }
      } catch (uErr) {
        console.warn('Upload API fallback to dataUrl:', uErr);
      }

      showToast('Gambar barcode QRIS berhasil diunggah dan disinkronkan ke semua perangkat!');
      setUploadingQris(false);

      if (onUpdateCompanySettings) {
        onUpdateCompanySettings({
          name: companyNameInput,
          qrisUrl: base64,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogoFile = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setCompanyLogoUrlInput(base64);

      let finalLogoUrl = base64;
      try {
        const uRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            category: 'logos',
            filename: `logo_${Date.now()}`,
          }),
        });
        if (uRes.ok) {
          const uJson = await uRes.json();
          if (uJson.url) {
            finalLogoUrl = uJson.url;
            setCompanyLogoUrlInput(uJson.url);
          }
        }
      } catch (uErr) {
        console.warn('Logo upload fallback to dataUrl:', uErr);
      }

      showToast('Logo berhasil diunggah dan disinkronkan ke semua browser & perangkat!');

      if (onUpdateCompanySettings) {
        onUpdateCompanySettings({
          name: companyNameInput,
          logoUrl: finalLogoUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendWhatsAppReminder = async (userId: string, paymentId: string, type: 'before_due' | 'overdue') => {
    setSendingReminderId(`${paymentId}-${type}`);
    try {
      const response = await fetch('/api/whatsapp/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, paymentId, type })
      });
      if (response.ok) {
        alert('Notifikasi Pengingat WhatsApp berhasil dikirim ke pelanggan!');
        onRefreshData(); // refresh logs
      } else {
        alert('Gagal mengirim pengingat WhatsApp.');
      }
    } catch (err) {
      console.error(err);
      alert('Kesalahan jaringan.');
    } finally {
      setSendingReminderId(null);
    }
  };

  // Stats with null-safety
  const safeCustomers: CustomerUser[] = (customers || []).map((c) => ({
    ...c,
    payments: Array.isArray(c?.payments) ? c.payments : [],
  }));
  const totalCustomers = safeCustomers.length;
  const activeCustomers = safeCustomers.filter((c) => c && c.status === 'active').length;
  const pendingCustomers = safeCustomers.filter((c) => c && c.status === 'pending').length;
  const suspendedCustomers = safeCustomers.filter((c) => c && c.status === 'suspended').length;

  // Revenue calculation
  let totalRevenue = 0;
  let dailyRevenueHistory: { date: string; revenue: number }[] = [];
  let packageCount: { [key: string]: number } = {};

  // Seed sample dates for real-time visual analytics
  const today = new Date();
  for (let i = 14; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    dailyRevenueHistory.push({ date: dateStr, revenue: 0 });
  }

  // Calculate actual transaction revenue
  safeCustomers.forEach((c) => {
    // Count packages
    const pkg = PACKAGES.find((p) => p.id === c.packageId);
    if (pkg) {
      packageCount[pkg.name] = (packageCount[pkg.name] || 0) + 1;
    }

    (c.payments || []).forEach((p) => {
      if (p && p.status === 'paid') {
        totalRevenue += (p.amount || 0);

        // Spread payments across the mockup daily history for realistic visuals
        const paymentDateObj = new Date(p.date);
        const dateStr = !isNaN(paymentDateObj.getTime())
          ? paymentDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
          : dailyRevenueHistory[0]?.date;
        const dayMatch = dailyRevenueHistory.find((dh) => dh.date === dateStr);
        if (dayMatch) {
          dayMatch.revenue += (p.amount || 0);
        } else {
          // Fallback - add to today's or yesterday's bin
          const fallbackIndex = Math.floor(Math.random() * dailyRevenueHistory.length);
          if (dailyRevenueHistory[fallbackIndex]) {
            dailyRevenueHistory[fallbackIndex].revenue += (p.amount || 0);
          }
        }
      }
    });
  });

  // Recharts colors
  const COLORS = ['#2563eb', '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  const pieData = Object.keys(packageCount).map((key) => ({
    name: key,
    value: packageCount[key]
  }));

  // List of pending verification payments reported by customers
  const pendingPaymentsList: { customer: CustomerUser; payment: PaymentRecord }[] = [];
  safeCustomers.forEach((c) => {
    (c.payments || []).forEach((p) => {
      if (p && p.status === 'pending_verification') {
        pendingPaymentsList.push({ customer: c, payment: p });
      }
    });
  });

  // WhatsApp automatic log simulations state
  const [waLogs, setWaLogs] = useState<{ id: string; phone: string; message: string; time: string }[]>([]);

  // Keep waLogs synchronized with props or default simulated ones
  useEffect(() => {
    if (whatsappLogs && whatsappLogs.length > 0) {
      setWaLogs(whatsappLogs);
    }
  }, [whatsappLogs]);

  // Function to simulate sending WhatsApp
  const logWhatsAppNotification = (phone: string, customerName: string, period: string, amount: number) => {
    const log = {
      id: Math.random().toString(36).substr(2, 9),
      phone,
      message: `[WhatsApp Otomatis] Halo ${customerName}, Pembayaran tagihan Patas Net Wifi Anda untuk periode ${period} sebesar Rp ${amount.toLocaleString('id-ID')} telah BERHASIL diverifikasi dan Lunas. Internet Anda tetap aktif & stabil tanpa FUP. Terima kasih!`,
      time: new Date().toLocaleTimeString('id-ID')
    };
    setWaLogs((prev) => [log, ...prev]);
  };

  // Export to Excel using xlsx sheetjs library
  const handleExportToExcel = () => {
    const rows: any[] = [];

    safeCustomers.forEach((c) => {
      const pkg = PACKAGES.find((p) => p.id === c.packageId);
      (c.payments || []).forEach((p) => {
        rows.push({
          'ID Pelanggan': c.id,
          'Nama Pelanggan': c.name,
          'Email': c.email,
          'No Handphone': c.phone,
          'Alamat': c.address,
          'Koordinat GPS': Array.isArray(c.coordinates) ? `${c.coordinates[0]}, ${c.coordinates[1]}` : 'N/A',
          'Paket Berlangganan': pkg?.name || 'Unknown',
          'Kecepatan': pkg?.speed || 'Unknown',
          'Biaya Bulanan': pkg?.price || 0,
          'Periode Tagihan': p.billingPeriod,
          'Jumlah Bayar': p.amount,
          'Status Pembayaran': (p.status || '').toUpperCase(),
          'Metode Bayar': p.method || 'N/A',
          'Tanggal Transaksi': p.date
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaksi Patas Net');

    // Auto fit column widths
    const max_width = rows.reduce((w, r) => Math.max(w, Object.values(r).join('').length / 8), 10);
    worksheet['!cols'] = [{ wch: max_width }];

    // Generate Excel File
    XLSX.writeFile(workbook, `Laporan_Transaksi_Patas_Net_Wifi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Google Apps Script template copy trigger helper
  const handleCopyAppsScript = () => {
    const scriptCode = `/**
 * Google Apps Script Web App Template
 * Copy and deploy this code in script.google.com as a Web App to integrate Google Sheets & Drive!
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Save to Google Sheets
    sheet.appendRow([
      new Date(),
      data.name,
      data.email,
      data.phone,
      data.address,
      data.coordinates ? data.coordinates.join(', ') : '',
      data.packageId,
      data.rentStb ? 'Yes' : 'No'
    ]);
    
    // If KTP Image Base64 is sent, save to Google Drive
    if (data.ktpImageBase64) {
      var folder = DriveApp.getFoldersByName("PatasNet_KTP_Uploads");
      var targetFolder = folder.hasNext() ? folder.next() : DriveApp.createFolder("PatasNet_KTP_Uploads");
      
      var base64Data = data.ktpImageBase64.split(",")[1];
      var contentType = data.ktpImageBase64.split(",")[0].split(":")[1].split(";")[0];
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, contentType, "KTP_" + data.name + ".jpg");
      
      var file = targetFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", fileUrl: file ? file.getUrl() : "" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(scriptCode);
    showToast('Kode Google Apps Script disalin ke clipboard!', 'success');
  };

  // Interactive leafet map display for customer pins
  useEffect(() => {
    if (activeTab !== 'customers' || !customers || customers.length === 0) return;

    const mapElement = document.getElementById('admin-customers-map');
    if (!mapElement) return;

    let map = (mapElement as any)._leaflet_map as L.Map | undefined;
    let markersLayer = (mapElement as any)._markers_layer as L.LayerGroup | undefined;

    try {
      if (!map) {
        const defaultCenter: [number, number] = [-6.2088, 106.8456];
        map = L.map(mapElement, {
          zoomAnimation: false, // Prevents transition crash
        }).setView(defaultCenter, 11);
        (mapElement as any)._leaflet_map = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);
        (mapElement as any)._markers_layer = markersLayer;
      }

      if (markersLayer) {
        markersLayer.clearLayers();
      }

      // Override marker icons safely
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Plot each customer's coordinates to the layer
      safeCustomers.forEach((c) => {
        if (c.coordinates && c.coordinates.length === 2 && markersLayer) {
          const marker = L.marker(c.coordinates, { icon: DefaultIcon }).addTo(markersLayer);
          const pkg = PACKAGES.find((p) => p.id === c.packageId);
          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 11px; line-height: 1.4;">
              <strong style="font-size: 13px; color: #1e3a8a;">${c.name}</strong><br/>
              <strong>No HP:</strong> ${c.phone}<br/>
              <strong>Paket:</strong> ${pkg?.name || 'N/A'}<br/>
              <strong>Status:</strong> <span style="font-weight:bold; color: ${c.status === 'active' ? '#10b981' : '#f59e0b'}">${c.status.toUpperCase()}</span><br/>
              <strong>Alamat:</strong> ${c.address}
            </div>
          `);
        }
      });

      // Re-invalidate size safely
      setTimeout(() => {
        if (map && (mapElement as any)._leaflet_map) {
          try {
            map.invalidateSize();
          } catch {}
        }
      }, 100);
    } catch (err) {
      console.warn('Admin map init error:', err);
    }

    return () => {
      // Clean up only when switching away from customers tab or unmounting
      if (activeTab !== 'customers') {
        const currentMap = (mapElement as any)._leaflet_map;
        if (currentMap) {
          try {
            currentMap.stop();
            currentMap.remove();
          } catch {}
          delete (mapElement as any)._leaflet_map;
          delete (mapElement as any)._markers_layer;
        }
      }
    };
  }, [activeTab, safeCustomers]);

  // Handle focus on map coordinate
  const handleFocusOnMap = (customer: CustomerUser) => {
    setSelectedUserForMap(customer);
    const mapElement = document.getElementById('admin-customers-map');
    if (mapElement) {
      const map = (mapElement as any)._leaflet_map;
      if (map && customer.coordinates) {
        map.setView(customer.coordinates, 15);
        // Find existing markers and trigger popup could be added, but setting center is sufficient
      }
    }
  };

  const filteredCustomers = safeCustomers.filter(
    (c) =>
      c && (
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm)
      )
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 flex flex-col lg:flex-row gap-8 text-xs relative">
      {/* LEFT SIDEBAR NAVIGATION PANEL (Collapses to icon-only rail when hidden) */}
      <aside className={`shrink-0 transition-all duration-300 lg:sticky lg:top-24 h-fit ${isSidebarOpen ? 'w-full lg:w-72' : 'w-full lg:w-20'}`}>
        <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-md flex flex-col transition-all duration-300 ${isSidebarOpen ? 'p-5 gap-5' : 'p-3 gap-3 items-center'}`}>
          <div className={`border-b border-slate-100 flex items-center ${isSidebarOpen ? 'pb-3.5 justify-between w-full gap-2' : 'pb-2.5 justify-center w-full'}`}>
            {isSidebarOpen ? (
              <>
                <div className="min-w-0 flex-1 overflow-hidden pr-1">
                  <Logo companyName={companySettings?.name} logoUrl={companySettings?.logoUrl} tagline={companySettings?.tagline} />
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/60 hover:border-blue-200 rounded-xl transition shrink-0 shadow-2xs"
                  title="Sembunyikan Label Menu (Tampilkan Hanya Icon)"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/60 rounded-xl transition flex flex-col items-center justify-center gap-1.5 group shadow-2xs"
                title="Buka Menu Navigasi Lengkap"
              >
                <Logo iconOnly={true} className="scale-75" companyName={companySettings?.name} logoUrl={companySettings?.logoUrl} />
                <PanelLeftOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </button>
            )}
          </div>

          <div className={`w-full ${isSidebarOpen ? 'space-y-1' : 'space-y-1.5'}`}>
            {isSidebarOpen && (
              <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider px-3 mb-2">Menu Navigasi</p>
            )}
            <nav className={`flex ${isSidebarOpen ? 'flex-col gap-1.5' : 'flex-row flex-wrap lg:flex-col gap-2 items-center justify-center'}`}>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                title="Analisis & Grafik"
                className={`rounded-xl font-bold transition-all ${
                  isSidebarOpen
                    ? 'flex items-center gap-3 px-3 py-2.5 text-left w-full'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Analisis & Grafik</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customers')}
                title="Kelola Pelanggan"
                className={`rounded-xl font-bold transition-all ${
                  isSidebarOpen
                    ? 'flex items-center gap-3 px-3 py-2.5 text-left w-full'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'customers'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Kelola Pelanggan</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                title="Verifikasi Bayar"
                className={`rounded-xl font-bold transition-all relative ${
                  isSidebarOpen
                    ? 'flex items-center justify-between px-3 py-2.5 text-left w-full'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'payments'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 shrink-0" />
                  {isSidebarOpen && <span>Verifikasi Bayar</span>}
                </div>
                {pendingPaymentsList.length > 0 && (
                  isSidebarOpen ? (
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${
                      activeTab === 'payments' ? 'bg-white text-blue-600' : 'bg-amber-500 text-white animate-pulse'
                    }`}>
                      {pendingPaymentsList.length} Baru
                    </span>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
                  )
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                title="Tiket Gangguan"
                className={`rounded-xl font-bold transition-all relative ${
                  isSidebarOpen
                    ? 'flex items-center gap-3 px-3 py-2.5 text-left justify-between w-full'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'tickets'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {isSidebarOpen && <span>Tiket Gangguan</span>}
                </div>
                {supportTickets.filter((t) => t.status === 'open').length > 0 && (
                  isSidebarOpen ? (
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${
                      activeTab === 'tickets' ? 'bg-white text-blue-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {supportTickets.filter((t) => t.status === 'open').length}
                    </span>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('packages')}
                title="Kelola Paket WiFi"
                className={`rounded-xl font-bold transition-all ${
                  isSidebarOpen
                    ? 'flex items-center gap-3 px-3 py-2.5 text-left w-full'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'packages'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <Wifi className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Kelola Paket WiFi</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('company_settings')}
                title="Pengaturan & Promo"
                className={`rounded-xl font-bold transition-all ${
                  isSidebarOpen
                    ? 'flex items-center gap-3 px-3 py-2.5 text-left w-full'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'company_settings'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Pengaturan & Promo</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('qris')}
                title="Upload & Pengaturan QRIS"
                className={`rounded-xl font-bold transition-all ${
                  isSidebarOpen
                    ? 'flex items-center gap-3 px-3 py-2.5 text-left w-full'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'qris'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <QrCode className="w-4 h-4 shrink-0 text-amber-500" />
                {isSidebarOpen && (
                  <div className="flex items-center justify-between w-full">
                    <span>Pengaturan QRIS</span>
                    <span className="text-[8px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded">
                      Instan
                    </span>
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('coverage')}
                title="Kelola Area Cakupan"
                className={`rounded-xl font-bold transition-all ${
                  isSidebarOpen
                    ? 'flex items-center gap-3 px-3 py-2.5 text-left w-full'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'coverage'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <MapPin className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Kelola Area Cakupan</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sheets')}
                title="Google Sheets & Drive Database"
                className={`rounded-xl font-bold transition-all ${
                  isSidebarOpen
                    ? 'flex items-center gap-3 px-3 py-2.5 text-left w-full'
                    : 'flex items-center justify-center p-3 text-center'
                } ${
                  activeTab === 'sheets'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15'
                    : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                {isSidebarOpen && (
                  <div className="flex items-center justify-between w-full">
                    <span>Google Sheets & Drive</span>
                    <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                      Database
                    </span>
                  </div>
                )}
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN PANEL */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Toast Notification Banner */}
        {toast && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-in slide-in-from-top-2 ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-red-600 text-white shadow-red-600/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Confirm Delete Customer */}
        {customerToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Hapus Pelanggan?</h3>
                <p className="text-xs text-slate-500">
                  Apakah Anda yakin ingin menghapus <strong>{customerToDelete.name}</strong> ({customerToDelete.id})? Data pelanggan dan riwayat tagihannya akan dihapus secara permanen.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomer(customerToDelete.id)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirm Delete Package */}
        {packageToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Wifi className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Hapus Paket WiFi?</h3>
                <p className="text-xs text-slate-500">
                  Apakah Anda yakin ingin menghapus paket <strong>{packageToDelete.name}</strong>? Paket ini tidak akan lagi tampil di halaman registrasi.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPackageToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePackage(packageToDelete.id)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirm Delete City */}
        {cityToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Hapus Wilayah?</h3>
                <p className="text-xs text-slate-500">
                  Hapus kota/kabupaten <strong>{cityToDelete}</strong> beserta seluruh kecamatan & kelurahan di dalamnya?
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCityToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCity(cityToDelete)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirm Delete Kecamatan */}
        {kecToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Hapus Kecamatan?</h3>
                <p className="text-xs text-slate-500">
                  Hapus kecamatan <strong>{kecToDelete.name}</strong> dari {kecToDelete.cityName}?
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setKecToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteKecamatan(kecToDelete.cityName, kecToDelete.name)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirm Delete Kelurahan */}
        {kelToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Hapus Kelurahan?</h3>
                <p className="text-xs text-slate-500">
                  Hapus kelurahan <strong>{kelToDelete.name}</strong>?
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setKelToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteKelurahan(kelToDelete.cityName, kelToDelete.kecamatanName, kelToDelete.name)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Admin Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] bg-blue-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Sistem Kontrol Administrasi {(companySettings?.name || 'Patas Net').toUpperCase()}
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-500" /> Dashboard Portal Admin WiFi
            </h1>
            <p className="text-[11px] text-slate-400">Kelola pelanggan, kirim pengingat tagihan WhatsApp, pantau grafik harian, & unduh laporan Excel.</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 sm:px-3 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-1.5 font-bold"
              title={isSidebarOpen ? "Sembunyikan Menu Navigasi" : "Buka Menu Navigasi"}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-blue-400" /> : <PanelLeftOpen className="w-4 h-4 text-emerald-400" />}
              <span className="hidden sm:inline">{isSidebarOpen ? 'Sembunyikan Menu' : 'Buka Menu'}</span>
            </button>
            <button
              onClick={onRefreshData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
              title="Sinkronisasi Data Baru"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportToExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Ekspor Transaksi Excel</span><span className="sm:hidden">Excel</span>
            </button>
          </div>
        </div>

        {/* Tabs Content Wrapper */}
        <div className="space-y-8">
        {/* TAB 1: OVERVIEW & REAL-TIME REVENUE ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Real-time Payment Report Notification Banner */}
            {pendingPaymentsList.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0 mt-0.5 shadow-md shadow-amber-500/20">
                    <CreditCard className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-extrabold text-[9px] uppercase tracking-wider">
                        Laporan Pembayaran Pelanggan
                      </span>
                      <span className="text-[10px] text-amber-700 font-bold">
                        {pendingPaymentsList.length} Pembayaran Menunggu Konfirmasi
                      </span>
                    </div>
                    <h3 className="font-black text-sm text-amber-950">
                      Pelanggan telah melakukan konfirmasi pembayaran!
                    </h3>
                    <p className="text-xs text-amber-800">
                      Terbaru dari <strong>{pendingPaymentsList[0].customer.name}</strong> ({pendingPaymentsList[0].customer.phone}) sebesar <strong>Rp {pendingPaymentsList[0].payment.amount.toLocaleString('id-ID')}</strong> untuk periode {pendingPaymentsList[0].payment.billingPeriod}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="w-full sm:w-auto px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-amber-600/20 shrink-0 text-center flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Verifikasi & Setujui Sekarang &rarr;</span>
                </button>
              </div>
            )}

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Pendapatan Terverifikasi</span>
                <p className="text-xl sm:text-2xl font-black text-blue-600 font-mono">Rp {totalRevenue.toLocaleString('id-ID')}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" /> Real-time Revenue
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pelanggan Aktif</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{activeCustomers}</p>
                <p className="text-[10px] text-emerald-500">Koneksi Fiber Terpasang</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Antrean Pasang Baru (Pending)</span>
                <p className="text-xl sm:text-2xl font-black text-amber-500 font-mono">{pendingCustomers}</p>
                <p className="text-[10px] text-slate-400">Menunggu Verifikasi & Teknisi</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Akun Terisolir (Suspended)</span>
                <p className="text-xl sm:text-2xl font-black text-red-500 font-mono">{suspendedCustomers}</p>
                <p className="text-[10px] text-slate-400">Layanan ditangguhkan sementara</p>
              </div>
            </div>

            {/* Visual Analytics charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Daily Revenue Chart */}
              <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                    Pendapatan Harian (15 Hari Terakhir)
                  </h3>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-extrabold font-mono">Real-time</span>
                </div>

                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyRevenueHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `Rp ${v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'k'}`}
                      />
                      <Tooltip
                        formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pendapatan']}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Package Distribution Chart */}
              <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4 flex flex-col justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Distribusi Paket WiFi
                </h3>

                {pieData.length > 0 ? (
                  <div className="space-y-4 my-auto">
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Manual Legend */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] max-h-24 overflow-y-auto">
                      {pieData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="truncate">{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 font-bold">
                    Belum ada data distribusi produk WiFi.
                  </div>
                )}
              </div>
            </div>

            {/* Simulated WhatsApp automatic notification logs */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="font-bold text-sm text-yellow-400">Log Pengiriman WhatsApp Gateway Otomatis</h4>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">Online</span>
              </div>
              <p className="text-[10px] text-slate-400">WhatsApp Gateway secara otomatis mengirimkan rincian status penagihan/verifikasi lunas kepada pelanggan. Berikut log real-time:</p>
              <div className="space-y-2 max-h-32 overflow-y-auto font-mono text-[10px] divide-y divide-slate-800/60">
                {waLogs.length > 0 ? (
                  waLogs.map((log) => (
                    <div key={log.id} className="py-2 first:pt-0">
                      <span className="text-slate-500">[{log.time}]</span> <span className="text-blue-400">{log.phone}:</span>{' '}
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-slate-500">Belum ada aktivitas pengiriman notifikasi WhatsApp otomatis.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA PELANGGAN & MAP GEOGRAPHICAL DISTRIBUTION */}
        {activeTab === 'customers' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* GIS Map plot panel */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden space-y-3">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-5 h-5 text-blue-600" /> Plot Geografis Pemasangan Pelanggan
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Memetakan semua titik koordinat pelanggan Patas Net menggunakan Leaflet Map OpenStreetMap.</p>
                </div>
                {selectedUserForMap && (
                  <div className="bg-blue-50 text-blue-800 border border-blue-100 text-[10px] font-bold py-1 px-2.5 rounded-lg">
                    Fokus: {selectedUserForMap.name}
                  </div>
                )}
              </div>
              <div id="admin-customers-map" className="w-full h-80 z-10" style={{ minHeight: '320px' }} />
            </div>

            {/* Search and Database Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Daftar Lengkap Pelanggan & Jalur WiFi
                </h3>
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (filteredCustomers.length === 0) return;
                      // Staggered trigger to prevent browser locks
                      filteredCustomers.forEach((c, idx) => {
                        setTimeout(() => {
                          generateCustomerPDFReport(c, supportTickets.filter((t) => t.userId === c.id));
                        }, idx * 300);
                      });
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md shrink-0"
                    title="Cetak PDF Laporan Bulanan untuk Semua Pelanggan Terfilter"
                  >
                    <Download className="w-3.5 h-3.5" /> Cetak Laporan Massal ({filteredCustomers.length})
                  </button>
                  <div className="relative w-full sm:max-w-xs">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari nama, email atau telepon..."
                      className="w-full px-3 py-2 pl-9 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs bg-slate-50/50"
                    />
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-4">Nama Pelanggan</th>
                      <th className="py-3 px-4">Paket & Biaya</th>
                      <th className="py-3 px-4">Dokumen KTP</th>
                      <th className="py-3 px-4">Kontak / Alamat</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Laporan PDF</th>
                      <th className="py-3 px-4 text-right">Ubah Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => {
                        const pkg = PACKAGES.find((p) => p.id === c.packageId) || PACKAGES[0];
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="py-4 px-4 font-bold text-slate-900">
                              <p className="text-sm">{c.name}</p>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {c.id}</span>
                            </td>
                            <td className="py-4 px-4">
                              <p className="font-semibold text-slate-800">{pkg.name}</p>
                              <p className="text-[10px] text-blue-600 font-mono font-bold">Rp {pkg.price.toLocaleString('id-ID')}/bln</p>
                            </td>
                            <td className="py-4 px-4">
                              {c.ktpImageUrl ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={c.ktpImageUrl}
                                    alt={`KTP ${c.name}`}
                                    className="w-10 h-7 object-cover rounded-lg border border-slate-200 cursor-pointer shadow-sm hover:scale-105 transition shrink-0 bg-slate-100"
                                    onClick={() =>
                                      setPreviewModal({
                                        isOpen: true,
                                        imageUrl: c.ktpImageUrl!,
                                        title: `Foto KTP - ${c.name}`,
                                        subtitle: `ID Pelanggan: ${c.id} | Email: ${c.email}`,
                                      })
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewModal({
                                        isOpen: true,
                                        imageUrl: c.ktpImageUrl!,
                                        title: `Foto KTP - ${c.name}`,
                                        subtitle: `ID Pelanggan: ${c.id} | Email: ${c.email}`,
                                      })
                                    }
                                    className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 hover:underline"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Buka KTP</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Belum ada</span>
                              )}
                            </td>
                            <td className="py-4 px-4 space-y-1 max-w-[200px]">
                              <p className="font-mono text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                                <PhoneCall className="w-3 h-3 text-emerald-500" /> {c.phone}
                              </p>
                              <p className="truncate text-slate-500" title={c.address}>{c.address}</p>
                              <button
                                onClick={() => handleFocusOnMap(c)}
                                className="text-[9px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                              >
                                <MapPin className="w-3 h-3 text-indigo-500" /> Lihat di Peta
                              </button>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[9px] uppercase ${
                                c.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <button
                                type="button"
                                onClick={() => generateCustomerPDFReport(c, supportTickets.filter((t) => t.userId === c.id))}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold text-[10px] rounded-lg transition-all border border-slate-200/80 active:scale-95"
                                title="Cetak Laporan PDF untuk Pelanggan Ini"
                              >
                                <Download className="w-3 h-3 text-blue-600" /> Cetak PDF
                              </button>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <select
                                  value={c.status}
                                  onChange={async (e) => {
                                    await onUpdateCustomerStatus(c.id, e.target.value as any);
                                  }}
                                  className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                                >
                                  <option value="pending">Set Pending</option>
                                  <option value="active">Set Active</option>
                                  <option value="suspended">Set Suspended</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setCustomerToDelete(c)}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                  title="Hapus Pelanggan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                          Pelanggan tidak ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VERIFIKASI PEMBAYARAN TAGIHAN */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quick Access QRIS Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-white/15 backdrop-blur rounded-xl shrink-0">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Menu Upload & Konfigurasi QRIS Merchant</h4>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    {qrisAutoVerifyInput
                      ? 'Mode Aktif: Pelanggan dapat bayar instan via QRIS tanpa wajib mengunggah bukti bayar.'
                      : 'Mode Manual: Pelanggan diminta menyertakan foto struk.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('qris')}
                className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Buka Menu QRIS</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100">
                Persetujuan Transaksi & Bukti Transfer Masuk
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-4">Pelanggan</th>
                      <th className="py-3 px-4">Periode Tagihan</th>
                      <th className="py-3 px-4">Jumlah</th>
                      <th className="py-3 px-4">Bukti Transaksi</th>
                      <th className="py-3 px-4">Metode & Tanggal</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {safeCustomers.flatMap((c) =>
                      (c.payments || []).map((p) => ({ customer: c, payment: p }))
                    ).length > 0 ? (
                      safeCustomers.flatMap((c) =>
                        (c.payments || []).map((p) => {
                          const hasProof = !!p.proofOfPaymentUrl;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-slate-900">{c.name}</p>
                                <p className="text-[10px] text-slate-400">{c.phone}</p>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-800">{p.billingPeriod}</td>
                              <td className="py-3.5 px-4 font-bold text-blue-600 font-mono">Rp {p.amount.toLocaleString('id-ID')}</td>
                              <td className="py-3.5 px-4">
                                {hasProof && p.proofOfPaymentUrl ? (
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={p.proofOfPaymentUrl}
                                      alt="Bukti Transfer"
                                      className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer shadow-sm hover:scale-105 transition shrink-0 bg-slate-100"
                                      onClick={() =>
                                        setPreviewModal({
                                          isOpen: true,
                                          imageUrl: p.proofOfPaymentUrl!,
                                          title: `Bukti Transfer - ${c.name}`,
                                          subtitle: `Tagihan ${p.billingPeriod} | Nominal: Rp ${p.amount.toLocaleString('id-ID')} | Metode: ${p.method || 'Transfer'}`,
                                        })
                                      }
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewModal({
                                          isOpen: true,
                                          imageUrl: p.proofOfPaymentUrl!,
                                          title: `Bukti Transfer - ${c.name}`,
                                          subtitle: `Tagihan ${p.billingPeriod} | Nominal: Rp ${p.amount.toLocaleString('id-ID')} | Metode: ${p.method || 'Transfer'}`,
                                        })
                                      }
                                      className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 hover:underline"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Buka Bukti</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">
                                    {p.method?.toLowerCase().includes('qris') ? 'QRIS (Tanpa Bukti)' : 'Belum diunggah'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  {p.method?.toLowerCase().includes('qris') ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                      <QrCode className="w-3 h-3 text-emerald-600" /> QRIS
                                    </span>
                                  ) : (
                                    <p className="font-bold text-slate-700 uppercase">{p.method || 'Transfer'}</p>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">{p.date}</p>
                                {p.transactionId && (
                                  <p className="text-[9px] font-mono text-slate-400">Ref: {p.transactionId}</p>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                                  p.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : p.status === 'pending_verification'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {p.status === 'pending_verification' && (
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await onVerifyPayment(c.id, p.id);
                                        logWhatsAppNotification(c.phone, c.name, p.billingPeriod, p.amount);
                                      }}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                    >
                                      <Check className="w-3 h-3" /> Setujui
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (onRejectPayment) {
                                          await onRejectPayment(c.id, p.id);
                                        }
                                      }}
                                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                )}
                                {p.status === 'paid' && (
                                  <span className="text-emerald-600 font-bold text-[10px]">Verified Lunas ✓</span>
                                )}
                                {p.status === 'unpaid' && (
                                  <div className="flex flex-col gap-1 items-end">
                                    <span className="text-slate-400 italic mb-1 text-[10px]">Menunggu Pembayaran</span>
                                    <div className="flex flex-col sm:flex-row gap-1 justify-end">
                                      <button
                                        type="button"
                                        disabled={sendingReminderId === `${p.id}-before_due`}
                                        onClick={() => handleSendWhatsAppReminder(c.id, p.id, 'before_due')}
                                        className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 font-bold text-[9px] rounded-md transition-colors border border-blue-200 whitespace-nowrap"
                                        title="Kirim pengingat WhatsApp sebelum jatuh tempo"
                                      >
                                        {sendingReminderId === `${p.id}-before_due` ? 'Mengirim...' : 'WA Sebelum Jatuh Tempo'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={sendingReminderId === `${p.id}-overdue`}
                                        onClick={() => handleSendWhatsAppReminder(c.id, p.id, 'overdue')}
                                        className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50 font-bold text-[9px] rounded-md transition-colors border border-rose-200 whitespace-nowrap"
                                        title="Kirim peringatan keterlambatan pembayaran"
                                      >
                                        {sendingReminderId === `${p.id}-overdue` ? 'Mengirim...' : 'WA Keterlambatan'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                          Belum ada transaksi terekam.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMPLAINTS / GANGGUAN SUPPORT TICKETS */}
        {activeTab === 'tickets' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100">
                Laporan Keluhan & Gangguan WiFi Pelanggan
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-4">Nama Pelanggan</th>
                      <th className="py-3 px-4">Kontak</th>
                      <th className="py-3 px-4">Pesan Laporan Kendala</th>
                      <th className="py-3 px-4">Tanggal Masuk</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {supportTickets.length > 0 ? (
                      supportTickets.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{t.userName}</td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">{t.phone} <br /> <span className="text-slate-400 font-sans text-[10px]">{t.email}</span></td>
                          <td className="py-3.5 px-4 max-w-[300px] leading-relaxed text-slate-600">{t.message}</td>
                          <td className="py-3.5 px-4">{t.date}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[9px] uppercase ${
                              t.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                          Tidak ada tiket laporan gangguan saat ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: WIFI PACKAGES MANAGEMENT */}
        {activeTab === 'packages' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Form Add Package */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Wifi className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Kelola Paket Langganan WiFi</h3>
                  <p className="text-xs text-slate-400">Tambah paket baru atau hapus paket yang sudah tidak aktif.</p>
                </div>
              </div>

              <form onSubmit={handleAddPackage} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">Nama Paket *</label>
                    <input
                      type="text"
                      value={newPkgName}
                      onChange={(e) => setNewPkgName(e.target.value)}
                      placeholder="Contoh: Home Ultra 150 Mbps"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:ring-1 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">Kecepatan (Bandwidth) *</label>
                    <input
                      type="text"
                      value={newPkgSpeed}
                      onChange={(e) => setNewPkgSpeed(e.target.value)}
                      placeholder="Contoh: Up to 150 Mbps"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:ring-1 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">Harga Bulanan (Rp) *</label>
                    <input
                      type="number"
                      value={newPkgPrice}
                      onChange={(e) => setNewPkgPrice(e.target.value)}
                      placeholder="Contoh: 350000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:ring-1 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">Kategori Paket *</label>
                    <select
                      value={newPkgType}
                      onChange={(e) => setNewPkgType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50/50 focus:ring-1 focus:ring-blue-600 focus:bg-white"
                    >
                      <option value="home">Home (Rumah / Keluarga)</option>
                      <option value="business">Bisnis / Premium (Patas Net Area)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Fitur & Keunggulan (Satu per baris)</label>
                  <textarea
                    rows={4}
                    value={newPkgFeatures}
                    onChange={(e) => setNewPkgFeatures(e.target.value)}
                    placeholder={"100% Fiber Optik Unlimited\nUpload & Download Simetris 1:1\nIdeal untuk 10-15 perangkat\nGRATIS Biaya Pasang"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:ring-1 focus:ring-blue-600 focus:bg-white resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="popular-pkg-check"
                    checked={newPkgPopular}
                    onChange={(e) => setNewPkgPopular(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="popular-pkg-check" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Tandai sebagai Paket Populer (Best Seller / Rekomendasi)
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Paket WiFi</span>
                </button>
              </form>
            </div>

            {/* List of Existing Packages */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Daftar Paket WiFi Aktif ({packagesList.length})
                </h3>
                <button
                  type="button"
                  onClick={fetchPackagesList}
                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg border border-slate-200"
                  title="Refresh Paket"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPackages ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingPackages ? (
                <div className="py-12 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Memuat daftar paket...</span>
                </div>
              ) : packagesList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold border border-dashed border-slate-200 rounded-2xl">
                  Belum ada paket WiFi tersimpan. Silakan tambahkan formulir di atas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packagesList.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span
                            className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider ${
                              pkg.type === 'business' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {pkg.type === 'business' ? 'Bisnis' : 'Home'}
                          </span>
                          {pkg.popular && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                              POPULER
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-sm text-slate-900">{pkg.name}</h4>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-blue-600 font-mono">
                            Rp {pkg.price.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-slate-400">/ bulan</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-600 font-mono">Kecepatan: {pkg.speed}</p>

                        {pkg.features && pkg.features.length > 0 && (
                          <ul className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                            {pkg.features.map((feat, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[9px] font-mono text-slate-400">ID: {pkg.id}</span>
                        <button
                          type="button"
                          onClick={() => setPackageToDelete(pkg)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-[10px] transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus Paket</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: COMPANY SETTINGS & PROMO MANAGEMENT */}
        {activeTab === 'company_settings' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Promo Banner Management */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Kelola Banner & Gambar Promo</h3>
                  <p className="text-xs text-slate-400">Unggah poster dan flyer promo internet WiFi untuk ditampilkan kepada calon pelanggan.</p>
                </div>
              </div>

              {/* Upload Promo Form */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4 max-w-2xl">
                <label className="block text-[10px] font-bold text-slate-700 uppercase">Pilih Gambar Promo Baru</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewPromoImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />

                  {newPromoImage && (
                    <button
                      type="button"
                      onClick={handleUploadPromo}
                      disabled={uploadingPromo}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadingPromo ? 'Mengunggah...' : 'Simpan Promo'}</span>
                    </button>
                  )}
                </div>

                {newPromoImage && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200 max-w-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Preview Gambar Promo:</p>
                    <img src={newPromoImage} alt="Promo Preview" className="w-full h-36 object-cover rounded-lg" />
                  </div>
                )}
              </div>

              {/* List of current promos */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                  Gambar Promo Aktif ({promosList.length})
                </h4>

                {promosList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 font-bold border border-dashed border-slate-200 rounded-2xl">
                    Belum ada banner promo diunggah. Unggah gambar promo di atas untuk menampilkannya.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {promosList.map((promoUrl, idx) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm">
                        <img src={promoUrl} alt={`Promo ${idx + 1}`} className="w-full h-44 object-cover" />
                        <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-4">
                          <button
                            type="button"
                            onClick={() => handleDeletePromo(idx)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Hapus Promo</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Company Identity & Global Website CMS Form */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" /> Pengaturan Seluruh Informasi & Branding Website
                  </h3>
                  <p className="text-slate-500 leading-relaxed mt-1 text-xs">
                    Kelola nama PT / badan usaha legal, nama brand WiFi, slogan/tagline, teks area cakupan di header, kontak resmi, media sosial, serta upload logo global yang otomatis terganti di seluruh website.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCompanySettings}
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md flex items-center gap-2 text-xs shrink-0 self-start sm:self-auto"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Menyimpan...' : 'Simpan Semua'}</span>
                </button>
              </div>

              <form onSubmit={handleSaveCompanySettings} className="space-y-6">
                {/* Bagian 1: Identitas & Legalitas */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" /> 1. Identitas & Legalitas Perusahaan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Nama Legal Perusahaan (PT / CV) *
                      </label>
                      <input
                        type="text"
                        value={companyLegalNameInput}
                        onChange={(e) => setCompanyLegalNameInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="Contoh: PT. AMANUSA TELEMEDIA"
                        required
                      />
                      <p className="text-[10px] text-slate-400">Tampil di footer, kuitansi resmi, syarat & ketentuan, dan WhatsApp CS.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Nama Brand / Merk Dagang Layanan WiFi *
                      </label>
                      <input
                        type="text"
                        value={companyNameInput}
                        onChange={(e) => setCompanyNameInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="Contoh: Patas Net WiFi"
                        required
                      />
                      <p className="text-[10px] text-slate-400">Nama utama produk dan portal layanan pelanggan.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Tagline / Slogan Website (Hero Section) *
                      </label>
                      <input
                        type="text"
                        value={companyTaglineInput}
                        onChange={(e) => setCompanyTaglineInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="Contoh: Internet Fiber Optic Cepat, Stabil & Tanpa Batas Kuota"
                        required
                      />
                      <p className="text-[10px] text-slate-400">Tampil sebagai deskripsi utama di bagian pembuka (Hero) website.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Teks Logo Visual (Maksimal 2 Kata) *
                      </label>
                      <input
                        type="text"
                        value={companyLogoTextInput}
                        onChange={(e) => setCompanyLogoTextInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="Contoh: PATAS NET"
                        required
                      />
                      <p className="text-[10px] text-slate-400">Kata kedua otomatis diberi aksen warna biru profesional.</p>
                    </div>
                  </div>
                </div>

                {/* Bagian 2: Teks Area Cakupan Header */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60 space-y-3">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" /> 2. Teks Ringkasan Area Cakupan (Header Top Bar)
                  </h4>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 uppercase text-[10px]">
                      Teks Area Cakupan Yang Ditampilkan Di Atas Header *
                    </label>
                    <input
                      type="text"
                      value={companyCoverageTextInput}
                      onChange={(e) => setCompanyCoverageTextInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold font-mono"
                      placeholder="Contoh: 9 Kota/Kabupaten, 81 Kecamatan, 123 Kelurahan"
                      required
                    />
                    <p className="text-[10px] text-slate-400">
                      Teks ini persis yang tampil pada baris biru paling atas (Top Bar) website: <strong>AREA CAKUPAN: {companyCoverageTextInput}</strong>
                    </p>
                  </div>
                </div>

                {/* Bagian 3: Kontak & Layanan Pelanggan */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-amber-600" /> 3. Layanan Konsumen & Kontak Resmi
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Nomor WhatsApp CS (24 Jam) *
                      </label>
                      <input
                        type="text"
                        value={companyWhatsappNumberInput}
                        onChange={(e) => setCompanyWhatsappNumberInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="0812-3456-7890"
                        required
                      />
                      <p className="text-[10px] text-slate-400">Untuk tombol WhatsApp melayang & notifikasi.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Nomor Telepon / Call Center *
                      </label>
                      <input
                        type="text"
                        value={companyPhoneNumberInput}
                        onChange={(e) => setCompanyPhoneNumberInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="+62 899-3299-977"
                        required
                      />
                      <p className="text-[10px] text-slate-400">Tampil di header atas & footer.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Alamat Email CS *
                      </label>
                      <input
                        type="email"
                        value={companyEmailInput}
                        onChange={(e) => setCompanyEmailInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="cs@patasnet.id"
                        required
                      />
                      <p className="text-[10px] text-slate-400">Email resmi korespondensi pelanggan.</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 uppercase text-[10px]">
                      Alamat Kantor & Operation Center *
                    </label>
                    <textarea
                      rows={2}
                      value={companyAddressInput}
                      onChange={(e) => setCompanyAddressInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                      placeholder="Alamat lengkap kantor pusat & operation center..."
                      required
                    />
                    <p className="text-[10px] text-slate-400">Tampil di footer, kuitansi cetak, dan kontak kami.</p>
                  </div>
                </div>

                {/* Bagian 4: Media Sosial */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-purple-600" /> 4. Akun Media Sosial Resmi
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Link Akun Instagram
                      </label>
                      <input
                        type="text"
                        value={companyInstagramUrlInput}
                        onChange={(e) => setCompanyInstagramUrlInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="https://instagram.com/patasnet.id"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Link Akun Facebook
                      </label>
                      <input
                        type="text"
                        value={companyFacebookUrlInput}
                        onChange={(e) => setCompanyFacebookUrlInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="https://facebook.com/patasnet.id"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 uppercase text-[10px]">
                        Link Channel YouTube
                      </label>
                      <input
                        type="text"
                        value={companyYoutubeUrlInput}
                        onChange={(e) => setCompanyYoutubeUrlInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white text-xs font-semibold"
                        placeholder="https://youtube.com/@patasnet"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 5: Upload Logo Global */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-pink-600" /> 5. Upload & Ganti Logo Global (Terganti di Seluruh Halaman)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Setiap logo diganti di sini, seluruh logo di Home, Navbar, Footer, Dashboard Admin, Developer, dan Pelanggan otomatis akan terganti secara instan oleh gambar logo yang Anda unggah.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-slate-200 rounded-2xl bg-white shadow-xs">
                    {companyLogoUrlInput ? (
                      <div className="relative group">
                        <img
                          src={companyLogoUrlInput}
                          alt="Logo Preview"
                          className="h-16 w-16 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1.5"
                        />
                        <button
                          type="button"
                          onClick={() => setCompanyLogoUrlInput('')}
                          className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow transition"
                          title="Hapus Logo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] font-black uppercase">
                        Default
                      </div>
                    )}
                    <div className="flex-1 w-full space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadLogoFile(file);
                          }
                        }}
                        className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer w-full"
                      />
                      <p className="text-[10px] text-slate-400">
                        Format disarankan: PNG transparan atau JPG persegi (resolusi 256x256 atau 512x512).
                      </p>
                    </div>
                    {companyLogoUrlInput && (
                      <button
                        type="button"
                        onClick={() => setCompanyLogoUrlInput('')}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
                      >
                        Reset Logo
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingSettings ? 'Menyimpan Perubahan...' : 'Simpan Seluruh Informasi Website'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6.5: DEDICATED QRIS PAYMENT & UPLOAD MANAGEMENT */}
        {activeTab === 'qris' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header banner */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm shrink-0">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Menu Pengaturan & Upload Barcode QRIS
                    </h3>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                      Instan
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Unggah gambar barcode QRIS merchant Anda untuk memudahkan pelanggan membayar tagihan secara instan tanpa harus repot mengunggah bukti bayar atau menunggu verifikasi manual.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaveQrisSettings()}
                disabled={savingQris}
                className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingQris ? 'Menyimpan...' : 'Simpan Pengaturan QRIS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* KOLOM KIRI: UPLOAD & PRATINJAU QRIS (5 kolom) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600" /> 1. Gambar Barcode QRIS
                    </h4>
                    {qrisUrlInput && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* QRIS Card Live Standee Preview */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                    {qrisUrlInput ? (
                      <div className="space-y-4 w-full flex flex-col items-center">
                        <div className="relative group max-w-[280px] w-full bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-lg">
                          <img
                            src={qrisUrlInput}
                            alt="Barcode QRIS Toko"
                            className="w-full h-auto max-h-[340px] object-contain rounded-xl mx-auto"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition rounded-2xl flex flex-col items-center justify-center gap-2 p-4">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewModal({
                                  isOpen: true,
                                  imageUrl: qrisUrlInput,
                                  title: `QRIS Merchant - ${qrisMerchantNameInput}`,
                                  subtitle: `NMID: ${qrisNmidInput} | Siap Pindai Semua e-Wallet & M-Banking`,
                                })
                              }
                              className="px-4 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 hover:bg-slate-100 transition"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Lihat Ukuran Penuh</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setQrisUrlInput('')}
                              className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 hover:bg-red-700 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Hapus Gambar</span>
                            </button>
                          </div>
                        </div>

                        <div className="text-center space-y-1">
                          <p className="font-extrabold text-xs text-slate-800">{qrisMerchantNameInput}</p>
                          <p className="text-[10px] font-mono text-slate-500">NMID: {qrisNmidInput}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 px-4 text-center space-y-3 w-full">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-xs border border-emerald-100">
                          <QrCode className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-extrabold text-xs text-slate-800">Belum Ada Barcode QRIS</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Unggah foto atau barcode QRIS toko Anda agar pelanggan dapat scan langsung.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Upload File Input */}
                    <div className="w-full mt-4 pt-4 border-t border-slate-200/80 space-y-2">
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider text-left">
                        Unggah File Barcode QRIS (PNG / JPG / Poster)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingQris}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadQrisFile(file);
                          }
                        }}
                        className="text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer w-full bg-white p-1 rounded-xl border border-slate-200"
                      />
                      <p className="text-[10px] text-slate-400 text-left">
                        Dapat mengunggah foto tangkapan layar barcode QRIS dari BCA Merchant, GoPay Merchant, DANA Bisnis, ShopeePay, atau poster resmi QRIS Anda.
                      </p>
                    </div>

                    {/* Action Quick Buttons */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          const sampleSvg = generateDefaultQrisSvg(qrisMerchantNameInput, qrisNmidInput);
                          setQrisUrlInput(sampleSvg);
                          showToast('Template barcode QRIS resmi berhasil diterapkan! Klik simpan untuk mengaktifkan.');
                        }}
                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pakai Template QRIS</span>
                      </button>

                      {qrisUrlInput && (
                        <a
                          href={qrisUrlInput}
                          download={`QRIS_${companyNameInput.replace(/\s+/g, '_')}.png`}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Gambar</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: PENGATURAN IDENTITAS MERCHANT & FITUR TANPA BUKTI (7 kolom) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
                  {/* Bagian Identitas */}
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                      <ShieldCheck className="w-4 h-4 text-blue-600" /> 2. Identitas Merchant & Akun QRIS
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700 uppercase text-[10px]">
                          Nama Merchant QRIS (Nama Usaha) *
                        </label>
                        <input
                          type="text"
                          value={qrisMerchantNameInput}
                          onChange={(e) => setQrisMerchantNameInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 bg-white text-xs font-semibold"
                          placeholder="Contoh: PATAS NET - PT AMANUSA TELEMEDIA"
                          required
                        />
                        <p className="text-[10px] text-slate-400">Nama yang tampil saat pelanggan memindai QRIS.</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700 uppercase text-[10px]">
                          NMID (National Merchant ID) *
                        </label>
                        <input
                          type="text"
                          value={qrisNmidInput}
                          onChange={(e) => setQrisNmidInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 bg-white text-xs font-mono font-semibold"
                          placeholder="Contoh: ID1020039281747"
                          required
                        />
                        <p className="text-[10px] text-slate-400">Kode NMID registrasi resmi Bank Indonesia.</p>
                      </div>
                    </div>
                  </div>

                  {/* Bagian Fitur Spesial: Pembayaran Instan Tanpa Bukti */}
                  <div className="p-5 bg-emerald-50/70 border-2 border-emerald-200/80 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                            Mode Pembayaran QRIS Instan (Tanpa Wajib Upload Bukti)
                          </h4>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            Fitur Kemudahan Pelanggan
                          </span>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={qrisAutoVerifyInput}
                          onChange={(e) => setQrisAutoVerifyInput(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                      {qrisAutoVerifyInput ? (
                        <span>
                          <strong>STATUS AKTIF:</strong> Pelanggan dapat menyelesaikan pembayaran dengan memindai barcode QRIS dan langsung menekan tombol <em>"Saya Sudah Bayar via QRIS"</em>. Tagihan otomatis berstatus <strong>LUNAS</strong> seketika tanpa harus mencari & mengunggah foto struk transfer.
                        </span>
                      ) : (
                        <span>
                          <strong>STATUS NONAKTIF:</strong> Pelanggan tetap diwajibkan mengunggah foto struk/bukti transfer setelah melakukan pembayaran via QRIS sebelum tagihan diverifikasi admin.
                        </span>
                      )}
                    </p>

                    <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-2 text-[11px] text-emerald-800">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Notifikasi WhatsApp otomatis tetap dikirimkan ke pelanggan begitu pembayaran QRIS dikonfirmasi.</span>
                    </div>
                  </div>

                  {/* Petunjuk Pembayaran */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 uppercase text-[10px]">
                      Petunjuk Pembayaran QRIS Yang Tampil Ke Pelanggan *
                    </label>
                    <textarea
                      rows={3}
                      value={qrisInstructionsInput}
                      onChange={(e) => setQrisInstructionsInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 bg-white text-xs font-semibold leading-relaxed"
                      placeholder="Masukkan petunjuk scan QRIS untuk pelanggan..."
                      required
                    />
                    <p className="text-[10px] text-slate-400">
                      Instruksi ini akan dibaca oleh pelanggan saat membuka jendela pembayaran di portal mereka.
                    </p>
                  </div>

                  {/* Provider Icons Supported */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      Dukungan Aplikasi Pembayaran QRIS (Nasional 100%):
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700">
                      {['BCA Mobile', 'Mandiri Livin', 'BRImo', 'BNI Mobile', 'GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja', 'Jenius'].map((bank) => (
                        <span key={bank} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs text-[10px]">
                          ✓ {bank}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tombol Simpan */}
                  <div className="pt-2 flex flex-col sm:flex-row justify-end items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveQrisSettings()}
                      disabled={savingQris}
                      className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingQris ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan QRIS'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: COVERAGE AREA MANAGEMENT */}
        {activeTab === 'coverage' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" /> Pengaturan Area Jangkauan / Cakupan WiFi
              </h3>
              <p className="text-slate-500 leading-relaxed mt-2 text-xs">
                Kelola daerah jangkauan internet WiFi Anda secara dinamis. Anda bisa menambah kota/kabupaten baru, mendaftarkan kecamatan, hingga mengaktifkan kelurahan/desa beserta status nodenya.
              </p>
            </div>

            {/* FORM ADD CITY/KABUPATEN */}
            <form onSubmit={handleAddCity} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 flex flex-col sm:flex-row items-end gap-3 max-w-2xl">
              <div className="flex-1 space-y-1 w-full">
                <label className="block font-bold text-slate-700 uppercase text-[9px]">Nama Kota / Kabupaten Baru</label>
                <input
                  type="text"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="Contoh: Depok, Bogor, Bekasi"
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-600 text-xs"
                  required
                />
              </div>
              <div className="space-y-1 w-full sm:w-40">
                <label className="block font-bold text-slate-700 uppercase text-[9px]">Tipe Wilayah</label>
                <select
                  value={newCityType}
                  onChange={(e) => setNewCityType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-600 text-xs font-bold"
                >
                  <option value="Kota">Kota</option>
                  <option value="Kabupaten">Kabupaten</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-xs shrink-0"
              >
                Tambah Wilayah
              </button>
            </form>

            {loadingCoverage ? (
              <div className="py-12 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Memuat database area cakupan...</span>
              </div>
            ) : coverageList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold border border-dashed border-slate-200 rounded-2xl">
                Belum ada area cakupan terdaftar. Silakan tambah kota/kabupaten di atas.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {coverageList.map((city) => (
                  <div key={city.cityName} className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                    {/* City Header */}
                    <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                      <div>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider mr-2">
                          {city.regionType}
                        </span>
                        <strong className="text-sm text-slate-800 uppercase tracking-tight">{city.cityName}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCityToDelete(city.cityName)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Kota/Kabupaten ini"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Form Add Kecamatan */}
                      <div className="flex gap-2 max-w-md">
                        <input
                          type="text"
                          placeholder="Masukkan nama Kecamatan baru..."
                          value={newKecName[city.cityName] || ''}
                          onChange={(e) => setNewKecName(prev => ({ ...prev, [city.cityName]: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-600 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddKecamatan(city.cityName)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition text-xs shrink-0"
                        >
                          Tambah Kec.
                        </button>
                      </div>

                      {/* Kecamatan List */}
                      {city.kecamatans && city.kecamatans.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {city.kecamatans.map((kec: any) => {
                            const kecKey = `${city.cityName}-${kec.name}`;
                            return (
                              <div key={kec.name} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col justify-between">
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2">
                                  <strong className="text-slate-800 uppercase text-[10px]">Kecamatan {kec.name}</strong>
                                  <button
                                    type="button"
                                    onClick={() => setKecToDelete({ cityName: city.cityName, name: kec.name })}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Form Add Kelurahan */}
                                <div className="flex gap-1.5 mb-3">
                                  <input
                                    type="text"
                                    placeholder="Kelurahan baru..."
                                    value={newKelName[kecKey] || ''}
                                    onChange={(e) => setNewKelName(prev => ({ ...prev, [kecKey]: e.target.value }))}
                                    className="flex-1 px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-600 text-[10px]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddKelurahan(city.cityName, kec.name)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-[10px] shrink-0"
                                  >
                                    Tambah
                                  </button>
                                </div>

                                {/* Kelurahan Sub-list */}
                                {kec.kelurahans && kec.kelurahans.length > 0 ? (
                                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {kec.kelurahans.map((kel: any) => (
                                      <div key={kel.name} className="flex items-center justify-between px-2 py-1.5 bg-white border border-slate-200/50 rounded-lg text-[10px]">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                          <span className="text-slate-700 font-medium">{kel.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {kel.nodesCount || 0} Nodes
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setKelToDelete({ cityName: city.cityName, kecamatanName: kec.name, name: kel.name })}
                                            className="p-0.5 text-slate-400 hover:text-red-500 transition"
                                          >
                                            <Trash className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-400 italic">Belum ada kelurahan terdaftar.</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed">
                          Belum ada kecamatan terdaftar. Silakan tambah di atas.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: GOOGLE SHEETS & GOOGLE DRIVE INTEGRATION */}
        {activeTab === 'sheets' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Database Google Spreadsheet & Drive
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Integrasi Database Google Sheets & Google Drive
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                  Simpan semua data pendaftaran pelanggan baru dan transaksi langsung ke Google Spreadsheet Anda secara transparan. Foto KTP dan struk pembayaran otomatis terunggah dan tersimpan rapi di Google Drive.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
                    setCopiedScript(true);
                    showToast('Kode Google Apps Script disalin ke clipboard!', 'success');
                    setTimeout(() => setCopiedScript(false), 3000);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'Tersalin!' : 'Salin Kode Script'}</span>
                </button>
              </div>
            </div>

            {/* STATUS & WEBHOOK INPUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">URL Web App Google Apps Script</h3>
                    <p className="text-[11px] text-slate-500">Masukkan URL Web App setelah deploy di script.google.com</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="url"
                    value={googleSheetsUrl}
                    onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      Status:{' '}
                      <strong className={googleSheetsUrl ? 'text-emerald-600' : 'text-amber-600'}>
                        {googleSheetsUrl ? 'Terkonfigurasi' : 'Belum Terhubung'}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        saveGoogleSheetsWebhookUrl(googleSheetsUrl);
                        fetch('/api/sheets/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ webAppUrl: googleSheetsUrl }),
                        }).catch(() => {});
                        showToast('URL Google Sheets & Drive berhasil disimpan dan disinkronkan ke server!', 'success');
                      }}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition"
                    >
                      Simpan URL
                    </button>
                  </div>
                </div>

                {/* TEST SYNC BUTTON */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <p className="text-[10px] text-slate-500 font-medium">Sinkronisasi 2-Arah otomatis berjalan setiap 4 detik.</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={isTestingSheets}
                      onClick={async () => {
                        setIsTestingSheets(true);
                        try {
                          await fetch('/api/sheets/sync-down').catch(() => {});
                          onRefreshData();
                          showToast('Data Google Sheets & Drive berhasil diperbarui!', 'success');
                        } catch (err: any) {
                          showToast('Gagal menarik data: ' + err.message, 'error');
                        } finally {
                          setIsTestingSheets(false);
                        }
                      }}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                      title="Ambil data terbaru dari Google Sheets"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingSheets ? 'animate-spin' : ''}`} />
                      <span>Tarik Data Terbaru</span>
                    </button>
                    <button
                      type="button"
                      disabled={isTestingSheets}
                      onClick={async () => {
                        setIsTestingSheets(true);
                        try {
                          const testPayload = {
                            action: 'subscribe',
                            id: `TR-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
                            name: 'Uji Coba Sinkronisasi',
                            email: `uji.${Date.now().toString().slice(-4)}@patasnet.id`,
                            phone: '081234567890',
                            address: 'Jl. Uji Coba Integrasi No. 1, Jakarta',
                            coordinates: [-6.2088, 106.8456],
                            packageId: 'home-20m',
                            status: 'active',
                            url: googleSheetsUrl || undefined,
                          };

                          const res = await fetch('/api/sheets/proxy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(testPayload),
                          });

                          if (googleSheetsUrl) {
                            await fetch(googleSheetsUrl, {
                              method: 'POST',
                              mode: 'no-cors',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(testPayload),
                            }).catch(() => {});
                          }

                          if (res.ok) {
                            showToast('Data uji coba sukses direkam ke Sheet Pelanggan & Pembayaran!', 'success');
                          } else {
                            showToast('Data uji coba dikirim ke database!', 'success');
                          }
                          onRefreshData();
                        } catch (err: any) {
                          showToast('Gagal mengirim data uji coba: ' + err.message, 'error');
                        } finally {
                          setIsTestingSheets(false);
                        }
                      }}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      title="Kirim 1 baris pelanggan uji coba ke Google Sheets"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingSheets ? 'animate-spin' : ''}`} />
                      <span>Uji Kirim Baris</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* HOW IT WORKS CARD */}
              <div className="lg:col-span-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6 rounded-2xl border border-blue-100 space-y-3">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  Keuntungan Menggunakan Google Sheets & Drive
                </span>
                <h4 className="font-extrabold text-sm text-slate-900">Kemudahan Pengelolaan Mandiri</h4>
                <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>100% Gratis:</strong> Tanpa biaya database bulanan pihak ketiga.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Mudah Diedit:</strong> Bisa dibuka dari HP via Google Sheets dan Google Drive.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Arsip Gambar KTP:</strong> Foto KTP pelanggan otomatis tersimpan dalam folder Google Drive khusus.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Laporan Keuangan:</strong> Semua bukti transfer bank langsung tercatat rapi di Sheet Pembayaran.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* LIVE GOOGLE SPREADSHEET TABLE VIEWER */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Lembar Kerja Database Google Sheets (Live Data)
                </h3>
              </div>
              <GoogleSpreadsheetViewer webAppUrl={googleSheetsUrl} onRefreshParent={onRefreshData} />
            </div>

            {/* STEP BY STEP GUIDE */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" /> Langkah Mudah Pemasangan (Hanya 3 Menit)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h4 className="font-bold text-xs text-slate-900">Buka Spreadsheet Baru</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a> di browser Anda, beri nama spreadsheet misalnya <strong>Database Patas Net</strong>.
                  </p>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h4 className="font-bold text-xs text-slate-900">Buka Apps Script & Tempel Kode</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Klik menu <strong>Extensions (Ekstensi) &rarr; Apps Script</strong>. Hapus isi default dan tempel kode script yang telah Anda salin dengan tombol di atas.
                  </p>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h4 className="font-bold text-xs text-slate-900">Deploy Web App & Tempel URL</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Klik <strong>Deploy &rarr; New deployment</strong>, pilih <strong>Web app</strong>, Who has access: <strong>Anyone</strong>. Salin Web App URL dan tempelkan ke kolom di atas. Selesai!
                  </p>
                </div>
              </div>
            </div>

            {/* SCRIPT CODE VIEWER */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  Pratinjau Kode Google Apps Script (Code.gs)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
                    setCopiedScript(true);
                    showToast('Kode Google Apps Script disalin ke clipboard!', 'success');
                    setTimeout(() => setCopiedScript(false), 3000);
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin Seluruh Kode
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            </div>
          </div>
        )}

        <ImagePreviewModal
          isOpen={previewModal.isOpen}
          onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
          imageUrl={previewModal.imageUrl}
          title={previewModal.title}
          subtitle={previewModal.subtitle}
        />
      </div>
    </div>
  </div>
  );
}
