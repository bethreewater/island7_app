
import { CaseData, CaseStatus, MethodItem } from '../types';
import { METHOD_CATALOG } from '../constants';

const DB_NAME = 'ISLAND7_DB_V2'; // 更改名稱以確保資料庫完全重建
const STORE_CASES = 'cases';
const STORE_METHODS = 'methods';
const DB_VERSION = 12; // 提升版本
const LOCAL_STORAGE_KEY = 'ISLAND7_CASES_V1';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CASES)) {
        db.createObjectStore(STORE_CASES, { keyPath: 'caseId' });
      }
      if (db.objectStoreNames.contains(STORE_METHODS)) {
        db.deleteObjectStore(STORE_METHODS);
      }
      db.createObjectStore(STORE_METHODS, { keyPath: 'id' });
    };
  });
};

export const initDB = async (): Promise<void> => {
  const db = await openDB();
  
  // 強制同步方案資料庫
  const transaction = db.transaction(STORE_METHODS, 'readwrite');
  const store = transaction.objectStore(STORE_METHODS);
  
  // 先清除舊有的
  store.clear();
  
  // 重新導入所有最新方案
  for (const m of METHOD_CATALOG) {
    store.put(m);
  }

  const legacyData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (legacyData) {
    try {
      const cases: CaseData[] = JSON.parse(legacyData);
      const transCases = db.transaction(STORE_CASES, 'readwrite');
      const storeCases = transCases.objectStore(STORE_CASES);
      for (const c of cases) storeCases.put(c);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.error('Migration failed', e);
    }
  }
};

export const getCases = async (): Promise<CaseData[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CASES, 'readonly');
    const request = transaction.objectStore(STORE_CASES).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveCase = async (newCase: CaseData): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_CASES, 'readwrite');
  transaction.objectStore(STORE_CASES).put(newCase);
};

export const deleteCase = async (caseId: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_CASES, 'readwrite');
  transaction.objectStore(STORE_CASES).delete(caseId);
};

export const getMethods = async (): Promise<MethodItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_METHODS, 'readonly');
    const request = transaction.objectStore(STORE_METHODS).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveMethod = async (method: MethodItem): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_METHODS, 'readwrite');
  transaction.objectStore(STORE_METHODS).put(method);
};

export const deleteMethod = async (id: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_METHODS, 'readwrite');
  transaction.objectStore(STORE_METHODS).delete(id);
};

export const generateNewCaseId = async (clientName: string): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = clientName.replace(/[\\/:*?"<>|]/g, '');
  const cases = await getCases();
  const sequence = (cases.filter(c => c.caseId.startsWith(dateStr)).length + 1).toString().padStart(3, '0');
  return `${dateStr}-${sequence}-${safeName}`;
};

export const getInitialCase = async (clientName: string, phone: string, address: string, lineId: string = ''): Promise<CaseData> => {
  const caseId = await generateNewCaseId(clientName);
  return {
    caseId, createdDate: new Date().toISOString(), customerName: clientName, phone, lineId, address,
    status: CaseStatus.NEW, zones: [], specialNote: '', formalQuotedPrice: 0, manualPriceAdjustment: 0, finalPrice: 0,
    schedule: [], changeOrders: [], logs: [], warrantyRecords: []
  };
};
