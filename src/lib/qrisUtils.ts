// Utility functions for QRIS payment rendering and generation
export interface QrisData {
  merchantName: string;
  nmid: string;
  amount?: number;
  qrisUrl?: string;
  invoiceId?: string;
}

// Generate an SVG data URI representing a standard Indonesian QRIS voucher / barcode
export function generateDefaultQrisSvg(merchantName: string, nmid: string, amount?: number): string {
  const safeMerchant = (merchantName || 'PATAS NET - PT AMANUSA TELEMEDIA').toUpperCase();
  const safeNmid = nmid || 'ID1020039281747';
  const amountStr = amount ? `Rp ${amount.toLocaleString('id-ID')}` : 'NOMINAL FLEKSIBEL';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520">
    <!-- Background Card -->
    <rect width="400" height="520" rx="24" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    
    <!-- Top QRIS Header Band -->
    <path d="M 0 24 Q 0 0 24 0 L 376 0 Q 400 0 400 24 L 400 70 L 0 70 Z" fill="#b91c1c" />
    <text x="200" y="38" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" letter-spacing="3">QRIS</text>
    <text x="200" y="56" text-anchor="middle" fill="#fecaca" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="9" letter-spacing="1">QR INDONESIAN STANDARD</text>

    <!-- Merchant Details -->
    <text x="200" y="98" text-anchor="middle" fill="#0f172a" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="13">${safeMerchant.substring(0, 32)}</text>
    <text x="200" y="115" text-anchor="middle" fill="#64748b" font-family="monospace" font-weight="600" font-size="10">NMID: ${safeNmid}</text>
    
    <!-- QR Code Container Box -->
    <rect x="70" y="130" width="260" height="260" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
    
    <!-- QR Finder Pattern: Top-Left -->
    <rect x="90" y="150" width="56" height="56" rx="8" fill="#0f172a" />
    <rect x="100" y="160" width="36" height="36" rx="4" fill="#ffffff" />
    <rect x="108" y="168" width="20" height="20" rx="2" fill="#0f172a" />
    
    <!-- QR Finder Pattern: Top-Right -->
    <rect x="254" y="150" width="56" height="56" rx="8" fill="#0f172a" />
    <rect x="264" y="160" width="36" height="36" rx="4" fill="#ffffff" />
    <rect x="272" y="168" width="20" height="20" rx="2" fill="#0f172a" />
    
    <!-- QR Finder Pattern: Bottom-Left -->
    <rect x="90" y="314" width="56" height="56" rx="8" fill="#0f172a" />
    <rect x="100" y="324" width="36" height="36" rx="4" fill="#ffffff" />
    <rect x="108" y="332" width="20" height="20" rx="2" fill="#0f172a" />

    <!-- Matrix Pattern Blocks -->
    <rect x="160" y="150" width="12" height="12" fill="#0f172a" />
    <rect x="180" y="150" width="24" height="12" fill="#0f172a" />
    <rect x="220" y="150" width="12" height="12" fill="#0f172a" />
    
    <rect x="150" y="170" width="12" height="24" fill="#0f172a" />
    <rect x="170" y="180" width="24" height="12" fill="#0f172a" />
    <rect x="200" y="170" width="12" height="36" fill="#0f172a" />
    <rect x="220" y="180" width="24" height="12" fill="#0f172a" />
    
    <rect x="90" y="220" width="24" height="12" fill="#0f172a" />
    <rect x="130" y="220" width="12" height="24" fill="#0f172a" />
    <rect x="150" y="220" width="48" height="12" fill="#0f172a" />
    <rect x="220" y="210" width="12" height="24" fill="#0f172a" />
    <rect x="240" y="220" width="36" height="12" fill="#0f172a" />
    <rect x="290" y="220" width="20" height="12" fill="#0f172a" />

    <!-- Central QRIS Badge -->
    <circle cx="200" cy="260" r="28" fill="#ffffff" stroke="#b91c1c" stroke-width="2.5" />
    <text x="200" y="265" text-anchor="middle" fill="#b91c1c" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="12">QRIS</text>
    
    <rect x="90" y="250" width="12" height="36" fill="#0f172a" />
    <rect x="120" y="260" width="24" height="12" fill="#0f172a" />
    <rect x="150" y="250" width="12" height="24" fill="#0f172a" />
    <rect x="240" y="250" width="24" height="24" fill="#0f172a" />
    <rect x="280" y="250" width="30" height="12" fill="#0f172a" />
    
    <rect x="160" y="290" width="36" height="12" fill="#0f172a" />
    <rect x="210" y="290" width="24" height="12" fill="#0f172a" />
    <rect x="250" y="290" width="12" height="36" fill="#0f172a" />
    <rect x="280" y="280" width="12" height="24" fill="#0f172a" />

    <rect x="160" y="320" width="12" height="24" fill="#0f172a" />
    <rect x="180" y="330" width="36" height="12" fill="#0f172a" />
    <rect x="230" y="320" width="12" height="36" fill="#0f172a" />
    <rect x="270" y="330" width="40" height="12" fill="#0f172a" />

    <rect x="160" y="358" width="48" height="12" fill="#0f172a" />
    <rect x="220" y="358" width="24" height="12" fill="#0f172a" />
    <rect x="260" y="358" width="50" height="12" fill="#0f172a" />

    <!-- Amount Badge -->
    <rect x="50" y="405" width="300" height="38" rx="10" fill="#f1f5f9" stroke="#e2e8f0" />
    <text x="200" y="428" text-anchor="middle" fill="#0f172a" font-family="monospace" font-weight="900" font-size="14">${amountStr}</text>

    <!-- Supported Providers Footer -->
    <text x="200" y="468" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="9" letter-spacing="1">DAPAT DIGUNAKAN UNTUK SEMUA PEMBAYARAN</text>
    <text x="200" y="488" text-anchor="middle" fill="#334155" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="9">BCA • Mandiri • BRI • BNI • GoPay • OVO • DANA • ShopeePay</text>
    <text x="200" y="504" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="8">GPN (Gerbang Pembayaran Nasional)</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
