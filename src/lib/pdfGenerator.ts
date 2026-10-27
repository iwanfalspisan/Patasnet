import { jsPDF } from 'jspdf';
import { CustomerUser, SupportTicket } from '../types';
import { PACKAGES } from '../components/Home';

export function generateCustomerPDFReport(user: CustomerUser, tickets: SupportTicket[] = []) {
  const doc = new jsPDF();
  const userPkg = PACKAGES.find((p) => p.id === user.packageId) || { name: 'Unknown', speed: 'N/A', price: 0 };

  // Draw header border
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 40, 'F');

  // Header Content
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('PATAS NET WIFI', 15, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Laporan Bulanan & Riwayat Layanan Pelanggan', 15, 30);
  doc.text(`ID Pelanggan: ${user.id}`, 155, 20);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 155, 26);

  // Bill To Section
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI PERSONAL PELANGGAN', 15, 55);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Nama Lengkap   : ${user.name}`, 15, 63);
  doc.text(`Alamat Email   : ${user.email}`, 15, 69);
  doc.text(`No. Handphone  : ${user.phone}`, 15, 75);
  doc.text(`Alamat Pasang  : ${user.address}`, 15, 81);
  if (user.coordinates) {
    doc.text(`Titik Koordinat: ${user.coordinates[0].toFixed(6)}, ${user.coordinates[1].toFixed(6)}`, 15, 87);
  } else {
    doc.text(`Titik Koordinat: N/A`, 15, 87);
  }

  // Network stats mockup for the monthly report
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('IKHTISAR PENGGUNAAN DATA & LAYANAN', 15, 100);

  // Draw box for stats
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 105, 180, 28, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Paket Wifi Aktif    : ${userPkg.name}`, 20, 112);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bandwidth Internet  : ${userPkg.speed}`, 20, 118);
  doc.text(`SLA Ketersediaan    : 99.9% (Sangat Stabil)`, 20, 124);
  doc.text(`Total Konsumsi Data : 412.5 GB (True Unlimited - Tanpa FUP)`, 20, 130);

  // Billing Details Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RINCIAN TAGIHAN & RIWAYAT PEMBAYARAN', 15, 145);

  // Draw table headers
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 150, 180, 8, 'F');
  doc.setFontSize(8.5);
  doc.text('Periode', 18, 155);
  doc.text('Jumlah', 55, 155);
  doc.text('Metode', 90, 155);
  doc.text('ID Transaksi', 125, 155);
  doc.text('Status', 170, 155);

  let yOffset = 164;
  doc.setFont('helvetica', 'normal');
  (user.payments || []).forEach((pm) => {
    if (yOffset > 270) {
      doc.addPage();
      yOffset = 20;
    }
    doc.text(pm.billingPeriod, 18, yOffset);
    doc.text(`Rp ${pm.amount.toLocaleString('id-ID')}`, 55, yOffset);
    doc.text(pm.method?.toUpperCase() || 'QRIS', 90, yOffset);
    doc.text(pm.transactionId || 'N/A', 125, yOffset);
    
    // Status text colors
    if (pm.status === 'paid') {
      doc.setTextColor(16, 185, 129); // Green
      doc.text('LUNAS', 170, yOffset);
    } else if (pm.status === 'pending_verification') {
      doc.setTextColor(245, 158, 11); // Amber
      doc.text('VERIFIKASI', 170, yOffset);
    } else {
      doc.setTextColor(239, 68, 68); // Red
      doc.text('BELUM BAYAR', 170, yOffset);
    }
    doc.setTextColor(71, 85, 105);
    yOffset += 8;
  });

  // Service History Table
  yOffset += 10;
  if (yOffset > 240) {
    doc.addPage();
    yOffset = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('RIWAYAT TIKET GANGGUAN / DUKUNGAN TEKNIS', 15, yOffset);
  yOffset += 5;

  // Draw table headers
  doc.setFillColor(241, 245, 249);
  doc.rect(15, yOffset, 180, 8, 'F');
  doc.setFontSize(8.5);
  doc.text('ID Tiket', 18, yOffset + 5);
  doc.text('Tanggal Lapor', 45, yOffset + 5);
  doc.text('Pesan Keluhan', 80, yOffset + 5);
  doc.text('Status', 170, yOffset + 5);
  yOffset += 13;

  doc.setFont('helvetica', 'normal');
  const userTickets = tickets.length > 0 ? tickets : (user.tickets || []);
  if (userTickets.length === 0) {
    doc.text('Tidak ada catatan keluhan teknis / laporan gangguan.', 18, yOffset);
    yOffset += 8;
  } else {
    userTickets.forEach((t) => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(t.id, 18, yOffset);
      doc.text(t.date.split(' ')[0], 45, yOffset);
      
      // Truncate message if too long
      const msg = t.message.length > 45 ? t.message.substring(0, 45) + '...' : t.message;
      doc.text(msg, 80, yOffset);

      if (t.status === 'resolved') {
        doc.setTextColor(16, 185, 129);
        doc.text('SELESAI', 170, yOffset);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.text('AKTIF', 170, yOffset);
      }
      doc.setTextColor(71, 85, 105);
      yOffset += 8;
    });
  }

  // Footer info
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Dokumen laporan ini diterbitkan secara otomatis oleh sistem administrasi terpadu PATAS NET WIFI.', 15, 280);
  doc.text('Segala bentuk data yang tercantum bersifat rahasia dan sah bagi pelanggan terdaftar.', 15, 285);

  doc.save(`Laporan_Bulanan_PatasNet_${user.name.replace(/\s+/g, '_')}_${user.id}.pdf`);
}
