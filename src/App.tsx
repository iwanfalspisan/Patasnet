import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import SubscriptionForm from './components/SubscriptionForm';
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Logo from './components/Logo';
import { CustomerUser, SupportTicket, CompanySettings } from './types';
import { ShieldAlert, User, CheckCircle, Wifi, AlertCircle, Eye, EyeOff, Mail, KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import {
  authenticateLocally,
  getLocalCustomers,
  getLocalTickets,
  saveLocalCustomers,
  saveLocalTickets,
  updateLocalTicketStatus,
  updateLocalCustomerStatus,
  updateLocalPaymentStatus,
  addLocalCustomer,
  fetchFromGoogleSheets,
  syncToGoogleSheets,
  getGoogleSheetsWebhookUrl,
  saveGoogleSheetsWebhookUrl,
  getLocalSettings,
  saveLocalSettings,
  DEFAULT_COMPANY_SETTINGS,
  requestPasswordResetLocally,
  resetCustomerPasswordLocally,
  getLocalPackages,
  getLocalCoverage,
  computeCoverageSummaryText,
} from './lib/clientFallback';
import { sanitizeSheetSettings, isAppsScriptWebAppUrl } from './lib/googleSheetsIntegration';
import { generateNewCustomerWhatsAppUrl, getWhatsAppConfig } from './lib/whatsappApi';
import { MessageSquare, ExternalLink } from 'lucide-react';

function mergeIncomingSettings(prev: CompanySettings, incoming: Partial<CompanySettings>): CompanySettings {
  const sanitized = sanitizeSheetSettings({ ...incoming });
  delete (sanitized as any)._hadFormulaError;
  const activeCoverage = getLocalCoverage();
  const liveCoverageText = computeCoverageSummaryText(activeCoverage);
  return {
    ...prev,
    ...sanitized,
    coverageText: liveCoverageText,
    coverageJson: JSON.stringify(activeCoverage),
    logoUrl: sanitized.logoUrl && String(sanitized.logoUrl).trim() !== '' ? sanitized.logoUrl : prev.logoUrl,
    qrisUrl: sanitized.qrisUrl && String(sanitized.qrisUrl).trim() !== '' ? sanitized.qrisUrl : prev.qrisUrl,
    promos:
      Array.isArray(sanitized.promos) && sanitized.promos.length > 0
        ? sanitized.promos
        : Array.isArray(prev.promos)
        ? prev.promos
        : [],
    heroSlides:
      Array.isArray(sanitized.heroSlides) && sanitized.heroSlides.length > 0
        ? sanitized.heroSlides
        : Array.isArray(prev.heroSlides) && prev.heroSlides.length > 0
        ? prev.heroSlides
        : DEFAULT_COMPANY_SETTINGS.heroSlides,
  };
}

function haveSettingsChanged(a: CompanySettings, b: CompanySettings): boolean {
  const keys: Array<keyof CompanySettings> = [
    'name',
    'legalName',
    'tagline',
    'coverageText',
    'whatsappNumber',
    'phoneNumber',
    'email',
    'address',
    'logoText',
    'themeColor',
    'logoUrl',
    'qrisUrl',
    'qrisMerchantName',
    'qrisNmid',
    'qrisAutoVerify',
    'qrisInstructions',
    'instagramUrl',
    'facebookUrl',
    'youtubeUrl',
    'packagesJson',
    'coverageJson',
    'whatsappConfigJson',
  ];
  for (const k of keys) {
    if ((a[k] ?? '') !== (b[k] ?? '')) return true;
  }
  if (JSON.stringify(a.promos || []) !== JSON.stringify(b.promos || [])) return true;
  if (JSON.stringify(a.heroSlides || []) !== JSON.stringify(b.heroSlides || [])) return true;
  return false;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  // Company Branding settings
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

  // Dynamically sync browser favicon and document title with website logo & branding
  useEffect(() => {
    const activeLogoUrl =
      companySettings.logoUrl && companySettings.logoUrl.trim() !== ''
        ? companySettings.logoUrl
        : DEFAULT_COMPANY_SETTINGS.logoUrl;

    if (activeLogoUrl) {
      let faviconEl = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
      if (!faviconEl) {
        faviconEl = document.createElement('link');
        faviconEl.id = 'dynamic-favicon';
        faviconEl.rel = 'icon';
        document.head.appendChild(faviconEl);
      }
      faviconEl.href = activeLogoUrl;

      let appleIconEl = document.getElementById('dynamic-apple-icon') as HTMLLinkElement | null;
      if (!appleIconEl) {
        appleIconEl = document.createElement('link');
        appleIconEl.id = 'dynamic-apple-icon';
        appleIconEl.rel = 'apple-touch-icon';
        document.head.appendChild(appleIconEl);
      }
      appleIconEl.href = activeLogoUrl;
    }

    if (companySettings.name) {
      document.title = `${companySettings.name} — ${companySettings.tagline || 'Layanan Internet Fiber Cepat'}`;
    }
  }, [companySettings.logoUrl, companySettings.name, companySettings.tagline]);

  // Auth & Session (Admin & Pelanggan only)
  const [currentUser, setCurrentUser] = useState<CustomerUser | { isAdmin: boolean } | null>(null);

  // Admin Data states
  const [adminCustomers, setAdminCustomers] = useState<CustomerUser[]>([]);
  const [adminSupportTickets, setAdminSupportTickets] = useState<SupportTicket[]>([]);
  const [adminWhatsappLogs, setAdminWhatsappLogs] = useState<any[]>([]);

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginIsAdmin, setLoginIsAdmin] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot password flow states (simulating password reset and updating local storage status)
  const [authViewMode, setAuthViewMode] = useState<'login' | 'forgot-password' | 'reset-password'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetSimulatedData, setResetSimulatedData] = useState<{
    email: string;
    user?: CustomerUser;
    resetLink?: string;
  } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);

  // Form registration success message
  const [registrationSuccessUser, setRegistrationSuccessUser] = useState<CustomerUser | null>(null);

  // Fetch company branding settings on mount
  const fetchCompanySettings = async () => {
    // 1. Initial immediate paint from local storage
    const local = getLocalSettings();
    if (local && (local.logoUrl || local.name)) {
      setCompanySettings((prev) => mergeIncomingSettings(prev, local));
    }

    // 2. Synchronize Google Sheets Web App URL between client and server so all devices share the same URL
    try {
      const localUrl = getGoogleSheetsWebhookUrl();
      const cfgRes = await fetch('/api/sheets/config');
      if (cfgRes.ok) {
        const cJson = await cfgRes.json();
        const serverUrl = cJson?.config?.webAppUrl || '';
        if (isAppsScriptWebAppUrl(localUrl) && !isAppsScriptWebAppUrl(serverUrl)) {
          // Push this browser's valid Apps Script URL to the server so all other devices get it
          fetch('/api/sheets/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ webAppUrl: localUrl }),
          }).catch(() => {});
        } else if (serverUrl) {
          saveGoogleSheetsWebhookUrl(serverUrl);
        }
      }
    } catch {}

    // 3. Fetch authoritative company settings from server
    try {
      const response = await fetch('/api/settings/company');
      if (response.ok) {
        const data = await response.json();
        const settings = data.settings || data;
        if (settings && typeof settings === 'object') {
          setCompanySettings((prev) => {
            const merged = mergeIncomingSettings(prev, settings);
            saveLocalSettings(merged);
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch company settings:', err);
    }

    // 4. Also check Google Sheets directly (and mirror back to server if updated)
    try {
      const sheetData = await fetchFromGoogleSheets();
      if (sheetData && sheetData.settings) {
        setCompanySettings((prev) => {
          const merged = mergeIncomingSettings(prev, sheetData.settings);
          saveLocalSettings(merged);
          return merged;
        });
      }
    } catch (gErr) {
      console.warn('Google Sheets settings check:', gErr);
    }
  };

  const handleUpdateCompanySettings = async (newSettings: Partial<CompanySettings> & { name: string }) => {
    const updated = mergeIncomingSettings(companySettings, newSettings);
    // 1. Instantly update local state & local storage for immediate UI reactivity everywhere
    setCompanySettings(updated);
    saveLocalSettings(updated);

    // 2. Broadcast immediately to all other tabs and windows in the same browser (0ms)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('patasnet_sync');
        bc.postMessage({ type: 'SETTINGS_UPDATED', settings: updated });
        bc.close();
      }
    } catch (bcErr) {
      console.warn('BroadcastChannel error:', bcErr);
    }

    // 3. Persist to server if available (which updates Google Sheets & Drive and broadcasts via SSE to all other devices)
    try {
      const res = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const sJson = await res.json();
        if (sJson?.settings) {
          const serverMerged = mergeIncomingSettings(updated, sJson.settings);
          setCompanySettings(serverMerged);
          saveLocalSettings(serverMerged);
        }
      }
    } catch (err) {
      console.warn('Failed to update company settings on server:', err);
    }

    // 4. Sync to Google Sheets & Drive Webhook in 2-way real time
    try {
      await syncToGoogleSheets('update_settings', {
        ...updated,
        logoBase64: updated.logoUrl && updated.logoUrl.startsWith('data:') ? updated.logoUrl : undefined,
      });
    } catch (gErr) {
      console.warn('Google Sheets settings sync error:', gErr);
    }

    return true;
  };

  useEffect(() => {
    fetchCompanySettings();

    // 1. Real-time BroadcastChannel for instantaneous cross-tab/cross-window sync
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('patasnet_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SETTINGS_UPDATED' && event.data.settings) {
            setCompanySettings((prev) => {
              const merged = mergeIncomingSettings(prev, event.data.settings);
              saveLocalSettings(merged);
              return merged;
            });
          }
        };
      }
    } catch {}

    // 2. Real-time Server-Sent Events (SSE) across all connected devices & browsers (Google Sheets & Drive Cloud Sync)
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/sync/events');
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SETTINGS_UPDATED' && data.settings) {
            setCompanySettings((prev) => {
              const merged = mergeIncomingSettings(prev, data.settings);
              saveLocalSettings(merged);
              return merged;
            });
          } else if (data.type === 'SHEETS_DB_UPDATED') {
            // Pull latest authoritative data and Google Drive images from Google Sheets Database immediately
            fetchFromGoogleSheets()
              .then((sheetData) => {
                if (sheetData) {
                  if (sheetData.customers && sheetData.customers.length > 0) {
                    setAdminCustomers(sheetData.customers);
                    setCurrentUser((curr) => {
                      if (curr && 'id' in curr) {
                        const updated = sheetData.customers?.find((c) => c.id === curr.id);
                        if (updated) return updated;
                      }
                      return curr;
                    });
                  }
                  if (sheetData.tickets) {
                    setAdminSupportTickets(sheetData.tickets);
                  }
                  if (sheetData.settings && sheetData.settings.name) {
                    setCompanySettings((prev) => {
                      const merged = mergeIncomingSettings(prev, sheetData.settings);
                      saveLocalSettings(merged);
                      return merged;
                    });
                  }
                }
              })
              .catch(() => {});
          }
        } catch {}
      };
    } catch {}

    // 3. Initial sync down from Google Sheets & Drive
    fetchAdminData();

    // 4. Continuous background synchronization with Google Sheets & Drive every 3 seconds
    const bgSyncInterval = setInterval(() => {
      fetchFromGoogleSheets()
        .then((data) => {
          if (data) {
            if (data.customers && data.customers.length > 0) {
              setAdminCustomers(data.customers);
              setCurrentUser((curr) => {
                if (curr && 'id' in curr) {
                  const updated = data.customers?.find((c) => c.id === curr.id);
                  if (updated) return updated;
                }
                return curr;
              });
            }
            if (data.tickets && data.tickets.length > 0) {
              setAdminSupportTickets(data.tickets);
            }
            if (data.settings && data.settings.name) {
              setCompanySettings((prev) => {
                const merged = mergeIncomingSettings(prev, data.settings);
                if (haveSettingsChanged(prev, merged)) {
                  saveLocalSettings(merged);
                  return merged;
                }
                return prev;
              });
            }
          }
        })
        .catch(() => {});
    }, 3000);

    const handleLocalDataUpdated = () => {
      const local = getLocalSettings();
      setCompanySettings((prev) => mergeIncomingSettings(prev, local));
    };
    window.addEventListener('patasnet:data-updated', handleLocalDataUpdated);

    return () => {
      window.removeEventListener('patasnet:data-updated', handleLocalDataUpdated);
      if (bc) bc.close();
      if (sse) sse.close();
      clearInterval(bgSyncInterval);
    };
  }, []);

  // Auto scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Sync admin data or customer data with Google Sheets as primary database
  const fetchAdminData = async () => {
    // 1. Try 2-way live sync from Google Sheets (Primary Database)
    try {
      const sheetData = await fetchFromGoogleSheets();
      if (sheetData && sheetData.customers && sheetData.customers.length > 0) {
        setAdminCustomers(sheetData.customers);
        if (sheetData.tickets) setAdminSupportTickets(sheetData.tickets);
        if (sheetData.settings && sheetData.settings.name) {
          setCompanySettings((prev) => {
            const merged = mergeIncomingSettings(prev, sheetData.settings);
            saveLocalSettings(merged);
            return merged;
          });
        }
        return;
      }
    } catch (gErr) {
      console.warn('Google Sheets 2-way sync check:', gErr);
    }

    // 2. Try server endpoint
    try {
      const response = await fetch('/api/admin/data');
      if (response.ok) {
        const data = await response.json();
        setAdminCustomers(data.customers || []);
        setAdminSupportTickets(data.tickets || []);
        setAdminWhatsappLogs(data.whatsappLogs || []);
        if (data.companySettings) {
          setCompanySettings((prev) => {
            const merged = mergeIncomingSettings(prev, data.companySettings);
            saveLocalSettings(merged);
            return merged;
          });
        }
        return;
      }
    } catch (err) {
      console.warn('Failed to sync admin data from server:', err);
    }

    // 3. Fallback
    setAdminCustomers(getLocalCustomers());
    setAdminSupportTickets(getLocalTickets());
  };

  const fetchCustomerProfile = async (id: string) => {
    // 1. Check Google Sheets 2-way sync (Primary Database)
    try {
      const sheetData = await fetchFromGoogleSheets();
      if (sheetData && sheetData.customers) {
        const found = sheetData.customers.find((c) => c.id === id);
        if (found) {
          setCurrentUser(found);
          return;
        }
      }
    } catch (gErr) {
      console.warn('Google Sheets check for customer profile:', gErr);
    }

    // 2. Check server
    try {
      const response = await fetch(`/api/customers/${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to sync customer data from server:', err);
    }

    // 3. Fallback
    const local = getLocalCustomers().find((c) => c.id === id);
    if (local) {
      setCurrentUser(local);
    }
  };

  // Real-time 2-way synchronizer: polling every 3 seconds to sync with Google Sheets & server across all devices
  useEffect(() => {
    const runLiveSync = async () => {
      // 1. Live 2-way sync with Google Sheets as Primary Database
      try {
        const sheetData = await fetchFromGoogleSheets();
        if (sheetData) {
          if (sheetData.settings && sheetData.settings.name) {
            setCompanySettings((prev) => {
              const merged = mergeIncomingSettings(prev, sheetData.settings);
              if (haveSettingsChanged(prev, merged)) {
                saveLocalSettings(merged);
                return merged;
              }
              return prev;
            });
          }
          if (sheetData.customers && sheetData.customers.length > 0) {
            setAdminCustomers(sheetData.customers);
            if (currentUser && 'id' in currentUser) {
              const custId = (currentUser as CustomerUser).id;
              const updated = sheetData.customers.find((c) => c.id === custId);
              if (updated && JSON.stringify(updated) !== JSON.stringify(currentUser)) {
                setCurrentUser(updated);
              }
            }
          }
          if (sheetData.tickets && sheetData.tickets.length > 0) {
            setAdminSupportTickets(sheetData.tickets);
          }
        }
      } catch (err) {
        // silent
      }

      // 2. Silent sync for server company settings across all fields
      fetch('/api/settings/company')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            const s = data.settings || data;
            if (s && typeof s === 'object' && s.name) {
              setCompanySettings((prev) => {
                const merged = mergeIncomingSettings(prev, s);
                if (haveSettingsChanged(prev, merged)) {
                  saveLocalSettings(merged);
                  return merged;
                }
                return prev;
              });
            }
          }
        })
        .catch(() => {});

      // 3. Sync admin or customer data
      if (currentUser) {
        if ('isAdmin' in currentUser && (currentUser as any).isAdmin) {
          fetchAdminData();
        } else if ('id' in currentUser) {
          const custId = (currentUser as CustomerUser).id;
          fetch(`/api/customers/${custId}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && data.user) {
                if (JSON.stringify(currentUser) !== JSON.stringify(data.user)) {
                  setCurrentUser(data.user);
                }
              }
            })
            .catch(() => {});
        }
      }
    };

    const syncInterval = setInterval(runLiveSync, 3000);

    const handleFocus = () => runLiveSync();
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') runLiveSync();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser]);

  // Sync active dashboard states
  useEffect(() => {
    let isMounted = true;

    if (currentUser) {
      if ('isAdmin' in currentUser && (currentUser as any).isAdmin) {
        fetchAdminData();
      } else {
        const customerUser = currentUser as CustomerUser;
        fetch(`/api/customers/${customerUser.id}`)
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error('Sync failed');
          })
          .then((data) => {
            if (isMounted && data.user) {
              const oldStr = JSON.stringify(customerUser);
              const newStr = JSON.stringify(data.user);
              if (oldStr !== newStr) {
                setCurrentUser(data.user);
              }
            }
          })
          .catch(() => {
            const latest = getLocalCustomers().find((c) => c.id === customerUser.id);
            if (isMounted && latest) {
              setCurrentUser(latest);
            }
          });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [currentPage, (currentUser as any)?.id]);

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    setRegistrationSuccessUser(null);
    setCurrentPage('subscribe');
  };

  // Login action handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Harap masukkan email dan password.');
      return;
    }

    setLoginLoading(true);
    try {
      let loggedIn = false;
      let loginData: any = null;

      // 1. Try instant local authentication first (for both Admin and newly registered / cached Customers)
      const immediateLocalAuth = authenticateLocally(loginEmail, loginPassword, loginIsAdmin);
      if (immediateLocalAuth.ok || immediateLocalAuth.success) {
        loginData = { user: immediateLocalAuth.user };
        loggedIn = true;
      }

      // 2. Try server-side authentication if not yet logged in
      if (!loggedIn) {
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: loginEmail,
              password: loginPassword,
              isAdmin: loginIsAdmin,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.user) {
              loginData = data;
              loggedIn = true;
            }
          }
        } catch (networkErr) {
          console.warn('Backend API unreachable, using client/Google Sheets authentication for Vercel:', networkErr);
        }
      }

      // 3. Client-side authentication fallback (Guarantees login works seamlessly on Vercel)
      if (!loggedIn) {
        let localAuth = authenticateLocally(loginEmail, loginPassword, loginIsAdmin);
        // If customer not found locally on a fresh Vercel device, pull latest customers from Google Sheets first
        if (!localAuth.ok && !localAuth.success && !loginIsAdmin) {
          try {
            const sheetData = await fetchFromGoogleSheets();
            if (sheetData?.customers && sheetData.customers.length > 0) {
              saveLocalCustomers(sheetData.customers);
              localAuth = authenticateLocally(loginEmail, loginPassword, loginIsAdmin);
            }
          } catch {}
        }

        if (localAuth.ok || localAuth.success) {
          loginData = { user: localAuth.user };
          loggedIn = true;
        } else {
          setLoginError(localAuth.message || 'Login gagal. Silakan periksa kembali email & password Anda.');
          setLoginLoading(false);
          return;
        }
      }

      if (loggedIn && loginData?.user) {
        setCurrentUser(loginData.user);
        setLoginEmail('');
        setLoginPassword('');
        setLoginError('');
        setRegistrationSuccessUser(null);

        if (loginData.user.isAdmin) {
          setCurrentPage('admin-dashboard');
        } else {
          setCurrentPage('customer-dashboard');
        }
      }
    } catch (err: any) {
      console.error('Login process error:', err);
      const localAuth = authenticateLocally(loginEmail, loginPassword, loginIsAdmin);
      if (localAuth.ok || localAuth.success) {
        setCurrentUser(localAuth.user);
        setLoginEmail('');
        setLoginPassword('');
        setLoginError('');
        setRegistrationSuccessUser(null);
        setCurrentPage(localAuth.user.isAdmin ? 'admin-dashboard' : 'customer-dashboard');
      } else {
        setLoginError(localAuth.message || 'Login gagal. Harap periksa email dan password Anda.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Request password reset link (simulating the flow by updating status in local storage)
  const handleRequestResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setResetSimulatedData(null);

    if (!forgotEmail.trim()) {
      setForgotError('Harap masukkan alamat email.');
      return;
    }

    setForgotLoading(true);
    try {
      // Execute local storage simulation and update user status
      const res = requestPasswordResetLocally(forgotEmail.trim());
      if (res.success) {
        setForgotSuccess(res.message);
        setResetSimulatedData({
          email: forgotEmail.trim(),
          user: res.user,
          resetLink: res.resetLink,
        });
      } else {
        setForgotError(res.message);
      }
    } catch (err: any) {
      setForgotError('Gagal memproses permintaan reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Perform password reset completion
  const handlePerformResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordError(null);
    setResetPasswordSuccess(null);

    if (!newPasswordInput || newPasswordInput.length < 4) {
      setResetPasswordError('Kata sandi baru minimal harus 4 karakter.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setResetPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (resetSimulatedData?.email) {
      const ok = resetCustomerPasswordLocally(resetSimulatedData.email, newPasswordInput);
      if (ok) {
        setResetPasswordSuccess('Kata sandi berhasil diperbarui dan status akun Anda di local storage kembali AKTIF. Silakan login.');
        setLoginEmail(resetSimulatedData.email);
        setLoginPassword(newPasswordInput);
      } else {
        setResetPasswordError('Gagal memperbarui kata sandi di penyimpanan lokal.');
      }
    }
  };

  // Admin action handlers
  const handleUpdateCustomerStatus = async (id: string, status: 'pending' | 'active' | 'suspended') => {
    // Update local state immediately
    updateLocalCustomerStatus(id, status);
    setAdminCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, status };
          syncToGoogleSheets('update_status', { id, status }).catch(() => {});
          return updated;
        }
        return c;
      })
    );
    try {
      await fetch('/api/customers/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      await fetchAdminData();
    } catch (err) {
      console.warn('Server status update failed, updated locally:', err);
    }
  };

  const handleVerifyPayment = async (userId: string, paymentId: string) => {
    // Update local state immediately
    updateLocalPaymentStatus(userId, paymentId, 'paid');
    setAdminCustomers((prev) =>
      prev.map((c) => {
        if (c.id === userId) {
          const payments = (c.payments || []).map((p) =>
            p.id === paymentId ? { ...p, status: 'paid' as const } : p
          );
          const updated = { ...c, payments, status: 'active' as const };
          syncToGoogleSheets('approve_payment', { userId, paymentId }).catch(() => {});
          return updated;
        }
        return c;
      })
    );
    try {
      await fetch('/api/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, paymentId }),
      });
      await fetchAdminData();
    } catch (err) {
      console.warn('Server approve payment failed, updated locally:', err);
    }
  };

  const handleRejectPayment = async (userId: string, paymentId: string) => {
    // Update local state immediately
    updateLocalPaymentStatus(userId, paymentId, 'unpaid');
    setAdminCustomers((prev) =>
      prev.map((c) => {
        if (c.id === userId) {
          const payments = (c.payments || []).map((p) =>
            p.id === paymentId ? { ...p, status: 'unpaid' as const } : p
          );
          const updated = { ...c, payments };
          syncToGoogleSheets('reject_payment', { userId, paymentId }).catch(() => {});
          return updated;
        }
        return c;
      })
    );
    try {
      await fetch('/api/payments/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, paymentId }),
      });
      await fetchAdminData();
    } catch (err) {
      console.warn('Server reject payment failed, updated locally:', err);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: 'open' | 'resolved') => {
    // 1. Update local storage & state immediately
    const updatedTickets = updateLocalTicketStatus(ticketId, status);
    setAdminSupportTickets(updatedTickets);
    setAdminCustomers((prev) =>
      prev.map((c) => {
        if (!Array.isArray(c.tickets)) return c;
        return {
          ...c,
          tickets: c.tickets.map((t) => (t.id === ticketId ? { ...t, status } : t)),
        };
      })
    );
    setCurrentUser((curr) => {
      if (curr && 'id' in curr && Array.isArray((curr as CustomerUser).tickets)) {
        return {
          ...curr,
          tickets: (curr as CustomerUser).tickets!.map((t) =>
            t.id === ticketId ? { ...t, status } : t
          ),
        };
      }
      return curr;
    });

    // 2. Sync to server & Google Sheets
    try {
      await fetch('/api/tickets/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status }),
      });
      await fetchAdminData();
    } catch (err) {
      console.warn('Server ticket status update failed, updated locally:', err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('home');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans selection:bg-blue-500 selection:text-white pb-20 md:pb-0">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={(page) => {
          setRegistrationSuccessUser(null);
          setCurrentPage(page);
        }}
        currentPage={currentPage}
        companyName={companySettings.name}
        logoUrl={companySettings.logoUrl}
        companySettings={companySettings}
      />

      <main className="flex-1">
        {/* Animated view container triggered on each page transition */}
        <div key={currentPage} className="page-transition w-full">
          {/* Render View depending on state */}
          {currentPage === 'home' && (
          <Home
            onSelectPackage={handleSelectPackage}
            onNavigate={setCurrentPage}
            companyName={companySettings.name}
            logoUrl={companySettings.logoUrl}
            companySettings={companySettings}
          />
        )}

        {currentPage === 'subscribe' && (
          <>
            {registrationSuccessUser ? (
              <div className="max-w-lg mx-auto my-12 p-6 sm:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-2xl text-center space-y-5 text-xs">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <span className="inline-block px-3 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-extrabold text-[10px] uppercase tracking-wider">
                    Registrasi & Notifikasi WA Otomatis Aktif
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900">Pendaftaran Berhasil!</h2>
                  <p className="text-slate-500 leading-relaxed">
                    Selamat datang <strong className="text-slate-800">{registrationSuccessUser.name}</strong>! Akun Anda telah dibuat dengan ID Pelanggan{' '}
                    <strong className="text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{registrationSuccessUser.id}</strong>.
                  </p>
                </div>

                {/* WhatsApp Automatic Customer Notification & Bot Card */}
                {(() => {
                  const waData =
                    (registrationSuccessUser as any)?._waNotification ||
                    generateNewCustomerWhatsAppUrl(
                      registrationSuccessUser,
                      getLocalPackages().find((p) => p.id === registrationSuccessUser.packageId),
                      companySettings
                    );
                  const customerSent = Boolean(waData?.apiSentToCustomer || waData?.customerSent);
                  const adminSent = Boolean(waData?.apiSentToAdmin || waData?.adminSent);

                  return (
                    <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-left space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                          <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {customerSent
                              ? `Pesan WhatsApp Otomatis Terkirim ke ${registrationSuccessUser.phone}!`
                              : `Notifikasi WhatsApp Otomatis ke ${registrationSuccessUser.phone}`}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[9px] font-extrabold uppercase shrink-0">
                          {customerSent || adminSent ? 'Terkirim via API' : 'Siap Dikirim'}
                        </span>
                      </div>

                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        {customerSent
                          ? `Bukti pendaftaran resmi & ID Pelanggan (${registrationSuccessUser.id}) telah dikirim otomatis ke WhatsApp Anda (${registrationSuccessUser.phone}) serta ke Admin Teknis.`
                          : `Bukti pendaftaran resmi & menu Bot Asisten 24 Jam telah disiapkan otomatis untuk nomor WhatsApp Anda (${registrationSuccessUser.phone}).`}
                      </p>

                      {/* Preview of the automatic WhatsApp message sent to customer */}
                      {waData?.customerMessage && (
                        <div className="p-3 bg-white rounded-xl border border-emerald-200/80 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 border-b border-slate-100 pb-1">
                            <span>📩 Isi Pesan Otomatis ke WhatsApp Pelanggan:</span>
                            <span className="font-mono">{registrationSuccessUser.phone}</span>
                          </div>
                          <pre className="text-[10px] text-slate-700 font-sans whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                            {waData.customerMessage}
                          </pre>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {waData?.customerWaUrl && (
                          <a
                            href={waData.customerWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 text-[11px]"
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            <span>Buka Pesan di WA Saya</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                        <a
                          href={waData?.adminWaUrl || waData?.waRedirectUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 text-[11px]"
                        >
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span>Konfirmasi & Tanya Bot WA</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>

                      <div className="p-2.5 bg-emerald-100/70 rounded-xl text-[10px] text-emerald-900 leading-relaxed">
                        🤖 <strong>Bot Auto-Reply 24 Jam Aktif:</strong> Jika ada pertanyaan di WhatsApp, Anda cukup membalas dengan kata kunci <strong>PAKET</strong>, <strong>TAGIHAN</strong>, <strong>BAYAR</strong>, <strong>CAKUPAN</strong>, atau <strong>GANGGUAN</strong> dan Bot kami akan langsung membalasnya secara otomatis!
                      </div>
                    </div>
                  );
                })()}

                {/* Customer Account Credentials Summary Card */}
                <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-blue-950 text-xs">🔐 Akun Login Pelanggan Anda Siap Digunakan:</p>
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md font-extrabold text-[9px] uppercase">
                      Aktif & Terdaftar
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-white p-3 rounded-xl border border-blue-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Email Login:</span>
                      <strong className="text-slate-900 font-mono break-all">{registrationSuccessUser.email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ID Pelanggan:</span>
                      <strong className="text-blue-600 font-mono">{registrationSuccessUser.id}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">No. WhatsApp:</span>
                      <strong className="text-slate-900 font-mono">{registrationSuccessUser.phone}</strong>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-800">
                    Anda dapat login kapan saja menggunakan <strong>Email</strong>, <strong>No. WhatsApp</strong>, atau <strong>ID Pelanggan</strong> beserta kata sandi yang baru saja Anda buat.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      const userToLogin = registrationSuccessUser;
                      setCurrentUser(userToLogin);
                      setRegistrationSuccessUser(null);
                      setCurrentPage('customer-dashboard');
                    }}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-lg shadow-blue-600/20 transition-all active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Masuk Langsung ke Akun Saya (Portal Pelanggan) &rarr;</span>
                  </button>

                  <button
                    onClick={() => {
                      setLoginIsAdmin(false);
                      setLoginEmail(registrationSuccessUser.email);
                      setLoginPassword(
                        (registrationSuccessUser as any).password ||
                          (registrationSuccessUser as any).customPassword ||
                          ''
                      );
                      setRegistrationSuccessUser(null);
                      setCurrentPage('login-selection');
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                  >
                    Masuk Melalui Halaman Login (Email & Password Terisi Otomatis)
                  </button>
                </div>
              </div>
            ) : (
              <SubscriptionForm
                selectedPackageId={selectedPackageId}
                onNavigate={setCurrentPage}
                onSubmitSuccess={(user) => {
                  const updatedCusts = addLocalCustomer(user);
                  setAdminCustomers(updatedCusts);
                  setLoginEmail(user.email || '');
                  setLoginPassword(user.password || user.customPassword || '');
                  if (!(user as any)._syncedByServer) {
                    syncToGoogleSheets('subscribe', user).catch(() => {});
                  }
                  setRegistrationSuccessUser(user);
                }}
              />
            )}
          </>
        )}

        {currentPage === 'login-selection' && (
          <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200/80 rounded-3xl shadow-2xl text-xs space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-1">
                <Logo companyName={companySettings.name} logoUrl={companySettings.logoUrl} tagline={companySettings.tagline} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {authViewMode === 'forgot-password'
                  ? 'Pemulihan Kata Sandi'
                  : authViewMode === 'reset-password'
                  ? 'Atur Ulang Kata Sandi'
                  : 'Masuk'}
              </h2>
              <p className="text-slate-400">
                {authViewMode === 'forgot-password'
                  ? 'Minta tautan reset kata sandi via email dengan simulasi local storage.'
                  : authViewMode === 'reset-password'
                  ? 'Buat kata sandi baru untuk memulihkan akun Anda.'
                  : 'Silakan masukkan akun pelanggan atau panel administrator Anda.'}
              </p>
            </div>

            {/* VIEW 1: FORGOT PASSWORD FLOW */}
            {authViewMode === 'forgot-password' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthViewMode('login');
                      setForgotError(null);
                      setForgotSuccess(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Kembali ke Login"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      Permintaan Reset Password
                    </h3>
                    <p className="text-[10px] text-slate-400">Simulasi pengiriman tautan & pembaruan status akun di local storage</p>
                  </div>
                </div>

                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <p className="leading-relaxed font-semibold">{forgotError}</p>
                  </div>
                )}

                {forgotSuccess ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-xs">{forgotSuccess}</p>
                        <p className="text-[11px] text-emerald-700 leading-relaxed">
                          Sistem telah memperbarui status akun di local storage menjadi <strong className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">PENDING (Reset Requested)</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Simulated Email & Reset Link Box */}
                    {resetSimulatedData && (
                      <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-3 border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px]">
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" /> SIMULASI EMAIL RESET TERKIRIM
                          </span>
                          <span className="font-mono text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Local Storage</span>
                        </div>
                        <div className="space-y-1.5 text-[11px] leading-relaxed">
                          <p><span className="text-slate-400">Penerima:</span> <strong className="text-white">{resetSimulatedData.email}</strong></p>
                          {resetSimulatedData.user && (
                            <>
                              <p><span className="text-slate-400">Nama Pelanggan:</span> <strong className="text-white">{resetSimulatedData.user.name}</strong></p>
                              <p className="flex items-center gap-1.5">
                                <span className="text-slate-400">Status Saat Ini di LocalStorage:</span>
                                <span className="bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">
                                  {resetSimulatedData.user.status} (Reset Diminta)
                                </span>
                              </p>
                            </>
                          )}
                          <p className="text-[10px] text-slate-400 truncate pt-1 border-t border-slate-800/80">
                            Tautan: <span className="font-mono text-emerald-300">{resetSimulatedData.resetLink}</span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthViewMode('reset-password');
                              setNewPasswordInput('');
                              setConfirmPasswordInput('');
                              setResetPasswordError(null);
                              setResetPasswordSuccess(null);
                            }}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Buka Tautan Reset & Masukkan Password Baru</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setAuthViewMode('login');
                        setForgotSuccess(null);
                        setForgotError(null);
                      }}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs"
                    >
                      Kembali ke Halaman Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRequestResetPassword} className="space-y-4">
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      Ketik alamat email Anda yang terdaftar. Sistem akan mensimulasikan pengiriman tautan reset dan mengubah status akun Anda di local storage menjadi pending.
                    </p>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1" htmlFor="forgot-email">ALAMAT EMAIL *</label>
                      <div className="relative">
                        <input
                          type="email"
                          id="forgot-email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="contoh: budi@gmail.com"
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50 text-xs"
                          required
                          autoFocus
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:bg-slate-400 flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengirim Tautan...</span>
                        </>
                      ) : (
                        <span>Kirim Tautan Reset via Email</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthViewMode('login');
                        setForgotError(null);
                        setForgotSuccess(null);
                      }}
                      className="w-full py-2 text-slate-500 hover:text-slate-800 font-bold transition text-xs"
                    >
                      Batal, Kembali ke Login
                    </button>
                  </form>
                )}
              </div>
            ) : authViewMode === 'reset-password' ? (
              /* VIEW 2: COMPLETE PASSWORD RESET */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAuthViewMode('forgot-password')}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Kembali"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      Buat Kata Sandi Baru
                    </h3>
                    <p className="text-[10px] text-slate-400">Atur ulang password untuk akun: <strong>{resetSimulatedData?.email}</strong></p>
                  </div>
                </div>

                {resetPasswordError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <p className="leading-relaxed font-semibold">{resetPasswordError}</p>
                  </div>
                )}

                {resetPasswordSuccess ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-xs">{resetPasswordSuccess}</p>
                        <p className="text-[11px] text-emerald-700">
                          Status akun di penyimpanan lokal telah dipulihkan menjadi <strong className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">ACTIVE</strong>.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthViewMode('login');
                        setResetPasswordSuccess(null);
                        setResetPasswordError(null);
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition active:scale-95 text-xs"
                    >
                      Masuk dengan Kata Sandi Baru
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePerformResetPassword} className="space-y-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1" htmlFor="new-pass">KATA SANDI BARU *</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          id="new-pass"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="Minimal 4 karakter"
                          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1" htmlFor="conf-pass">KONFIRMASI KATA SANDI *</label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        id="conf-pass"
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Simpan Password & Pulihkan Akun (Aktif)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuthViewMode('login')}
                      className="w-full py-2 text-slate-500 hover:text-slate-800 font-bold transition text-xs"
                    >
                      Batal, Kembali ke Login
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* VIEW 3: STANDARD LOGIN */
              <>
                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2.5 text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <p className="leading-relaxed font-semibold">{loginError}</p>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Type selector tab */}
                  <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/40">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginIsAdmin(false);
                        setLoginError('');
                      }}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all ${!loginIsAdmin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
                    >
                      Pelanggan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginIsAdmin(true);
                        setLoginError('');
                      }}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all ${loginIsAdmin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
                    >
                      Administrator
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1" htmlFor="login-email">
                      {loginIsAdmin ? 'EMAIL ADMIN *' : 'EMAIL / NO. WHATSAPP / ID PELANGGAN *'}
                    </label>
                    <input
                      type="text"
                      id="login-email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={
                        loginIsAdmin
                          ? 'admin@patasnet.id'
                          : 'Masukkan Email, No. WA, atau ID Pelanggan (TR-...)'
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-bold text-slate-700" htmlFor="login-pass">PASSWORD *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthViewMode('forgot-password');
                          setForgotEmail(loginEmail);
                          setForgotError(null);
                          setForgotSuccess(null);
                          setResetSimulatedData(null);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                      >
                        Lupa Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        id="login-pass"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="login-btn"
                    disabled={loginLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:bg-slate-400"
                  >
                    {loginLoading ? 'Menghubungkan...' : 'Masuk'}
                  </button>
                </form>
              </>
            )}

            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-slate-400">Belum punya jaringan {companySettings.name || 'Patas Net'}?</p>
              <button
                onClick={() => setCurrentPage('subscribe')}
                className="text-blue-600 hover:underline font-bold mt-1 inline-block"
              >
                Daftar Langganan Wifi Baru Sekarang
              </button>
            </div>

            {/* Quick Demo Credentials Autofill Widget (Pelanggan & Admin Only) */}
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/80 shadow-inner space-y-3">
              <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <span className="text-[10px] bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">DEMO</span>
                <span className="font-bold text-slate-800 text-[11px]">Kredensial Akses Uji Coba:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Customer Demo Option */}
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('budi@gmail.com');
                    setLoginPassword('user123');
                    setLoginIsAdmin(false);
                    setLoginError('');
                  }}
                  className="p-2.5 bg-white hover:bg-blue-50/50 border border-slate-150 rounded-xl text-left transition-all active:scale-95 group shadow-sm"
                >
                  <p className="font-extrabold text-[10px] text-blue-600 group-hover:text-blue-700 uppercase tracking-wider mb-0.5">Pelanggan</p>
                  <p className="text-[11px] text-slate-700 font-medium">budi@gmail.com</p>
                  <p className="text-[10px] text-slate-400 font-mono">Password: user123</p>
                  <span className="inline-block mt-1.5 text-[9px] text-blue-500 font-bold group-hover:underline">Autofill &rarr;</span>
                </button>

                {/* Admin Demo Option */}
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('admin@patasnet.id');
                    setLoginPassword('admin');
                    setLoginIsAdmin(true);
                    setLoginError('');
                  }}
                  className="p-2.5 bg-white hover:bg-indigo-50/50 border border-slate-150 rounded-xl text-left transition-all active:scale-95 group shadow-sm"
                >
                  <p className="font-extrabold text-[10px] text-indigo-600 group-hover:text-indigo-700 uppercase tracking-wider mb-0.5">Admin WiFi</p>
                  <p className="text-[11px] text-slate-700 font-medium">admin@patasnet.id</p>
                  <p className="text-[10px] text-slate-400 font-mono">Password: admin</p>
                  <span className="inline-block mt-1.5 text-[9px] text-indigo-500 font-bold group-hover:underline">Autofill &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'customer-dashboard' && currentUser && !('isAdmin' in currentUser) && (
          <CustomerDashboard
            user={currentUser as CustomerUser}
            supportTickets={adminSupportTickets}
            onRefreshUser={async () => {
              await fetchCustomerProfile((currentUser as CustomerUser).id);
              await fetchAdminData();
            }}
            onLogout={handleLogout}
            companyName={companySettings.name}
            logoUrl={companySettings.logoUrl}
            companySettings={companySettings}
          />
        )}

        {currentPage === 'admin-dashboard' && currentUser && 'isAdmin' in currentUser && currentUser.isAdmin && (
          <AdminDashboard
            customers={adminCustomers}
            supportTickets={adminSupportTickets}
            onRefreshData={fetchAdminData}
            onUpdateCustomerStatus={handleUpdateCustomerStatus}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onVerifyPayment={handleVerifyPayment}
            onRejectPayment={handleRejectPayment}
            whatsappLogs={adminWhatsappLogs}
            companySettings={companySettings}
            onUpdateCompanySettings={handleUpdateCompanySettings}
          />
        )}
        </div>
      </main>

      <Footer
        onNavigate={setCurrentPage}
        companyName={companySettings.name}
        logoUrl={companySettings.logoUrl}
        companySettings={companySettings}
      />
    </div>
  );
}
