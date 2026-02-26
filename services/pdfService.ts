
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CaseData, ServiceCategory, Zone, WarrantyType, MethodItem } from '../types';
import { METHOD_CATALOG } from '../constants';
import { getMaterials, getRecipes, getMethods } from './storageService';

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
  doc.addFont(fontFileName, "NotoSansTC", "bold");
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

const ensurePageSpace = (doc: jsPDF, currentY: number, neededHeight: number, nextPageStartY: number = 20) => {
  const pageHeight = doc.internal.pageSize.height;
  const bottomLimit = pageHeight - 25;
  if (currentY + neededHeight > bottomLimit) {
    doc.addPage();
    return nextPageStartY;
  }
  return currentY;
};

const writeWrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 5
) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
};

const getZoneSubtotal = (zone: Zone): number =>
  (zone.items || []).reduce((sum, item) => sum + (item.itemPrice || 0), 0);

const getZoneTotalArea = (zone: Zone): number =>
  (zone.items || []).reduce((sum, item) => sum + (item.areaPing || 0), 0);

// Database methods cache for PDF generation
let dbMethodsCache: MethodItem[] | null = null;
let dbMethodsCacheTime = 0;
const DB_CACHE_TTL = 30000; // 30 seconds

const loadDbMethods = async (): Promise<MethodItem[]> => {
  const now = Date.now();
  if (dbMethodsCache && (now - dbMethodsCacheTime) < DB_CACHE_TTL) {
    return dbMethodsCache;
  }
  try {
    const methods = await getMethods();
    if (methods && methods.length > 0) {
      dbMethodsCache = methods;
      dbMethodsCacheTime = now;
      return methods;
    }
  } catch (e) {
    console.warn('Failed to load methods from DB, falling back to catalog', e);
  }
  return METHOD_CATALOG;
};

const getMethodById = (methodId: string, methods?: MethodItem[]) => {
  const source = methods || dbMethodsCache || METHOD_CATALOG;
  return source.find((m) => m.id === methodId);
};

const getZoneWorkflowSteps = (zone: Zone, methods?: MethodItem[]) => getMethodById(zone.methodId, methods)?.steps || [];

const getProjectDurationDays = (data: CaseData) => {
  if (data.schedule?.length) {
    const dates = data.schedule.map((task) => task.date).sort();
    if (dates.length) {
      const first = new Date(dates[0]);
      const last = new Date(dates[dates.length - 1]);
      const diff = Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(diff, 1);
    }
  }

  const estimated = (data.zones || []).reduce((sum, zone) => {
    const method = getMethodById(zone.methodId);
    return sum + (method?.estimatedDays || 0);
  }, 0);
  return Math.max(estimated, 1);
};

const CATEGORY_MATERIAL_RULES: Record<ServiceCategory, string> = {
  [ServiceCategory.WALL_CANCER]: "基層清除後使用抗鹼/抗霉體系，批土與面漆依原廠建議厚度施作。",
  [ServiceCategory.WALL_WATERPROOF]: "外牆防水採底塗+面塗系統，需在乾燥基面施工並完成收邊防護。",
  [ServiceCategory.ROOF_WATERPROOF]: "屋頂防水層分層施作，含底塗、主防水層與保護層，確保搭接完整。",
  [ServiceCategory.CRACK]: "裂縫處理依寬度採封縫或灌注工法，材料需達結構或彈性修補要求。",
  [ServiceCategory.STRUCTURE]: "結構修復先除鏽與界面處理，再以高強度修補砂漿分層補強。",
  [ServiceCategory.SILICONE_BATH]: "浴室矽利康需完整除舊膠與清潔後施打，固化期內避免接觸水氣。",
  [ServiceCategory.SILICONE_WINDOW]: "門窗矽利康施作前完成接縫清潔，採中性耐候膠並確保連續性。",
  [ServiceCategory.CUSTOM]: "自定義工程依雙方確認之材料規格與施工說明執行。",
};

const CATEGORY_WARRANTY_RULES: Record<ServiceCategory, string> = {
  [ServiceCategory.WALL_CANCER]: "壁癌修繕：保固 12 個月，限本次施作區域。",
  [ServiceCategory.WALL_WATERPROOF]: "外牆防水：保固 24 個月，限本次施作區域與收邊範圍。",
  [ServiceCategory.ROOF_WATERPROOF]: "頂樓防水：保固 24 個月，限本次施作防水層範圍。",
  [ServiceCategory.CRACK]: "裂縫修補：保固 12 個月，僅限本次修補裂縫。",
  [ServiceCategory.STRUCTURE]: "結構補強：保固 12 個月，限本次補強構件。",
  [ServiceCategory.SILICONE_BATH]: "浴室矽利康：保固 12 個月，正常使用條件下適用。",
  [ServiceCategory.SILICONE_WINDOW]: "門窗矽利康：保固 12 個月，正常使用條件下適用。",
  [ServiceCategory.CUSTOM]: "自定義工程：依報價單與雙方約定之保固條款。",
};

const getCategoryList = (data: CaseData): ServiceCategory[] => {
  const unique = new Set<ServiceCategory>();
  (data.zones || []).forEach((zone) => unique.add(zone.category as ServiceCategory));
  return Array.from(unique);
};

const getWarrantyClauses = (data: CaseData): string[] => {
  const categories = getCategoryList(data);
  if (!categories.length) return ["保固條件依雙方簽署文件為準。"];
  return categories.map((category) => CATEGORY_WARRANTY_RULES[category] || "保固條件依雙方簽署文件為準。");
};

// Dynamic warranty text from MethodItem warranty fields
const getMethodWarrantyText = (
  warrantyType?: WarrantyType,
  warrantyMonths?: number,
  warrantyVisits?: number
): string => {
  const type = warrantyType || 'leak_handled';
  const months = warrantyMonths ?? 12;

  if (type === 'leak_ignored') {
    return '不處理漏水源：不提供保固';
  }

  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  let durationText = '';
  if (years > 0 && remainMonths > 0) {
    durationText = `${years} 年 ${remainMonths} 個月`;
  } else if (years > 0) {
    durationText = `${years} 年`;
  } else {
    durationText = `${remainMonths} 個月`;
  }

  if (type === 'leak_unhandled') {
    const visits = warrantyVisits ?? 1;
    return `無法處理漏水源：${durationText} ${visits} 次保固`;
  }

  return `有處理漏水源：${durationText}保固`;
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
    const blobUrl = doc.output('bloburl');
    const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!previewWindow) {
      // Mobile browsers may block popup, fallback to file download to avoid "nothing happens"
      doc.save(filename);
    }
  } else {
    doc.save(filename);
  }
};

// 1. EVALUATION REPORT PDF
export const generateEvaluationPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);

  setupDocument(doc, "EVALUATION REPORT", "現勘評估報告");

  // Pre-load methods from database
  const dbMethods = await loadDbMethods();

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
    currentY = ensurePageSpace(doc, currentY, 30);

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

    currentY += 6;

    // Workflow section for process transparency
    const workflowSteps = getZoneWorkflowSteps(zone, dbMethods);
    if (workflowSteps.length) {
      currentY = ensurePageSpace(doc, currentY, 14 + workflowSteps.length * 8);
      doc.setFillColor(245, 247, 250);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(9);
      doc.text("施作流程 / WORKFLOW", 16, currentY + 5.5);
      currentY += 10;

      workflowSteps.forEach((step, stepIndex) => {
        currentY = ensurePageSpace(doc, currentY, 10);
        const line = `${stepIndex + 1}. ${step.name} | ${step.description} (Prep ${step.prepMinutes}m / Exec ${step.execMinutes}m)`;
        currentY = writeWrappedText(doc, line, 18, currentY + 4.5, 174, 5);
      });
      currentY += 4;
    }
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

// 2. FORMAL QUOTATION PDF
export const generateQuotationPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);

  setupDocument(doc, "FORMAL QUOTATION", "正式報價單");

  const displayId = getDisplayCaseId(data.caseId, data.customerName);

  // Pre-load methods from database
  const dbMethods = await loadDbMethods();

  const baseSubtotal = (data.zones || []).reduce((sum, zone) => sum + getZoneSubtotal(zone), 0);
  const adjustment = data.manualPriceAdjustment || 0;
  const total = data.finalPrice || (baseSubtotal + adjustment);
  const projectDays = getProjectDurationDays(data);

  doc.setFontSize(10);
  doc.text(`報價單號 / QUOTE NO: ${displayId}`, 14, 45);
  doc.text(`客戶名稱 / CLIENT: ${data.customerName}`, 14, 51);
  doc.text(`聯絡電話 / PHONE: ${data.phone || '-'}`, 14, 57);
  doc.text(`工程地址 / ADDRESS: ${data.address || '-'}`, 14, 63);
  doc.text(`建立日期 / DATE: ${formatDate(data.createdDate)}`, 120, 45);
  doc.text(`預估工期 / DURATION: 約 ${projectDays} 天`, 120, 51);

  const detailRows = (data.zones || []).map((zone, index) => {
    const methodDisplay = getMethodDisplayName(zone.methodId, zone.methodName);
    const area = getZoneTotalArea(zone);
    const qty = (zone.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
    const measure = area > 0
      ? `${area.toFixed(2)} 坪`
      : `${qty || '-'} ${zone.unit || ''}`.trim();

    return [
      `${index + 1}. ${zone.zoneName || `區域 ${index + 1}`}`,
      methodDisplay,
      measure,
      formatCurrency(zone.unitPrice || 0),
      formatCurrency(getZoneSubtotal(zone)),
    ];
  });

  autoTable(doc, {
    startY: 72,
    head: [['區域 ZONE', '工法 METHOD', '數量 QTY', '單價 PRICE', '小計 SUBTOTAL']],
    body: detailRows.length ? detailRows : [['-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, font: "NotoSansTC" },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, font: "NotoSansTC", fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 45 },
      2: { cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 },
    },
  });

  let y = ((doc as any).lastAutoTable?.finalY || 120) + 8;
  y = ensurePageSpace(doc, y, 30);

  doc.setFillColor(246, 248, 251);
  doc.rect(14, y, 182, 18, 'F');
  doc.setFontSize(12);
  doc.text(`專案總費用 TOTAL: ${formatCurrency(total)}`, 18, y + 12);
  y += 24;

  // ========== SECTION 1: 施工流程區 / CONSTRUCTION WORKFLOW ==========
  y = ensurePageSpace(doc, y, 18);
  doc.setFontSize(11);
  doc.text("施工流程 / CONSTRUCTION WORKFLOW", 14, y);
  y += 6;
  doc.setLineWidth(0.2);
  doc.line(14, y, 196, y);
  y += 4;

  (data.zones || []).forEach((zone, index) => {
    const steps = getZoneWorkflowSteps(zone, dbMethods);
    y = ensurePageSpace(doc, y, 14 + steps.length * 7);

    // Zone header
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    y = writeWrappedText(
      doc,
      `> ${zone.zoneName || `區域 ${index + 1}`} / ${getMethodDisplayName(zone.methodId, zone.methodName)}`,
      16,
      y + 4.5,
      178,
      5
    );

    // Steps as numbered list
    if (steps.length) {
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      steps.forEach((step, i) => {
        y = ensurePageSpace(doc, y, 8);
        y = writeWrappedText(
          doc,
          `  ${i + 1}. ${step.name} - ${step.description}`,
          20,
          y + 3,
          172,
          5
        );
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      y = writeWrappedText(doc, "  依現場評估流程執行", 20, y + 3, 172, 5);
    }
    doc.setTextColor(30, 30, 30);
    y += 3;
  });
  y += 2;

  // ========== SECTION 2: 品牌材料與特色區 / BRAND MATERIALS & FEATURES ==========
  y = ensurePageSpace(doc, y, 22);
  doc.setFontSize(11);
  doc.text("品牌材料與特色 / BRAND MATERIALS & FEATURES", 14, y);
  y += 6;
  doc.line(14, y, 196, y);
  y += 4;

  // Load recipes + materials for brand info
  let allRecipes: any[] = [];
  let allMaterials: any[] = [];
  try {
    [allRecipes, allMaterials] = await Promise.all([getRecipes(), getMaterials()]);
  } catch (e) {
    console.warn('Failed to load recipes/materials for PDF', e);
  }

  const usedMethodIds = new Set((data.zones || []).map(z => z.methodId));
  const relevantRecipes = allRecipes.filter(r => usedMethodIds.has(r.methodId));
  const relevantMatIds = new Set(relevantRecipes.map(r => r.materialId));

  // Filter: exclude 其他 (personnel costs etc.) and group by display category
  const EXCLUDED_CATEGORIES = ['其他'];
  const EXCLUDED_NAMES = ['人事費用'];
  const relevantMaterials = allMaterials
    .filter((m: any) => relevantMatIds.has(m.id))
    .filter((m: any) => !EXCLUDED_CATEGORIES.includes(m.category))
    .filter((m: any) => !EXCLUDED_NAMES.includes(m.name));

  // Map categories to display groups
  const CATEGORY_GROUP_MAP: Record<string, string> = {
    '塗料': '防水塗料',
    '防水材': '防水材',
    '泥作/結構': '防水材',
    '填縫/矽利康': '防水材',
    '工具/設備': '工具',
    '其他耗材': '耗材',
  };

  // Group materials
  const grouped: Record<string, any[]> = {};
  relevantMaterials.forEach((m: any) => {
    const groupName = CATEGORY_GROUP_MAP[m.category] || m.category || '其他材料';
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(m);
  });

  const groupOrder = ['防水塗料', '防水材', '工具', '耗材'];
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ia = groupOrder.indexOf(a);
    const ib = groupOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  if (sortedGroups.length > 0) {
    sortedGroups.forEach((groupName) => {
      y = ensurePageSpace(doc, y, 16);
      doc.setFontSize(9);
      doc.text(`[ ${groupName} ]`, 16, y + 4);
      y += 6;

      const matRows = grouped[groupName].map((m: any) => [
        m.brand || '-',
        m.name,
      ]);

      autoTable(doc, {
        startY: y,
        head: [['品牌 BRAND', '材料 MATERIAL']],
        body: matRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, font: "NotoSansTC" },
        headStyles: { fillColor: [60, 60, 60], textColor: 255, font: "NotoSansTC", fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 40 },
        },
      });
      y = ((doc as any).lastAutoTable?.finalY || y + 10) + 3;
    });
  }

  // Material usage rules (feature descriptions)
  getCategoryList(data).forEach((category) => {
    const rule = CATEGORY_MATERIAL_RULES[category] || "依雙方確認材料規格與施作規則執行。";
    y = ensurePageSpace(doc, y, 10);
    doc.setFontSize(9);
    y = writeWrappedText(doc, `- ${category}: ${rule}`, 16, y + 4.5, 178, 5);
  });
  y += 4;

  // ========== SECTION 3: 保固說明區 / WARRANTY TERMS ==========
  y = ensurePageSpace(doc, y, 30);
  doc.setFontSize(11);
  doc.text("保固說明 / WARRANTY TERMS", 14, y);
  y += 6;
  doc.line(14, y, 196, y);
  y += 4;

  // Dynamic warranty per zone/method
  const warrantyLines: string[] = [];
  (data.zones || []).forEach((zone, index) => {
    const method = getMethodById(zone.methodId, dbMethods);
    const zoneName = zone.zoneName || `區域 ${index + 1}`;
    if (method) {
      const warrantyText = getMethodWarrantyText(
        method.warrantyType,
        method.warrantyMonths,
        method.warrantyVisits
      );
      warrantyLines.push(`- ${zoneName} (${zone.methodName}): ${warrantyText}`);
    } else {
      // Fallback to category-based warranty
      const catWarranty = CATEGORY_WARRANTY_RULES[zone.category as ServiceCategory];
      warrantyLines.push(`- ${zoneName}: ${catWarranty || '保固條件依雙方簽署文件為準。'}`);
    }
  });

  if (warrantyLines.length === 0) {
    warrantyLines.push("- 保固條件依雙方簽署文件為準。");
  }

  // Add exclusions
  warrantyLines.push("- 保固排除: 天災、結構新增裂縫、第三方施工破壞、人為不當使用。");
  warrantyLines.push("- 報價有效期 30 日, 逾期需重新確認材料與工資成本。");
  warrantyLines.push("- 未列入報價項目 (如隱蔽管線、結構損傷擴大、第三方修復) 屬追加範圍。");

  doc.setFontSize(9);
  warrantyLines.forEach((line) => {
    y = ensurePageSpace(doc, y, 10);
    y = writeWrappedText(doc, line, 16, y + 4.5, 178, 5);
  });

  // Signature section
  y = ensurePageSpace(doc, y + 8, 26);
  doc.setFontSize(10);
  doc.text("雙方簽名確認 / SIGNATURES", 14, y);
  y += 18;
  doc.setLineWidth(0.2);
  doc.line(14, y, 90, y);
  doc.text("業主簽名 / Client", 14, y + 5);
  doc.line(110, y, 190, y);
  doc.text("承攬方簽名 / Contractor", 110, y + 5);

  drawFooter(doc);
  outputPDF(doc, `QUOTATION_${displayId}.pdf`, mode);
};

// 3. CONTRACT PDF
export const generateContractPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);

  // Pre-load methods from database
  const dbMethods = await loadDbMethods();

  setupDocument(doc, "SERVICE CONTRACT", "工程承攬合約書");

  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  const baseSubtotal = (data.zones || []).reduce((sum, zone) => sum + getZoneSubtotal(zone), 0);
  const adjustment = data.manualPriceAdjustment || 0;
  const total = data.finalPrice || (baseSubtotal + adjustment);
  const projectDays = getProjectDurationDays(data);
  const startDate = data.startDate ? formatDate(data.startDate) : "待雙方確認";
  const expectedEndDate = data.startDate
    ? formatDate(new Date(new Date(data.startDate).getTime() + (projectDays - 1) * 24 * 60 * 60 * 1000).toISOString())
    : "依排程確認";

  let y = 45;
  doc.setFontSize(10);
  doc.text("甲方 (業主) / CLIENT", 14, y);
  doc.text(`${data.customerName}`, 14, y + 6);
  doc.text(`地址 / ADDRESS: ${data.address || '-'}`, 14, y + 12);
  doc.text(`電話 / PHONE: ${data.phone || '-'}`, 14, y + 18);

  doc.text("乙方 (承攬) / CONTRACTOR", 110, y);
  doc.text(`${COMPANY_NAME}`, 110, y + 6);
  doc.text(`${COMPANY_ID}`, 110, y + 12);
  doc.text(`合約編號 / CONTRACT NO: ${displayId}`, 110, y + 18);

  y = 72;
  doc.setFontSize(11);
  doc.text("一、工程範圍（與評估表一致） / SCOPE", 14, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    head: [['區域', '工法', '施作內容']],
    body: (data.zones || []).map((zone, index) => {
      const steps = getZoneWorkflowSteps(zone, dbMethods).map((step) => step.name).join(" -> ") || "依現勘評估內容";
      return [
        `${index + 1}. ${zone.zoneName || `區域 ${index + 1}`}`,
        getMethodDisplayName(zone.methodId, zone.methodName),
        steps,
      ];
    }),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, font: "NotoSansTC" },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, font: "NotoSansTC", fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35 },
    },
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 40) + 8;
  y = ensurePageSpace(doc, y, 30);
  doc.setFontSize(11);
  doc.text("二、工程總價與工期 / PRICE & SCHEDULE", 14, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 5;
  doc.setFontSize(10);
  y = writeWrappedText(doc, `1) 合約總價：${formatCurrency(total)}（含稅）`, 16, y, 178, 5);
  y = writeWrappedText(doc, `2) 預定工期：約 ${projectDays} 天，預定開工 ${startDate}，預定完工 ${expectedEndDate}。`, 16, y, 178, 5);
  y = writeWrappedText(doc, `3) 付款：訂金 70%（${formatCurrency(Math.round(total * 0.7))}），尾款 30%（${formatCurrency(Math.round(total * 0.3))}）。`, 16, y, 178, 5);

  y += 4;
  y = ensurePageSpace(doc, y, 40);
  doc.setFontSize(11);
  doc.text("三、驗收標準與保固 / ACCEPTANCE & WARRANTY", 14, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 5;

  // Dynamic warranty per zone
  const contractWarrantyLines: string[] = [
    "1) 驗收標準：施工區域完成後應達無明顯滲漏、鼓起、剝落；表面平整且收邊完整。",
    "2) 驗收程序：甲乙雙方現場共同點交，未完成項目由乙方限期改善。",
  ];

  (data.zones || []).forEach((zone, index) => {
    const method = getMethodById(zone.methodId, dbMethods);
    const zoneName = zone.zoneName || `區域 ${index + 1}`;
    if (method) {
      const warrantyText = getMethodWarrantyText(
        method.warrantyType,
        method.warrantyMonths,
        method.warrantyVisits
      );
      contractWarrantyLines.push(`${contractWarrantyLines.length + 1}) ${zoneName} (${zone.methodName}): ${warrantyText}`);
    } else {
      const catWarranty = CATEGORY_WARRANTY_RULES[zone.category as ServiceCategory];
      contractWarrantyLines.push(`${contractWarrantyLines.length + 1}) ${catWarranty || '保固條件依雙方簽署文件為準。'}`);
    }
  });

  contractWarrantyLines.push(`${contractWarrantyLines.length + 1}) 保固排除: 天災、結構新增裂縫、第三方施工破壞、人為不當使用、未按建議保養者。`);

  contractWarrantyLines.forEach((line) => {
    y = ensurePageSpace(doc, y, 10);
    y = writeWrappedText(doc, line, 16, y, 178, 5);
  });

  y += 4;
  y = ensurePageSpace(doc, y, 45);
  doc.setFontSize(11);
  doc.text("四、權利義務、毀約與爭議 / RIGHTS, BREACH & JURISDICTION", 14, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 5;
  const legalTerms = [
    "1) 甲方應提供施工必要之作業空間與用電用水，並依約支付工程款。",
    "2) 乙方應依估價與工法流程施工，確保施工安全與品質。",
    "3) 任一方違約致契約無法履行，應賠償對方因此所受損害。",
    "4) 因不可抗力致工期延誤，雙方應另行書面協調展延。",
    "5) 爭議處理：雙方先行協商；協商不成，以臺灣臺北地方法院為第一審管轄法院。",
    `6) 其他約定：${data.specialNote || "無"}`,
  ];
  legalTerms.forEach((line) => {
    y = ensurePageSpace(doc, y, 10);
    y = writeWrappedText(doc, line, 16, y, 178, 5);
  });

  y = ensurePageSpace(doc, y + 10, 30);
  doc.setFontSize(10);
  doc.text("立合約書人簽署 / SIGNATURES", 14, y);
  y += 18;
  doc.setLineWidth(0.2);
  doc.line(14, y, 90, y);
  doc.text("甲方簽章 (Client)", 14, y + 5);
  doc.line(110, y, 190, y);
  doc.text("乙方簽章 (Contractor)", 110, y + 5);

  drawFooter(doc);
  outputPDF(doc, `CONTRACT_${displayId}.pdf`, mode);
};

// 4. INVOICE PDF
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
    headStyles: { fillColor: [50, 50, 50], textColor: 255, font: "NotoSansTC", fontStyle: "bold" },
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
