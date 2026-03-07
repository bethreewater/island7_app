import React from 'react';
import { Eye, Plus } from 'lucide-react';
import { CaseData, CaseStatus, WarrantyRecord, normalizeCaseStatus } from '../../types';
import { Button, Card, Input, ImageUploader } from '../InputComponents';
import { ExportButton } from './ExportButton';

interface CaseWarrantyTabProps {
  localData: CaseData;
  liveFinalPrice: number;
  frozenQuotePrice: number;
  depositRatio: number;
  activeWarrantyCount: number;
  pendingWarrantyCount: number;
  overdueWarrantyCount: number;
  handleUpdate: (data: CaseData) => void;
  getPDFService: () => Promise<typeof import('../../services/pdfService')>;
}

export const CaseWarrantyTab: React.FC<CaseWarrantyTabProps> = ({
  localData,
  liveFinalPrice,
  frozenQuotePrice,
  depositRatio,
  activeWarrantyCount,
  pendingWarrantyCount,
  overdueWarrantyCount,
  handleUpdate,
  getPDFService,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const buildPdfParams = () => ({
    ...localData,
    finalPrice: liveFinalPrice,
    formalQuotedPrice: frozenQuotePrice,
    depositPercentage: depositRatio,
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <OverviewCard label="保固紀錄" value={localData.warrantyRecords.length} />
        <OverviewCard label="保內/觀察中" value={activeWarrantyCount} />
        <OverviewCard label="待回訪" value={pendingWarrantyCount} />
        <OverviewCard label="已逾期" value={overdueWarrantyCount} alert={overdueWarrantyCount > 0} />
      </div>

      <Card title="保固快捷 / WARRANTY QUICK ACTIONS">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickInfo label="完工日期" value={localData.completionAcceptedDate ? new Date(localData.completionAcceptedDate).toLocaleDateString('zh-TW') : '未填寫'} />
          <QuickInfo label="保固狀態" value={normalizeCaseStatus(localData.status) === CaseStatus.WARRANTY ? '保固進行中' : '尚未切入保固'} />
          <QuickInfo label="最近回訪" value={localData.warrantyRecords[0]?.recordedAt ? new Date(localData.warrantyRecords[0].recordedAt).toLocaleDateString('zh-TW') : '尚無紀錄'} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <ExportButton onClick={async () => (await getPDFService()).generateCompletionPDF(buildPdfParams(), 'preview')} icon={<Eye size={18} />} label="驗收單 / COMPLETION" />
          <ExportButton onClick={async () => (await getPDFService()).generateWarrantyCertificatePDF(buildPdfParams(), 'preview')} icon={<Eye size={18} />} label="保固書 / WARRANTY" />
        </div>
      </Card>

      <Card title="保固紀錄 / WARRANTY RECORD">
        <div className="space-y-4">
          {(localData.warrantyRecords || []).length === 0 && (
            <div className="text-center py-10 text-zinc-400 text-sm font-bold">尚未建立保固案件</div>
          )}
          {(localData.warrantyRecords || []).map((record) => (
            <WarrantyRecordEditor
              key={record.id}
              localData={localData}
              record={record}
              today={today}
              handleUpdate={handleUpdate}
            />
          ))}
          <Button variant="outline" onClick={() => handleUpdate({ ...localData, warrantyRecords: [...(localData.warrantyRecords || []), { id: `WR-${Date.now()}`, recordedAt: today, type: 'callback', responsibility: 'warranty', causeCategory: 'unknown', issueSummary: '', result: '', note: '', photos: [] }] })}><Plus size={14} /> 新增保固紀錄</Button>
        </div>
      </Card>
    </div>
  );
};

const OverviewCard = ({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) => (
  <div className={`border rounded-sm p-4 ${alert ? 'bg-rose-50 border-rose-200' : 'bg-white border-zinc-100'}`}>
    <div className={`text-[9px] font-black uppercase tracking-widest ${alert ? 'text-rose-500' : 'text-zinc-400'}`}>{label}</div>
    <div className="text-2xl font-black mt-2">{value}</div>
  </div>
);

const QuickInfo = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-zinc-100 rounded-sm p-4 bg-zinc-50">
    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</div>
    <div className="text-base font-black mt-2">{value}</div>
  </div>
);

const WarrantyRecordEditor: React.FC<{
  localData: CaseData;
  record: WarrantyRecord;
  today: string;
  handleUpdate: (data: CaseData) => void;
}> = ({
  localData,
  record,
  today,
  handleUpdate,
}) => {
  const isOverdue = Boolean(record.nextVisitDate && record.nextVisitDate < today && !record.result?.trim());
  const updateRecord = (patch: Partial<WarrantyRecord>) => {
    handleUpdate({
      ...localData,
      warrantyRecords: localData.warrantyRecords.map((entry) => entry.id === record.id ? { ...entry, ...patch } : entry),
    });
  };

  return (
    <div className={`border rounded-sm p-4 space-y-3 ${isOverdue ? 'border-rose-200 bg-rose-50/40' : 'border-zinc-100'}`}>
      {isOverdue && <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest">回訪逾期 / OVERDUE</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input label="紀錄日期" type="date" value={record.recordedAt} onChange={(e) => updateRecord({ recordedAt: e.target.value })} />
        <Input label="回訪日期" type="date" value={record.nextVisitDate || ''} onChange={(e) => updateRecord({ nextVisitDate: e.target.value })} />
        <Input label="區域 ID / ZONE" value={record.zoneId || ''} onChange={(e) => updateRecord({ zoneId: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">類型</label>
        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">責任歸屬</label>
        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">原因分類</label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select className="border border-zinc-200 rounded-sm px-3 py-2" value={record.type || 'callback'} onChange={(e) => updateRecord({ type: e.target.value as WarrantyRecord['type'] })}>
          <option value="callback">客訴回報</option>
          <option value="inspection">現勘複查</option>
          <option value="repair">保固修補</option>
          <option value="closed">結案</option>
        </select>
        <select className="border border-zinc-200 rounded-sm px-3 py-2" value={record.responsibility || 'warranty'} onChange={(e) => updateRecord({ responsibility: e.target.value as WarrantyRecord['responsibility'] })}>
          <option value="warranty">保固處理</option>
          <option value="chargeable">保外計價</option>
          <option value="monitoring">觀察追蹤</option>
        </select>
        <select className="border border-zinc-200 rounded-sm px-3 py-2" value={record.causeCategory || 'unknown'} onChange={(e) => updateRecord({ causeCategory: e.target.value as WarrantyRecord['causeCategory'] })}>
          <option value="same_defect">同一缺失</option>
          <option value="new_leak_point">新漏點</option>
          <option value="upstream_issue">上游漏水源</option>
          <option value="customer_damage">人為/第三方</option>
          <option value="unknown">待判定</option>
        </select>
      </div>
      <Input label="問題摘要 / ISSUE SUMMARY" value={record.issueSummary || ''} onChange={(e) => updateRecord({ issueSummary: e.target.value })} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">處理結果 / RESULT</label>
          <textarea className="w-full min-h-24 border border-zinc-200 rounded-sm px-3 py-2" value={record.result || ''} onChange={(e) => updateRecord({ result: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">備註 / NOTE</label>
          <textarea className="w-full min-h-24 border border-zinc-200 rounded-sm px-3 py-2" value={record.note || ''} onChange={(e) => updateRecord({ note: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">回訪照片 / PHOTOS</label>
        <ImageUploader images={record.photos || []} onImagesChange={(imgs) => updateRecord({ photos: imgs })} maxImages={4} />
      </div>
      <div className="flex justify-end">
        <Button variant="danger" onClick={() => handleUpdate({ ...localData, warrantyRecords: localData.warrantyRecords.filter((entry) => entry.id !== record.id) })}>刪除紀錄</Button>
      </div>
    </div>
  );
};
