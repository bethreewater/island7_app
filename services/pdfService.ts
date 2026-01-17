
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CaseData } from '../types';
import { METHOD_CATALOG } from '../constants';

const COMPANY_NAME = "海島七號工程 / ISLAND NO. 7 ENGINEERING";
const COMPANY_ID = "統一編號 / VAT: XXXXXXXX";

// --- FONT LOADER with IndexedDB Caching ---
// Uses locally hosted Noto Sans TC (TTF) for maximum reliability and compatibility.
// Downloaded from Google Fonts (Android UA) to ensure TTF format.
const FONT_URL = '/fonts/NotoSansTC-Regular.ttf';
const DB_NAME = 'Island7_Assets';
const STORE_NAME = 'fonts';
const FONT_KEY = 'NotoSansTC_Local_v1'; // Changed key to force re-download from local

let loadingPromise: Promise<void> | null = null;
let fontCache: string | null = null;

// IndexedDB Helper
const getFontFromDB = (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(FONT_KEY);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
};

const saveFontToDB = (base64: string): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(base64, FONT_KEY);
      tx.oncomplete = () => resolve();
    };
  });
};

// Main Load Function (Singleton Pattern)
const loadFont = async (doc: jsPDF) => {
  try {
    // 1. Check Memory Cache
    if (fontCache) {
      addFontToDoc(doc, fontCache);
      return;
    }

    // 2. Check IndexedDB
    if (!loadingPromise) {
      loadingPromise = (async () => {
        const dbFont = await getFontFromDB();
        if (dbFont) {
          fontCache = dbFont;
          console.log("Font loaded from IndexedDB.");
          return;
        }

        // 3. Fetch from Network (Local Server)
        console.log("Fetching font from Local Server:", FONT_URL);
        const response = await fetch(FONT_URL);
        if (!response.ok) throw new Error(`Failed to load font: ${response.statusText}`);

        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        if (!base64 || base64.length < 100) throw new Error("Invalid font data");

        fontCache = base64;
        saveFontToDB(base64).catch(e => console.warn("Failed to cache font", e));
      })();
    }

    await loadingPromise;
    if (fontCache) {
      addFontToDoc(doc, fontCache);
    }
  } catch (e) {
    console.warn("Font loading failed", e);
    // Silent fail for preload
    loadingPromise = null;
  }
};

const addFontToDoc = (doc: jsPDF, base64: string) => {
  const fontFileName = "NotoSansTC-Regular.ttf";
  if (!doc.existsFileInVFS(fontFileName)) {
    doc.addFileToVFS(fontFileName, base64);
  }
  doc.addFont(fontFileName, "NotoSansTC", "normal");
  doc.setFont("NotoSansTC");
};

export const preloadFont = () => {
  if (!fontCache && !loadingPromise) {
    loadFont({
      addFileToVFS: () => { },
      addFont: () => { },
      setFont: () => { },
      existsFileInVFS: () => false
    } as any);
  }
};

// Helper: Blob to Base64 (Efficient)
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data:font/*;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to format currency
const formatCurrency = (num: number) => {
  return `NT$${Math.round(num).toLocaleString()}`;
};

// Helper to format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Helper to get English Method Name
const getMethodDisplayName = (id: string, originalName: string) => {
  const method = METHOD_CATALOG.find(m => m.id === id);
  // Prioritize the name stored in the Case Data (originalName), which reflects User selection/edit.
  // Only append English name from catalog.
  return method ? `${originalName} ${method.englishName}` : originalName;
};

// Helper: Generate Display ID (Updates suffix if client name changes)
const getDisplayCaseId = (caseId: string, clientName: string) => {
  // Format: YYYYMMDD-SEQ-NAME
  const parts = caseId.split('-');
  if (parts.length >= 3) {
    // Keep Date and Seq, replace Name with current clientName
    return `${parts[0]}-${parts[1]}-${clientName}`;
  }
  return caseId;
};

// ============================================================================
// PDF STYLING - BILINGUAL & ROBUST
// ============================================================================

const setupDocument = (doc: jsPDF, titleEn: string, titleZh: string) => {
  // Pure Black Header
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setFont("NotoSansTC"); // Ensure font is set

  // Title - White Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(`${titleZh} ${titleEn}`, 14, 20);

  // Subtitle
  doc.setFontSize(9);
  doc.text("海島七號工程管理系統 | ISLAND NO. 7 ENGINEERING SYSTEM", 14, 28);

  // Reset for Body
  doc.setTextColor(30, 30, 30);
  doc.setFillColor(255, 255, 255);
};

const drawFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("NotoSansTC");
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 15, 196, pageHeight - 15);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`${COMPANY_NAME}`, 14, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, 196, pageHeight - 10, { align: 'right' });
  }
};

// Helper to handle PDF output
const outputPDF = (doc: jsPDF, filename: string, mode: 'save' | 'preview') => {
  if (mode === 'preview') {
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(filename);
  }
};

// 1. EVALUATION REPORT PDF
export const generateEvaluationPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);

  setupDocument(doc, "EVALUATION REPORT", "現勘評估報告");

  // Client Info Grid
  doc.setFontSize(10);
  doc.text("客戶資料 / CLIENT INFO", 14, 45);
  doc.setLineWidth(0.1);
  doc.line(14, 47, 196, 47);

  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  doc.text(`案件編號 / CASE ID: ${displayId}`, 14, 55);
  doc.text(`客戶姓名 / CLIENT: ${data.customerName}`, 14, 61);
  doc.text(`建立日期 / DATE: ${formatDate(data.createdDate)}`, 110, 55);
  doc.text(`工程地址 / ADDRESS: ${data.address}`, 110, 61);

  let currentY = 70;

  for (let zIndex = 0; zIndex < data.zones.length; zIndex++) {
    const zone = data.zones[zIndex];
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // Zone Header
    doc.setFillColor(248, 248, 248);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const methodDisplay = getMethodDisplayName(zone.methodId, zone.methodName);
    doc.text(`區域 ${zIndex + 1}: ${zone.zoneName}  |  ${methodDisplay}`, 16, currentY + 5.5);

    currentY += 10;

    // Headers
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(50, 50, 50);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.text('項次 / NO.', 16, currentY + 5.5);
    doc.text('規格 / SPEC', 36, currentY + 5.5);
    doc.text('坪數 / AREA', 110, currentY + 5.5);
    doc.text('價格 / PRICE', 194, currentY + 5.5, { align: 'right' });
    currentY += 8;

    // Items
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);

    zone.items.forEach((item, iIndex) => {
      const hasPhotos = item.photos && item.photos.length > 0;
      let neededHeight = 10;
      if (hasPhotos) {
        const photoRows = Math.ceil(item.photos!.length / 4);
        neededHeight += (photoRows * 45) + 5;
      }

      if (currentY + neededHeight > 270) {
        doc.addPage();
        currentY = 20;
        doc.setFillColor(50, 50, 50);
        doc.setTextColor(255, 255, 255);
        doc.rect(14, currentY, 182, 8, 'F');
        doc.text('項次 / NO.', 16, currentY + 5.5);
        doc.text('規格 / SPEC', 36, currentY + 5.5);
        doc.text('坪數 / AREA', 110, currentY + 5.5);
        doc.text('價格 / PRICE', 194, currentY + 5.5, { align: 'right' });
        doc.setTextColor(30, 30, 30);
        currentY += 8;
      }

      // Zebra
      if (iIndex % 2 === 1) {
        doc.setFillColor(245, 245, 245);
        doc.rect(14, currentY, 182, 8, 'F');
      }

      const dimStr = item.quantity && item.quantity > 0
        ? `${item.quantity} ${zone.unit === '式' ? 'SET' : zone.unit === '米' ? 'M' : 'UNIT'}`
        : `L:${item.length} x W:${item.width} (${item.areaPing} P)`;

      doc.text(`#${iIndex + 1}`, 16, currentY + 5.5);
      doc.text(dimStr, 36, currentY + 5.5);

      const areaStr = item.areaPing > 0 ? `${item.areaPing} 坪` : '-';
      doc.text(areaStr, 110, currentY + 5.5);

      doc.text(formatCurrency(item.itemPrice), 194, currentY + 5.5, { align: 'right' });

      currentY += 8;

      if (hasPhotos) {
        let xOffset = 20;
        const imgWidth = 40;
        const imgHeight = 40;
        const gap = 5;

        item.photos!.forEach((photo, pIdx) => {
          if (pIdx > 0 && pIdx % 4 === 0) {
            currentY += imgHeight + 5;
            xOffset = 20;
          }
          // Placeholder rect
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(xOffset, currentY, imgWidth, imgHeight);

          try {
            doc.addImage(photo, 'JPEG', xOffset, currentY, imgWidth, imgHeight);
          } catch (e) {
            console.warn("Image add fail", e);
          }
          xOffset += imgWidth + gap;
        });
        currentY += imgHeight + 5;
      }
      // Divider
      doc.setDrawColor(230, 230, 230);
      doc.line(14, currentY, 196, currentY);
    });

    currentY += 5;
  }

  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, 196, currentY);

  doc.setFontSize(14);
  doc.text(`總金額 / TOTAL: ${formatCurrency(data.finalPrice)}`, 196, currentY + 10, { align: 'right' });

  drawFooter(doc);
  outputPDF(doc, `EVALUATION_${displayId}.pdf`, mode);
};

// 2. CONTRACT PDF
export const generateContractPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);

  setupDocument(doc, "SERVICE CONTRACT", "工程承攬合約書");

  const startY = 45;
  doc.setFontSize(10);

  doc.text("甲方 (業主) / CLIENT:", 14, startY);
  doc.text(`${data.customerName}`, 14, startY + 6);
  doc.text(`地址: ${data.address}`, 14, startY + 12);
  doc.text(`電話: ${data.phone}`, 14, startY + 18);

  doc.text("乙方 (承攬) / CONTRACTOR:", 110, startY);
  doc.text(`${COMPANY_NAME}`, 110, startY + 6);
  doc.text(`${COMPANY_ID}`, 110, startY + 12);

  let y = 80;
  doc.setFontSize(12);
  doc.text("合約條款 / TERMS AND CONDITIONS", 14, y);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 196, y + 2);

  y += 10;
  doc.setFontSize(10);

  const terms = [
    "一、 工程範圍：詳如附件「現勘評估報告」。(Scope of Work: As per Evaluation Report)",
    `二、 合約總價：${formatCurrency(data.finalPrice)} (含稅)。(Total Amount: Tax Included)`,
    "三、 付款方式 (Payment Schedule)：",
    `    1. 訂金 (70%)：${formatCurrency(Math.round(data.finalPrice * 0.7))}，簽約時支付。`,
    `    2. 尾款 (30%)：${formatCurrency(Math.round(data.finalPrice * 0.3))}，完工驗收後支付。`,
    "四、 保固期限 (Warranty)：",
    "    - 防水工程：保固兩年 (Waterproofing: 2 Years)",
    "    - 結構補強：保固一年 (Structural: 1 Year)",
    "五、 附註 (Notes)：",
    `    ${data.specialNote || '無 (None)'}`
  ];

  terms.forEach(term => {
    doc.text(term, 14, y);
    y += 8;
  });

  y += 30;
  doc.text("立合約書人簽署 / SIGNATURES", 14, y);

  y += 30;
  doc.setLineWidth(0.2);
  doc.line(14, y, 90, y);
  doc.text("甲方簽章 (Client)", 14, y + 5);

  doc.line(110, y, 190, y);
  doc.text("乙方簽章 (Contractor)", 110, y + 5);

  drawFooter(doc);
  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  outputPDF(doc, `CONTRACT_${displayId}.pdf`, mode);
};

// 3. INVOICE PDF
export const generateInvoicePDF = async (data: CaseData, type: 'DEPOSIT' | 'FINAL', mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);

  const titleEn = type === 'DEPOSIT' ? "DEPOSIT PAYMENT REQUEST" : "FINAL PAYMENT REQUEST";
  const titleZh = type === 'DEPOSIT' ? "頭期款請款單" : "尾款請款單";

  setupDocument(doc, titleEn, titleZh);

  const total = data.finalPrice;
  const deposit = Math.round(total * 0.7);
  const final = Math.round(total * 0.3);

  doc.setFillColor(245, 245, 245);
  doc.rect(14, 45, 182, 25, 'F');

  doc.setFontSize(10);
  doc.text(`客戶名稱 / BILL TO: ${data.customerName}`, 20, 55);
  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  doc.text(`案件編號 / CASE NO: ${displayId}`, 20, 62);
  doc.text(`開立日期 / DATE: ${formatDate(new Date().toISOString())}`, 120, 55);

  let tableBody = [];
  if (type === 'DEPOSIT') {
    tableBody = [
      ['工程總價 / TOTAL PROJECT VALUE', formatCurrency(total)],
      ['本次請款: 訂金 (70%) / DEPOSIT DUE', formatCurrency(deposit)],
      ['( 餘額待完工驗收後支付 / Balance upon completion )', formatCurrency(final)]
    ];
  } else {
    tableBody = [
      ['工程總價 / TOTAL PROJECT VALUE', formatCurrency(total)],
      ['已付訂金 / LESS: DEPOSIT PAID', `-${formatCurrency(deposit)}`],
      ['本次請款: 尾款 (30%) / FINAL PAYMENT DUE', formatCurrency(final)]
    ];
  }

  autoTable(doc, {
    startY: 80,
    head: [['項目說明 / DESCRIPTION', '金額 / AMOUNT (TWD)']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 11, cellPadding: 8, font: "NotoSansTC" },
    headStyles: { fillColor: [50, 50, 50], textColor: 255 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });

  const bankY = 160;
  doc.text("匯款資訊 / PAYMENT DETAILS", 14, bankY);
  doc.setLineWidth(0.5);
  doc.line(14, bankY + 2, 60, bankY + 2);

  doc.setFontSize(10);
  doc.text("銀行代碼: 822 (中國信託)", 14, bankY + 12);
  doc.text("銀行帳號: 1234-5678-9012-3456", 14, bankY + 18);
  doc.text(`戶名: ${COMPANY_NAME}`, 14, bankY + 24);

  drawFooter(doc);
  outputPDF(doc, `INVOICE_${type}_${displayId}.pdf`, mode);
};
