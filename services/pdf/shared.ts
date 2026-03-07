import jsPDF from 'jspdf';
import { CaseData, MethodItem, ServiceCategory, WarrantyType, Zone } from '../../types';
import { METHOD_CATALOG } from '../../constants';
import { getMethods } from '../storageService';

export const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || '海島七號工程 / ISLAND NO. 7 ENGINEERING';
export const COMPANY_ID = `統一編號 / VAT: ${import.meta.env.VITE_COMPANY_VAT || 'N/A'}`;
export const BANK_CODE = import.meta.env.VITE_COMPANY_BANK_CODE || 'N/A';
export const BANK_NAME = import.meta.env.VITE_COMPANY_BANK_NAME || 'N/A';
export const BANK_ACCOUNT = import.meta.env.VITE_COMPANY_BANK_ACCOUNT || 'N/A';

const FONT_URL = '/fonts/NotoSansTC-Regular.ttf';
const DB_NAME = 'Island7_Assets';
const STORE_NAME = 'fonts';
const FONT_KEY = 'NotoSansTC_Local_v1';

let loadingPromise: Promise<void> | null = null;
let fontCache: string | null = null;

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

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const addFontToDoc = (doc: jsPDF, base64: string) => {
  const fontFileName = 'NotoSansTC-Regular.ttf';
  if (!doc.existsFileInVFS(fontFileName)) {
    doc.addFileToVFS(fontFileName, base64);
  }
  doc.addFont(fontFileName, 'NotoSansTC', 'normal');
  doc.addFont(fontFileName, 'NotoSansTC', 'bold');
  doc.setFont('NotoSansTC');
};

export const loadFont = async (doc: jsPDF) => {
  try {
    if (fontCache) {
      addFontToDoc(doc, fontCache);
      return;
    }

    if (!loadingPromise) {
      loadingPromise = (async () => {
        const dbFont = await getFontFromDB();
        if (dbFont) {
          fontCache = dbFont;
          return;
        }

        const response = await fetch(FONT_URL);
        if (!response.ok) throw new Error(`Failed to load font: ${response.statusText}`);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        if (!base64 || base64.length < 100) throw new Error('Invalid font data');
        fontCache = base64;
        saveFontToDB(base64).catch((e) => console.warn('Failed to cache font', e));
      })();
    }

    await loadingPromise;
    if (fontCache) {
      addFontToDoc(doc, fontCache);
    }
  } catch (e) {
    console.warn('Font loading failed', e);
    loadingPromise = null;
  }
};

export const preloadFont = () => {
  if (!fontCache && !loadingPromise) {
    loadFont({
      addFileToVFS: () => {},
      addFont: () => {},
      setFont: () => {},
      existsFileInVFS: () => false,
    } as any);
  }
};

export const formatCurrency = (num: number) => `NT$${Math.round(num).toLocaleString()}`;

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const PDF_THEME = {
  headerBg: [22, 26, 33] as const,
  brandAccent: [10, 120, 164] as const,
  textMain: [30, 30, 30] as const,
  textSub: [100, 100, 100] as const,
  line: [205, 212, 218] as const,
  surface: [246, 248, 251] as const,
};

export const drawProjectMeta = (doc: jsPDF, data: CaseData, startY: number) => {
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_THEME.textMain);
  doc.text(`現場聯絡 / SITE CONTACT: ${data.siteContactName || data.customerName || '-'}`, 14, startY);
  doc.text(`現場電話 / SITE PHONE: ${data.siteContactPhone || data.phone || '-'}`, 14, startY + 6);
  doc.text(`建物資訊 / BUILDING: ${data.buildingContext || '-'}`, 110, startY);
  doc.text(`地址備註 / ACCESS: ${data.addressNote || data.accessConstraints || '-'}`, 110, startY + 6);
  return startY + 12;
};

export const getMethodDisplayName = (id: string, originalName: string) => {
  const method = METHOD_CATALOG.find((m) => m.id === id);
  return method ? `${originalName} ${method.englishName}` : originalName;
};

export const getDisplayCaseId = (caseId: string, clientName: string) => {
  const parts = caseId.split('-');
  if (parts.length >= 3) {
    return `${parts[0]}-${parts[1]}-${clientName}`;
  }
  return caseId;
};

export const ensurePageSpace = (doc: jsPDF, currentY: number, neededHeight: number, nextPageStartY: number = 20) => {
  const pageHeight = doc.internal.pageSize.height;
  const bottomLimit = pageHeight - 25;
  if (currentY + neededHeight > bottomLimit) {
    doc.addPage();
    return nextPageStartY;
  }
  return currentY;
};

export const writeWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
};

export const truncateTextToWidth = (doc: jsPDF, text: string, maxWidth: number) => {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  const suffix = '...';
  let trimmed = text;
  while (trimmed.length > 0 && doc.getTextWidth(`${trimmed}${suffix}`) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}${suffix}`;
};

export const getZoneSubtotal = (zone: Zone): number =>
  (zone.items || []).reduce((sum, item) => sum + (item.itemPrice || 0), 0);

export const getZoneTotalArea = (zone: Zone): number =>
  (zone.items || []).reduce((sum, item) => sum + (item.areaPing || 0), 0);

let dbMethodsCache: MethodItem[] | null = null;
let dbMethodsCacheTime = 0;
const DB_CACHE_TTL = 5000;

const imageDataUrlCache = new Map<string, string>();

export const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  if (!url) return null;
  const cached = imageDataUrlCache.get(url);
  if (cached) return cached;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to convert image to data URL'));
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    imageDataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch (error) {
    console.warn('Image fetch failed:', error);
    return null;
  }
};

export const loadDbMethods = async (): Promise<MethodItem[]> => {
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

export const getMethodById = (methodId: string, methods?: MethodItem[]) => {
  const source = methods || dbMethodsCache || METHOD_CATALOG;
  return source.find((m) => m.id === methodId);
};

export const getZoneWorkflowSteps = (zone: Zone, methods?: MethodItem[]) => getMethodById(zone.methodId, methods)?.steps || [];

export const getProjectDurationDays = (data: CaseData) => {
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

export const CATEGORY_MATERIAL_RULES: Record<ServiceCategory, string> = {
  [ServiceCategory.WALL_CANCER]: '基層清除後使用抗鹼/抗霉體系，批土與面漆依原廠建議厚度施作。',
  [ServiceCategory.WALL_WATERPROOF]: '外牆防水採底塗+面塗系統，需在乾燥基面施工並完成收邊防護。',
  [ServiceCategory.ROOF_WATERPROOF]: '屋頂防水層分層施作，含底塗、主防水層與保護層，確保搭接完整。',
  [ServiceCategory.CRACK]: '裂縫處理依寬度採封縫或灌注工法，材料需達結構或彈性修補要求。',
  [ServiceCategory.STRUCTURE]: '結構修復先除鏽與界面處理，再以高強度修補砂漿分層補強。',
  [ServiceCategory.SILICONE_BATH]: '浴室矽利康需完整除舊膠與清潔後施打，固化期內避免接觸水氣。',
  [ServiceCategory.SILICONE_WINDOW]: '門窗矽利康施作前完成接縫清潔，採中性耐候膠並確保連續性。',
  [ServiceCategory.CUSTOM]: '自定義工程依雙方確認之材料規格與施工說明執行。',
};

export const CATEGORY_WARRANTY_RULES: Record<ServiceCategory, string> = {
  [ServiceCategory.WALL_CANCER]: '壁癌修繕：保固 12 個月，限本次施作區域。',
  [ServiceCategory.WALL_WATERPROOF]: '外牆防水：保固 24 個月，限本次施作區域與收邊範圍。',
  [ServiceCategory.ROOF_WATERPROOF]: '頂樓防水：保固 24 個月，限本次施作防水層範圍。',
  [ServiceCategory.CRACK]: '裂縫修補：保固 12 個月，僅限本次修補裂縫。',
  [ServiceCategory.STRUCTURE]: '結構補強：保固 12 個月，限本次補強構件。',
  [ServiceCategory.SILICONE_BATH]: '浴室矽利康：保固 12 個月，正常使用條件下適用。',
  [ServiceCategory.SILICONE_WINDOW]: '門窗矽利康：保固 12 個月，正常使用條件下適用。',
  [ServiceCategory.CUSTOM]: '自定義工程：依報價單與雙方約定之保固條款。',
};

export const getCategoryList = (data: CaseData): ServiceCategory[] => {
  const unique = new Set<ServiceCategory>();
  (data.zones || []).forEach((zone) => unique.add(zone.category as ServiceCategory));
  return Array.from(unique);
};

export const getWarrantyClauses = (data: CaseData): string[] => {
  const categories = getCategoryList(data);
  if (!categories.length) return ['保固條件依雙方簽署文件為準。'];
  return categories.map((category) => CATEGORY_WARRANTY_RULES[category] || '保固條件依雙方簽署文件為準。');
};

export const getMethodWarrantyText = (
  warrantyType?: WarrantyType,
  warrantyMonths?: number,
  warrantyVisits?: number,
  warrantyIgnoredText?: string,
): string => {
  const type = warrantyType || 'leak_handled';
  const months = warrantyMonths ?? 12;

  if (type === 'leak_ignored') {
    return `不處理漏水源：${warrantyIgnoredText || '不提供保固'}`;
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

export const resolveMethodWarrantyByType = (method: MethodItem, type: WarrantyType) => {
  if (type === 'leak_unhandled') {
    return {
      months: method.warrantyUnhandledMonths ?? method.warrantyMonths,
      visits: method.warrantyUnhandledVisits ?? method.warrantyVisits,
      ignoredText: method.warrantyIgnoredText,
    };
  }

  if (type === 'leak_ignored') {
    return {
      months: undefined,
      visits: undefined,
      ignoredText: method.warrantyIgnoredText,
    };
  }

  return {
    months: method.warrantyHandledMonths ?? method.warrantyMonths,
    visits: method.warrantyVisits,
    ignoredText: method.warrantyIgnoredText,
  };
};

export const drawSectionHeader = (doc: jsPDF, title: string, y: number) => {
  doc.setFontSize(11);
  doc.setTextColor(...PDF_THEME.textMain);
  doc.text(title, 14, y);
  doc.setDrawColor(...PDF_THEME.line);
  doc.setLineWidth(0.35);
  doc.line(14, y + 3, 196, y + 3);
  return y + 8;
};

export const drawSignatureBlock = (doc: jsPDF, y: number, title: string, leftLabel: string, rightLabel: string) => {
  doc.setFontSize(10);
  doc.setTextColor(...PDF_THEME.textMain);
  doc.text(title, 14, y);
  const lineY = y + 18;
  doc.setDrawColor(...PDF_THEME.line);
  doc.setLineWidth(0.25);
  doc.line(14, lineY, 90, lineY);
  doc.text(leftLabel, 14, lineY + 5);
  doc.line(110, lineY, 190, lineY);
  doc.text(rightLabel, 110, lineY + 5);
};

export const setupDocument = (doc: jsPDF, titleEn: string, titleZh: string) => {
  doc.setFillColor(...PDF_THEME.headerBg);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setFillColor(...PDF_THEME.brandAccent);
  doc.rect(0, 35, 210, 2, 'F');
  doc.setFont('NotoSansTC');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(`${titleZh} ${titleEn}`, 14, 20);
  doc.setFontSize(9);
  doc.text('海島七號工程管理系統 | ISLAND NO. 7 ENGINEERING SYSTEM', 14, 28);
  doc.setTextColor(...PDF_THEME.textMain);
  doc.setFillColor(255, 255, 255);
};

export const drawFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('NotoSansTC');
    doc.setDrawColor(...PDF_THEME.line);
    doc.setLineWidth(0.4);
    doc.line(14, pageHeight - 15, 196, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.textSub);
    doc.text(`${COMPANY_NAME}`, 14, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, 196, pageHeight - 10, { align: 'right' });
  }
};

export const outputPDF = (doc: jsPDF, filename: string, mode: 'save' | 'preview') => {
  if (mode === 'preview') {
    const blobUrl = doc.output('bloburl');
    const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!previewWindow) {
      doc.save(filename);
    }
  } else {
    doc.save(filename);
  }
};
