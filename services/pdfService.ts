
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { CaseData } from '../types';
import { METHOD_CATALOG } from '../constants';

const COMPANY_NAME = "ISLAND NO. 7 ENGINEERING";
const COMPANY_ID = "VAT: XXXXXXXX";

// Helper to format currency
const formatCurrency = (num: number) => {
  return `TWD $${Math.round(num).toLocaleString()}`;
};

// Helper to format date
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
};

// Helper to get English Method Name
const getEnglishMethodName = (id: string, originalName: string) => {
  const method = METHOD_CATALOG.find(m => m.id === id);
  return method ? method.englishName : originalName;
};

// ============================================================================
// PDF STYLING - MINIMALIST FASHION (BLACK & WHITE)
// ============================================================================

const setupDocument = (doc: jsPDF, title: string) => {
  // Pure Black Header
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 210, 40, 'F');

  // Title - White Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 14, 25);

  // Subtitle
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text("ISLAND NO. 7 ENGINEERING | PROFESSIONAL SOLUTIONS", 14, 32);

  // Reset for Body
  doc.setTextColor(0, 0, 0);
};

const drawFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 15, 196, pageHeight - 15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${COMPANY_NAME}`, 14, pageHeight - 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, 196, pageHeight - 10, { align: 'right' });
  }
};

// 1. EVALUATION REPORT PDF (WITH PHOTOS)
export const generateEvaluationPDF = (data: CaseData) => {
  const doc = new jsPDF();

  setupDocument(doc, "Evaluation Report");

  // Client Info Grid
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("CLIENT INFO", 14, 50);
  doc.setLineWidth(0.1);
  doc.line(14, 52, 196, 52);

  doc.setFont('helvetica', 'normal');
  doc.text(`CASE ID: ${data.caseId}`, 14, 60);
  doc.text(`CLIENT: ${data.customerName}`, 14, 66);
  doc.text(`DATE: ${formatDate(data.createdDate)}`, 110, 60);
  doc.text(`ADDRESS: ${data.address}`, 110, 66);

  let currentY = 75;

  data.zones.forEach((zone, zIndex) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // Zone Header
    doc.setFillColor(245, 245, 245);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const methodEn = getEnglishMethodName(zone.methodId, zone.methodName);
    doc.text(`ZONE ${zIndex + 1}: ${zone.zoneName}  |  ${methodEn}`, 16, currentY + 5.5);

    currentY += 10;

    // Items Table (已移除 Quantity 欄位，尺寸改為 cm)
    const tableBody = zone.items.map((item, iIndex) => {
      const dimStr = `L:${item.length}cm x W:${item.width}cm`;
      return [
        `#${iIndex + 1}`,
        dimStr,
        `${item.areaPing} PING`,
        formatCurrency(item.itemPrice)
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['ITEM', 'DIMENSIONS', 'CALCULATED AREA', 'EST. PRICE']],
      body: tableBody,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 70 },
        2: { cellWidth: 50 },
        3: { halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 10;

    // --- PHOTO GRID LOGIC ---
    const photos = zone.items.flatMap(item => item.photos || []);
    if (photos.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text("SITE PHOTOS", 14, currentY - 2);

      const imgWidth = 40;
      const imgHeight = 40;
      const gap = 5;
      let xOffset = 14;

      photos.forEach((photoBase64, pIdx) => {
        if (currentY + imgHeight > 280) {
          doc.addPage();
          currentY = 20;
          xOffset = 14;
        }

        try {
          doc.addImage(photoBase64, 'JPEG', xOffset, currentY, imgWidth, imgHeight);
          doc.setDrawColor(230, 230, 230);
          doc.rect(xOffset, currentY, imgWidth, imgHeight);
        } catch (e) {
          console.warn("Could not add image to PDF", e);
        }

        xOffset += imgWidth + gap;
        if ((pIdx + 1) % 4 === 0) {
          xOffset = 14;
          currentY += imgHeight + gap;
        }
      });
      currentY += (photos.length % 4 !== 0) ? imgHeight + 15 : 15;
    } else {
      currentY += 5;
    }
  });

  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, 196, currentY);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`ESTIMATED TOTAL: ${formatCurrency(data.finalPrice)}`, 196, currentY + 10, { align: 'right' });

  drawFooter(doc);
  doc.save(`EVALUATION_${data.caseId}.pdf`);
};

// 2. CONTRACT PDF (保持原有邏輯)
export const generateContractPDF = (data: CaseData) => {
  const doc = new jsPDF();
  setupDocument(doc, "Service Contract");

  const startY = 50;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text("BETWEEN:", 14, startY);
  doc.setFont('helvetica', 'bold');
  doc.text(`CLIENT: ${data.customerName}`, 14, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Address: ${data.address}`, 14, startY + 11);
  doc.text(`Phone: ${data.phone}`, 14, startY + 16);

  doc.text("AND:", 110, startY);
  doc.setFont('helvetica', 'bold');
  doc.text(`PROVIDER: ${COMPANY_NAME}`, 110, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${COMPANY_ID}`, 110, startY + 11);

  let y = 80;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("TERMS AND CONDITIONS", 14, y);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 196, y + 2);

  y += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const terms = [
    "1. SCOPE OF WORK: As detailed in the attached Evaluation Report.",
    `2. TOTAL AMOUNT: ${formatCurrency(data.finalPrice)} (Tax Included).`,
    "3. PAYMENT SCHEDULE:",
    `   - Deposit (70%): ${formatCurrency(data.finalPrice * 0.7)} due upon signing.`,
    `   - Final Payment (30%): ${formatCurrency(data.finalPrice * 0.3)} due upon completion.`,
    "4. WARRANTY:",
    "   - Waterproofing: 2 Years.",
    "   - Structural Repair: 1 Year.",
    "5. FORCE MAJEURE: Timeline subject to weather conditions.",
    `6. NOTES: ${data.specialNote || 'N/A'}`
  ];

  terms.forEach(term => {
    doc.text(term, 14, y);
    y += 8;
  });

  y += 30;
  doc.setFont('helvetica', 'bold');
  doc.text("SIGNATURES", 14, y);

  y += 30;
  doc.setLineWidth(0.2);
  doc.line(14, y, 90, y);
  doc.text("Client Signature", 14, y + 5);

  doc.line(110, y, 190, y);
  doc.text("Provider Signature", 110, y + 5);

  drawFooter(doc);
  doc.save(`CONTRACT_${data.caseId}.pdf`);
};

// 3. INVOICE PDF
export const generateInvoicePDF = (data: CaseData) => {
  const doc = new jsPDF();
  setupDocument(doc, "Invoice / Quotation");

  const firstPayment = Math.round(data.finalPrice * 0.7);

  doc.setFillColor(250, 250, 250);
  doc.rect(14, 45, 182, 25, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`BILL TO: ${data.customerName}`, 20, 55);
  doc.text(`CASE NO: ${data.caseId}`, 20, 62);
  doc.text(`DATE: ${formatDate(new Date().toISOString())}`, 120, 55);

  autoTable(doc, {
    startY: 80,
    head: [['DESCRIPTION', 'AMOUNT (TWD)']],
    body: [
      ['TOTAL PROJECT VALUE', formatCurrency(data.finalPrice)],
      ['DEPOSIT (70%) - DUE NOW', formatCurrency(firstPayment)],
      ['FINAL PAYMENT (30%) - DUE LATER', formatCurrency(data.finalPrice * 0.3)],
    ],
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 8, font: 'helvetica' },
    headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' }
    }
  });

  const bankY = 160;
  doc.setFont('helvetica', 'bold');
  doc.text("PAYMENT DETAILS", 14, bankY);
  doc.setLineWidth(0.5);
  doc.line(14, bankY + 2, 60, bankY + 2);

  doc.setFont('helvetica', 'normal');
  doc.text("Bank Name: 000 (Example Bank)", 14, bankY + 12);
  doc.text("Account No: 1234-5678-9012-3456", 14, bankY + 18);
  doc.text(`Account Name: ${COMPANY_NAME}`, 14, bankY + 24);

  drawFooter(doc);
  doc.save(`INVOICE_${data.caseId}.pdf`);
};
