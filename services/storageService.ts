import { supabase } from './supabaseClient';
import { CaseData, CaseStatus, MethodItem, Material, MethodRecipe } from '../types';
import { METHOD_CATALOG } from '../constants';

let dbInitialized = false;
let initPromise: Promise<void> | null = null;

const toCaseDataListItem = (row: Partial<CaseData>): CaseData => ({
  caseId: row.caseId || '',
  createdDate: row.createdDate || new Date(0).toISOString(),
  startDate: row.startDate,
  contractSignedDate: row.contractSignedDate,
  completionAcceptedDate: row.completionAcceptedDate,
  customerName: row.customerName || '',
  phone: row.phone || '',
  siteContactName: row.siteContactName,
  siteContactPhone: row.siteContactPhone,
  lineId: row.lineId,
  address: row.address,
  latitude: row.latitude,
  longitude: row.longitude,
  addressNote: row.addressNote,
  buildingContext: row.buildingContext,
  leakSymptoms: row.leakSymptoms,
  leakSourceDiagnosis: row.leakSourceDiagnosis,
  accessConstraints: row.accessConstraints,
  status: (row.status || CaseStatus.ASSESSMENT) as CaseStatus,
  zones: [],
  specialNote: row.specialNote || '',
  formalQuotedPrice: row.formalQuotedPrice || 0,
  quoteVersion: row.quoteVersion || 1,
  manualPriceAdjustment: row.manualPriceAdjustment || 0,
  depositPercentage: row.depositPercentage,
  depositReceivedDate: row.depositReceivedDate,
  finalPaymentReceivedDate: row.finalPaymentReceivedDate,
  invoiceTitle: row.invoiceTitle,
  invoiceTaxId: row.invoiceTaxId,
  paymentNote: row.paymentNote,
  finalPrice: row.finalPrice || 0,
  schedule: row.schedule || [],
  logs: [],
  warrantyRecords: row.warrantyRecords || [],
  changeOrders: [],
  isPartial: true,
});

export const initDB = async (): Promise<void> => {
  if (dbInitialized) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      // 檢查是否需要初始化方案表
      try {
        const { count, error } = await supabase.from('methods').select('*', { count: 'exact', head: true });

        if (!error && count === 0) {
          console.log('Initializing methods table...');
          const { error: insertError } = await supabase.from('methods').insert(METHOD_CATALOG);
          if (insertError) console.error('Failed to initialize methods:', insertError);
        }
        dbInitialized = true;
      } catch (err) {
        console.error('Error checking methods table:', err);
      }
    })();
  }

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
};

export const getCases = async (): Promise<CaseData[]> => {
  // Unified lightweight fetch for list views
  const { data, error } = await supabase
    .from('cases')
    .select('caseId, createdDate, contractSignedDate, customerName, phone, siteContactName, siteContactPhone, lineId, address, latitude, longitude, addressNote, buildingContext, status, finalPrice, manualPriceAdjustment, depositReceivedDate, finalPaymentReceivedDate, schedule, warrantyRecords')
    .order('createdDate', { ascending: false });

  if (error) {
    console.error('Error fetching cases:', error);
    throw error;
  }
  return (data || []).map((row) => toCaseDataListItem(row as Partial<CaseData>));
};

export const getCasesBackup = async (): Promise<CaseData[]> => {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .order('createdDate', { ascending: false });

  if (error) {
    console.error('Error fetching backup cases:', error);
    throw error;
  }

  return (data || []) as CaseData[];
};

// Paginated version for improved performance
export const getCasesPaginated = async (page: number = 1, limit: number = 20): Promise<{ data: CaseData[], hasMore: boolean, total: number }> => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data, error, count } = await supabase
    .from('cases')
    .select('caseId, createdDate, contractSignedDate, customerName, phone, siteContactName, siteContactPhone, lineId, address, latitude, longitude, addressNote, buildingContext, status, finalPrice, manualPriceAdjustment, depositReceivedDate, finalPaymentReceivedDate, schedule, warrantyRecords', { count: 'exact' })
    .order('createdDate', { ascending: false })
    .range(start, end);

  if (error) {
    console.error('Error fetching paginated cases:', error);
    throw error;
  }

  return {
    data: (data || []).map((row) => toCaseDataListItem(row as Partial<CaseData>)),
    hasMore: (count || 0) > end + 1,
    total: count || 0
  };
};

export const getCaseDetails = async (caseId: string): Promise<CaseData | null> => {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('caseId', caseId)
    .single();

  if (error) {
    console.error('Error fetching case details:', error);
    return null;
  }
  return data;
};

export const getBasicAnalytics = async (): Promise<CaseData[]> => {
  // Extremely lightweight fetch for high-speed dashboard loading
  // Excludes 'zones' which contains heavy image data
  const { data, error } = await supabase
    .from('cases')
    .select('caseId, status, finalPrice, createdDate, customerName, depositReceivedDate, finalPaymentReceivedDate, zones, logs, schedule');

  if (error) {
    console.error('Error fetching basic analytics:', error);
    throw error;
  }
  return (data || []).map((row) => ({
    caseId: row.caseId,
    createdDate: row.createdDate,
    customerName: row.customerName || '',
    phone: '',
    status: row.status,
    depositReceivedDate: row.depositReceivedDate,
    finalPaymentReceivedDate: row.finalPaymentReceivedDate,
    zones: row.zones || [],
    specialNote: '',
    formalQuotedPrice: 0,
    quoteVersion: 1,
    manualPriceAdjustment: 0,
    depositPercentage: undefined,
    paymentNote: '',
    finalPrice: row.finalPrice || 0,
    schedule: row.schedule || [],
    logs: row.logs || [],
    warrantyRecords: [],
    changeOrders: [],
  })) as CaseData[];
};

export const getCategoryStats = async (): Promise<{ finalPrice: number, category: string }[]> => {
  // Senior Optimization: 
  // We fetch 'zones' separately. Ideally we would use ->> JSON operator here like:
  // .select('finalPrice, category:zones->0->>category')
  // But to ensure compatibility without checking server version, we fetch zones here
  // but we do it asynchronously so it doesn't block the main stats.
  // 
  // Ideally: .select('finalPrice, zones->0->>category')
  // Let's try to fetch just the top level structure if possible, but 'zones' is a single column.
  // We will accept the payload penalty here BUT it runs in parallel/lazy in the UI.

  const { data, error } = await supabase
    .from('cases')
    .select('finalPrice, zones');

  if (error) {
    console.error('Error fetching category stats:', error);
    return [];
  }

  // Flatten to lightweight object
  return (data || []).map((row: any) => ({
    finalPrice: row.finalPrice,
    category: row.zones?.[0]?.category || 'Unknown'
  }));
};

export const subscribeToCases = (callback: () => void) => {
  return supabase
    .channel('cases-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cases' },
      (payload) => {
        console.log('Change received!', payload);
        callback();
      }
    )
    .subscribe();
};


export const getMaterials = async (): Promise<Material[]> => {
  const { data, error } = await supabase.from('materials').select('*');
  if (error) console.error('Error fetching materials:', error);
  return data || [];
};

export const getRecipes = async (): Promise<MethodRecipe[]> => {
  const { data, error } = await supabase.from('method_recipes').select('*, material:materials(*)');
  if (error) console.error('Error fetching recipes:', error);
  return data || [];
};


export const upsertMaterial = async (material: Material): Promise<void> => {
  const { error } = await supabase.from('materials').upsert(material);
  if (error) {
    console.error('Error saving material:', error);
    throw error;
  }
};

export const deleteMaterial = async (id: string): Promise<void> => {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) {
    console.error('Error deleting material:', error);
    throw error;
  }
};


export const upsertRecipe = async (recipe: MethodRecipe): Promise<void> => {
  // Remove join fields before saving
  const { material, ...cleanRecipe } = recipe;
  const { error } = await supabase.from('method_recipes').upsert(cleanRecipe);
  if (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
};

export const deleteRecipe = async (id: string): Promise<void> => {
  const { error } = await supabase.from('method_recipes').delete().eq('id', id);
  if (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
};

export const saveCase = async (newCase: CaseData): Promise<void> => {
  const { isPartial, ...payload } = newCase;
  const { error } = await supabase.from('cases').upsert(payload);
  if (error) {
    console.error('Error saving case:', error);
    throw error;
  }
};

const extractCasePhotoPaths = (detail: CaseData): string[] => {
  const imageUrls = new Set<string>();

  (detail.zones || []).forEach((zone) => {
    (zone.items || []).forEach((item) => {
      (item.photos || []).forEach((url) => {
        if (url) imageUrls.add(url);
      });
    });
  });

  (detail.logs || []).forEach((log) => {
    [...(log.beforePhotos || []), ...(log.afterPhotos || []), ...(log.photos || [])].forEach((url) => {
      if (url) imageUrls.add(url);
    });
  });

  return Array.from(imageUrls)
    .map((url) => {
      const marker = '/case-photos/';
      const idx = url.indexOf(marker);
      return idx >= 0 ? url.slice(idx + marker.length) : null;
    })
    .filter((path): path is string => Boolean(path));
};

export const deleteCase = async (caseId: string): Promise<void> => {
  let cleanedByBackend = false;
  try {
    const { error } = await supabase.functions.invoke('delete-case-assets', {
      body: { caseId },
    });
    if (!error) {
      cleanedByBackend = true;
    }
  } catch {
    // Ignore invoke errors and fallback to client-side cleanup.
  }

  if (!cleanedByBackend) {
    try {
      const detail = await getCaseDetails(caseId);
      if (detail) {
        const filePaths = extractCasePhotoPaths(detail);
        if (filePaths.length) {
          const { error: storageError } = await supabase.storage.from('case-photos').remove(filePaths);
          if (storageError) {
            console.warn('Failed to cleanup case photos:', storageError);
          }
        }
      }
    } catch (cleanupError) {
      console.warn('Case image cleanup skipped:', cleanupError);
    }
  }

  const { error } = await supabase.from('cases').delete().eq('caseId', caseId);
  if (error) {
    console.error('Error deleting case:', error);
    throw error;
  }
};

export const getCasePhotoPaths = async (caseId: string): Promise<string[]> => {
  const detail = await getCaseDetails(caseId);
  if (!detail) return [];
  return extractCasePhotoPaths(detail);
};

export const getMethods = async (): Promise<MethodItem[]> => {
  const { data, error } = await supabase.from('methods').select('*');
  if (error) {
    console.error('Error fetching methods:', error);
    return [];
  }
  return data || [];
};

export const saveMethod = async (method: MethodItem): Promise<void> => {
  const { error } = await supabase.from('methods').upsert(method);
  if (error) {
    console.error('Error saving method:', error);
    throw error;
  }
};

export const deleteMethod = async (id: string): Promise<void> => {
  const { error } = await supabase.from('methods').delete().eq('id', id);
  if (error) {
    console.error('Error deleting method:', error);
    throw error;
  }
};

export const generateNewCaseId = (clientName: string): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = clientName.replace(/[\\/:*?"<>|]/g, '');
  const timePart = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EVAL-${dateStr}-${timePart}-${randomPart}-${safeName}`;
};

export const generateFormalId = (clientName: string): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = clientName.replace(/[\\/:*?"<>|]/g, '');
  const timePart = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${dateStr}-${timePart}-${randomPart}-${safeName}`;
};

export const formalizeCase = async (oldCase: CaseData): Promise<CaseData> => {
  const newId = generateFormalId(oldCase.customerName);

  const { data, error } = await supabase
    .from('cases')
    .update({
      caseId: newId,
      status: CaseStatus.DEPOSIT_RECEIVED,
      depositReceivedDate: oldCase.depositReceivedDate || new Date().toISOString().slice(0, 10),
      formalQuotedPrice: oldCase.formalQuotedPrice || oldCase.finalPrice,
      depositPercentage: 0.7,
    })
    .eq('caseId', oldCase.caseId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error formalizing case:', error);
    throw new Error('案件轉正失敗，請稍後再試');
  }

  return data as CaseData;
};

export const getInitialCase = async (clientName: string, phone: string, address: string, lineId: string = ''): Promise<CaseData> => {
  const caseId = generateNewCaseId(clientName);
  return {
    caseId,
    createdDate: new Date().toISOString(),
    customerName: clientName,
    phone,
    siteContactName: clientName,
    siteContactPhone: phone,
    lineId,
    address,
    buildingContext: '',
    leakSymptoms: '',
    leakSourceDiagnosis: '',
    accessConstraints: '',
    status: CaseStatus.ASSESSMENT,
    zones: [],
    specialNote: '',
    formalQuotedPrice: 0,
    quoteVersion: 1,
    manualPriceAdjustment: 0,
    depositPercentage: 0.7,
    invoiceTitle: clientName,
    invoiceTaxId: '',
    paymentNote: '',
    finalPrice: 0,
    schedule: [],
    changeOrders: [],
    logs: [],
    warrantyRecords: []
  };
};

export const uploadImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('case-photos')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('case-photos')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
