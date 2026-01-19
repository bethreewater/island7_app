import { supabase } from './supabaseClient';
import { CaseData, CaseStatus, MethodItem, Material, MethodRecipe } from '../types';
import { METHOD_CATALOG } from '../constants';

const LOCAL_STORAGE_KEY = 'ISLAND7_CASES_V1';

let dbInitialized = false;

export const initDB = async (): Promise<void> => {
  if (dbInitialized) return;

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
};

export const getCases = async (): Promise<CaseData[]> => {
  // Unified fetch for App-level caching (includes zones for DataCenter)
  const { data, error } = await supabase
    .from('cases')
    .select('caseId, createdDate, customerName, phone, lineId, address, latitude, longitude, addressNote, status, finalPrice, manualPriceAdjustment');

  if (error) {
    console.error('Error fetching cases:', error);
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
    .select('caseId, createdDate, customerName, phone, lineId, address, latitude, longitude, addressNote, status, finalPrice, manualPriceAdjustment', { count: 'exact' })
    .order('createdDate', { ascending: false })
    .range(start, end);

  if (error) {
    console.error('Error fetching paginated cases:', error);
    throw error;
  }

  return {
    data: (data || []) as CaseData[],
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
    .select('caseId, status, finalPrice, createdDate');

  if (error) {
    console.error('Error fetching basic analytics:', error);
    throw error;
  }
  return (data || []) as CaseData[];
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
  const { error } = await supabase.from('cases').upsert(newCase);
  if (error) {
    console.error('Error saving case:', error);
    throw error;
  }
};

export const deleteCase = async (caseId: string): Promise<void> => {
  const { error } = await supabase.from('cases').delete().eq('caseId', caseId);
  if (error) {
    console.error('Error deleting case:', error);
    throw error;
  }
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

export const generateNewCaseId = async (clientName: string): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = clientName.replace(/[\\/:*?"<>|]/g, '');

  // Generate EVALUATION ID (EVAL-YYYYMMDD-SEQ)
  // Count existing evaluations for today
  const { count, error } = await supabase
    .from('cases')
    .select('caseId', { count: 'exact', head: true })
    .ilike('caseId', `EVAL-${dateStr}%`);

  if (error) {
    console.error('Error counting cases for ID generation:', error);
    throw new Error('無法生成案件 ID');
  }

  const currentCount = count || 0;
  const sequence = (currentCount + 1).toString().padStart(3, '0');
  return `EVAL-${dateStr}-${sequence}-${safeName}`;
};

export const generateFormalId = async (clientName: string): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = clientName.replace(/[\\/:*?"<>|]/g, '');

  // Generate FORMAL PROJECT ID (YYYYMMDD-SEQ)
  // Exclude EVAL IDs
  const { count, error } = await supabase
    .from('cases')
    .select('caseId', { count: 'exact', head: true })
    .ilike('caseId', `${dateStr}%`)
    .not('caseId', 'ilike', 'EVAL%');

  if (error) {
    console.error('Error counting cases for Formal ID generation:', error);
    throw new Error('無法生成正式編號');
  }

  const currentCount = count || 0;
  const sequence = (currentCount + 1).toString().padStart(3, '0');
  return `${dateStr}-${sequence}-${safeName}`;
};

export const formalizeCase = async (oldCase: CaseData): Promise<CaseData> => {
  // 1. Generate new Formal ID
  const newId = await generateFormalId(oldCase.customerName);

  // 2. Create new case object with new ID and promoted status
  const newCase: CaseData = {
    ...oldCase,
    caseId: newId,
    status: CaseStatus.DEPOSIT_RECEIVED // Ensure status is set
  };

  // 3. Save new case
  await saveCase(newCase);

  // 4. Delete old case (EVAL)
  await deleteCase(oldCase.caseId);

  return newCase;
};

export const getInitialCase = async (clientName: string, phone: string, address: string, lineId: string = ''): Promise<CaseData> => {
  const caseId = await generateNewCaseId(clientName);
  return {
    caseId,
    createdDate: new Date().toISOString(),
    customerName: clientName,
    phone,
    lineId,
    address,
    status: CaseStatus.NEW,
    zones: [],
    specialNote: '',
    formalQuotedPrice: 0,
    manualPriceAdjustment: 0,
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
