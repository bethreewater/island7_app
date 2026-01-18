

export enum CaseStatus {
  // New Stages
  ASSESSMENT = 'assessment',        // 現場評估 (初始)
  DEPOSIT_RECEIVED = 'deposit',     // 收到訂金
  PLANNING = 'planning',            // 行程規劃/備料
  CONSTRUCTION = 'construction',    // 施工中
  FINAL_PAYMENT = 'final_payment',  // 請領尾款
  COMPLETED = 'completed',          // 完工驗收
  WARRANTY = 'warranty',            // 保固期

  // Legacy (Mapped for compatibility)
  NEW = 'new',
  PROGRESS = 'progress',
  DONE = 'done'
}

export const STATUS_LABELS: Record<CaseStatus | string, string> = {
  [CaseStatus.ASSESSMENT]: '現場評估',
  [CaseStatus.DEPOSIT_RECEIVED]: '收到訂金',
  [CaseStatus.PLANNING]: '行程規劃',
  [CaseStatus.CONSTRUCTION]: '施工中',
  [CaseStatus.FINAL_PAYMENT]: '請領尾款',
  [CaseStatus.COMPLETED]: '完工驗收',
  [CaseStatus.WARRANTY]: '保固期',
  [CaseStatus.NEW]: '現場評估',
  [CaseStatus.PROGRESS]: '施工中',
  [CaseStatus.DONE]: '完工驗收'
};

export enum ServiceCategory {
  WALL_CANCER = '一般壁癌修繕',
  WALL_WATERPROOF = '外牆防水',
  ROOF_WATERPROOF = '頂樓防水',
  CRACK = '內外牆裂縫處理',
  STRUCTURE = '嚴重鋼筋外露壁癌',
  SILICONE_BATH = '浴室防水矽利康',
  SILICONE_WINDOW = '門窗防水矽利康',
  CUSTOM = '其他自定義工程'
}

export interface MethodStep {
  name: string;
  description: string;
  prepMinutes: number;
  execMinutes: number;
}

export interface MethodItem {
  id: string;
  category: ServiceCategory;
  name: string;
  englishName: string;
  defaultUnit: string;
  defaultUnitPrice: number;
  description?: string;
  steps: MethodStep[];
  estimatedDays: number;
}

export interface ScheduleTask {
  taskId: string;
  date: string;
  zoneName: string;
  taskName: string;
  isCompleted: boolean;
}

export interface BreakPeriod {
  start: string;
  end?: string;
}

export interface ConstructionLog {
  id: string;
  date: string;
  weather: string;
  action: string;
  description: string;
  beforePhotos: string[];
  afterPhotos: string[];
  photos?: string[];
  startTime?: string;
  breaks?: BreakPeriod[];  // 更新：支援多次休息紀錄
  endTime?: string;
  delayDays?: number;
  isNoWorkDay?: boolean;
}

export interface ConstructionItem {
  itemId: string;
  length: number;
  width: number;
  areaPing: number;
  quantity: number;
  itemPrice: number;
  note?: string;
  photos: string[];
}

export interface Zone {
  zoneId: string;
  zoneName: string;
  category: ServiceCategory;
  methodId: string;
  methodName: string;
  unit: string;
  unitPrice: number;
  difficultyCoefficient: number;
  items: ConstructionItem[];
}

export interface CaseData {
  caseId: string;
  createdDate: string;
  startDate?: string;
  customerName: string;
  phone: string;
  address?: string;           // 施工地址
  latitude?: number;          // 緯度(Lat)
  longitude?: number;         // 經度(Lng) 
  addressNote?: string;       // 地址備註（如：3樓、後棟等）
  lineId?: string;
  status: CaseStatus;
  zones: Zone[];
  specialNote: string;
  formalQuotedPrice: number;
  manualPriceAdjustment: number;
  finalPrice: number;
  schedule: ScheduleTask[];
  logs: ConstructionLog[];
  warrantyRecords: any[];
  changeOrders: any[];
}

// Material Categories
export enum MaterialCategory {
  PAINT = '塗料',
  WATERPROOF = '防水材',
  CEMENT = '泥作/結構',
  TOOLS = '工具/設備',
  SILICONE = '填縫/矽利康',
  CONSUMABLE = '其他耗材',
  OTHER = '其他'
}

export interface Material {
  id: string;
  name: string;
  brand: string;
  category?: MaterialCategory | string; // Optional for backward compatibility
  unit: string;
  unitPrice: number;
  costPerVal: number;
  updatedAt?: string;
}

export interface MethodRecipe {
  id: string;
  methodId: string;
  materialId: string;
  quantity: number; // Base Qty
  category: 'fixed' | 'variable';
  consumptionRate: number; // Qty per Ping
  note?: string;
  // Joins
  material?: Material;
}
