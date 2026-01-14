
export enum CaseStatus {
  NEW = 'new',
  PROGRESS = 'progress',
  DONE = 'done',
  WARRANTY = 'warranty'
}

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
  lineId?: string;
  address: string;
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
