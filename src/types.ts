export interface WifiPackage {
  id: string;
  name: string;
  speed: string;
  price: number;
  features: string[];
  type: 'home' | 'business';
  popular?: boolean;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  status: 'unpaid' | 'pending_verification' | 'paid';
  proofOfPaymentUrl?: string;
  billingPeriod: string;
  method?: string;
  transactionId?: string;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  coordinates: [number, number]; // [latitude, longitude]
  packageId: string;
  status: 'pending' | 'active' | 'suspended';
  ktpImageUrl?: string;
  payments: PaymentRecord[];
  tickets?: SupportTicket[];
  createdAt: string;
  passwordResetRequested?: boolean;
  resetRequestedAt?: string;
  resetToken?: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  userName: string;
  email: string;
  phone: string;
  message: string;
  date: string;
  status: 'open' | 'resolved';
}

export interface AppConfig {
  appScriptUrl: string;
  whatsappToken: string;
  whatsappPhone: string;
  paymentGatewayKey: string;
}

export interface CompanySettings {
  name: string;
  legalName?: string;
  tagline?: string;
  address: string;
  logoText: string;
  themeColor: string;
  logoUrl?: string;
  coverageText?: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  email?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  promos?: string[];
  qrisUrl?: string;
  qrisMerchantName?: string;
  qrisNmid?: string;
  qrisAutoVerify?: boolean;
  qrisInstructions?: string;
}
