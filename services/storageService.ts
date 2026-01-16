import { supabase } from './supabaseClient';
import { CaseData, CaseStatus, MethodItem } from '../types';
import { METHOD_CATALOG } from '../constants';

const LOCAL_STORAGE_KEY = 'ISLAND7_CASES_V1';

export const initDB = async (): Promise<void> => {
  // 檢查是否需要初始化方案表
  try {
    const { count, error } = await supabase.from('methods').select('*', { count: 'exact', head: true });

    if (!error && count === 0) {
      console.log('Initializing methods table...');
      const { error: insertError } = await supabase.from('methods').insert(METHOD_CATALOG);
      if (insertError) console.error('Failed to initialize methods:', insertError);
    }
  } catch (err) {
    console.error('Error checking methods table:', err);
  }


  /* 移民邏輯移除 */
};

export const getCases = async (): Promise<CaseData[]> => {
  const { data, error } = await supabase.from('cases').select('*');
  if (error) {
    console.error('Error fetching cases:', error);
    throw error; // Throw error to be caught by UI
  }
  return data || [];
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

  // 使用 Supabase 過濾查詢來計算當日的案件數，避免一次拉取所有資料
  const { count, error } = await supabase
    .from('cases')
    .select('caseId', { count: 'exact', head: true })
    .ilike('caseId', `${dateStr}%`);

  if (error) {
    console.error('Error counting cases for ID generation:', error);
    throw new Error('無法生成案件 ID');
  }

  const currentCount = count || 0;
  const sequence = (currentCount + 1).toString().padStart(3, '0');
  return `${dateStr}-${sequence}-${safeName}`;
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
