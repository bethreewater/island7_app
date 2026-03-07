import React from 'react';
import { Eye, Plus } from 'lucide-react';
import { CaseData, CaseStatus, ChangeOrder, normalizeCaseStatus } from '../../types';
import { Button, Card, Input } from '../InputComponents';
import { ExportButton } from './ExportButton';

type TabKey = 'eval' | 'log' | 'quote' | 'mats' | 'schedule' | 'warranty';

interface CaseCommercialTabProps {
  localData: CaseData;
  calculatedTotal: number;
  liveFinalPrice: number;
  frozenQuotePrice: number;
  depositRatio: number;
  depositAmount: number;
  finalPaymentAmount: number;
  depositPercent: number;
  finalPercent: number;
  setLocalData: React.Dispatch<React.SetStateAction<CaseData>>;
  latestDataRef: React.MutableRefObject<CaseData>;
  handleUpdate: (data: CaseData) => void;
  getPDFService: () => Promise<typeof import('../../services/pdfService')>;
}

export const CaseCommercialTab: React.FC<CaseCommercialTabProps> = ({
  localData,
  calculatedTotal,
  liveFinalPrice,
  frozenQuotePrice,
  depositRatio,
  depositAmount,
  finalPaymentAmount,
  depositPercent,
  finalPercent,
  setLocalData,
  latestDataRef,
  handleUpdate,
  getPDFService,
}) => {
  const buildPdfParams = () => ({
    ...localData,
    finalPrice: liveFinalPrice,
    formalQuotedPrice: frozenQuotePrice,
    depositPercentage: depositRatio,
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
      <Card title="商務控制 / COMMERCIAL CONTROL">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="報價版本 / QUOTE VERSION" type="number" value={localData.quoteVersion || 1} onChange={(e) => handleUpdate({ ...localData, quoteVersion: parseInt(e.target.value, 10) || 1 })} />
          <Input label="簽約日期 / CONTRACT SIGNED" type="date" value={localData.contractSignedDate || ''} onChange={(e) => handleUpdate({ ...localData, contractSignedDate: e.target.value })} />
          <Input label="發票抬頭 / INVOICE TITLE" value={localData.invoiceTitle || ''} onChange={(e) => handleUpdate({ ...localData, invoiceTitle: e.target.value })} />
          <Input label="統一編號 / TAX ID" value={localData.invoiceTaxId || ''} onChange={(e) => handleUpdate({ ...localData, invoiceTaxId: e.target.value })} />
          <Input label="頭期比例 % / DEPOSIT %" type="number" value={depositPercent} onChange={(e) => handleUpdate({ ...localData, depositPercentage: (parseInt(e.target.value, 10) || 0) / 100 })} />
          <Input label="收到頭期日 / DEPOSIT RECEIVED" type="date" value={localData.depositReceivedDate || ''} onChange={(e) => handleUpdate({ ...localData, depositReceivedDate: e.target.value, status: e.target.value ? CaseStatus.DEPOSIT_RECEIVED : localData.status })} />
          <Input label="收到尾款日 / FINAL RECEIVED" type="date" value={localData.finalPaymentReceivedDate || ''} onChange={(e) => handleUpdate({ ...localData, finalPaymentReceivedDate: e.target.value })} />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <Button
            variant={localData.depositReceivedDate ? 'outline' : 'primary'}
            onClick={() => handleUpdate({
              ...localData,
              depositReceivedDate: localData.depositReceivedDate || new Date().toISOString().slice(0, 10),
              status: normalizeCaseStatus(localData.status) === CaseStatus.ASSESSMENT ? CaseStatus.DEPOSIT_RECEIVED : localData.status,
            })}
          >
            {localData.depositReceivedDate ? '已記頭期' : '登記頭期'}
          </Button>
          <Button
            variant={normalizeCaseStatus(localData.status) === CaseStatus.PLANNING ? 'primary' : 'outline'}
            onClick={() => handleUpdate({ ...localData, status: CaseStatus.PLANNING })}
          >
            轉備料/規劃
          </Button>
          <Button
            variant={normalizeCaseStatus(localData.status) === CaseStatus.FINAL_PAYMENT && !localData.finalPaymentReceivedDate ? 'primary' : 'outline'}
            onClick={() => handleUpdate({ ...localData, status: CaseStatus.FINAL_PAYMENT })}
          >
            發起尾款
          </Button>
          <Button
            variant={localData.finalPaymentReceivedDate ? 'outline' : 'primary'}
            onClick={() => handleUpdate({
              ...localData,
              finalPaymentReceivedDate: localData.finalPaymentReceivedDate || new Date().toISOString().slice(0, 10),
              status: CaseStatus.COMPLETED,
              completionAcceptedDate: localData.completionAcceptedDate || new Date().toISOString().slice(0, 10),
            })}
          >
            {localData.finalPaymentReceivedDate ? '已記尾款' : '尾款入帳'}
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard label={`頭期 ${depositPercent}%`} value={`$${depositAmount.toLocaleString()}`} />
          <MetricCard label={`尾款 ${finalPercent}%`} value={`$${finalPaymentAmount.toLocaleString()}`} />
          <MetricCard label="目前凍結報價" value={`$${frozenQuotePrice.toLocaleString()}`} />
        </div>
        <div className="mt-4 space-y-1">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">收款/請款備註 / PAYMENT NOTE</label>
          <textarea
            className="w-full min-h-24 border border-zinc-200 rounded-sm px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 font-medium"
            value={localData.paymentNote || ''}
            onChange={(e) => setLocalData({ ...latestDataRef.current, paymentNote: e.target.value })}
            onBlur={(e) => handleUpdate({ ...latestDataRef.current, paymentNote: e.target.value })}
            placeholder="例：頭期款簽約當日現金收、尾款驗收後三日內匯款"
          />
        </div>
      </Card>

      <Card title="最終報價結算 / QUOTATION">
        <div className="space-y-6">
          <div className="flex justify-between text-[11px] font-black text-zinc-400 uppercase bg-zinc-50 px-4 py-3 border border-zinc-100">
            <span>BASE VALUATION / 系統估值</span>
            <span className="text-zinc-950 text-sm font-black">${calculatedTotal.toLocaleString()}</span>
          </div>
          <Input label="手動調整 (折讓或補償) / ADJUSTMENT" type="number" value={localData.manualPriceAdjustment || ''} onChange={e => handleUpdate({ ...localData, manualPriceAdjustment: parseInt(e.target.value, 10) || 0 })} />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleUpdate({ ...localData, formalQuotedPrice: liveFinalPrice })}>凍結為正式報價 / FREEZE QUOTE</Button>
            <div className="text-xs text-zinc-500">正式報價：${frozenQuotePrice.toLocaleString()}</div>
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-zinc-950">
            <div className="text-[10px] font-black text-zinc-400 uppercase">FINAL PRICE / 總報價</div>
            <span className="text-3xl font-black text-zinc-950">${liveFinalPrice.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      <Card title="追加減工程 / CHANGE ORDERS">
        <div className="space-y-3">
          {(localData.changeOrders || []).length === 0 && <div className="text-sm text-zinc-400">尚無追加減紀錄</div>}
          {(localData.changeOrders || []).map((item) => (
            <div key={item.id} className="border border-zinc-100 rounded-sm p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <Input label="日期" type="date" value={item.createdAt} onChange={(e) => handleChangeOrderUpdate(localData, item.id, { createdAt: e.target.value }, handleUpdate)} />
              <Input label="原因" value={item.reason} onChange={(e) => handleChangeOrderUpdate(localData, item.id, { reason: e.target.value }, handleUpdate)} />
              <Input label="金額" type="number" value={item.amount} onChange={(e) => handleChangeOrderUpdate(localData, item.id, { amount: parseInt(e.target.value, 10) || 0 }, handleUpdate)} />
              <Button
                variant={item.status === 'approved' ? 'primary' : 'outline'}
                onClick={() => handleChangeOrderUpdate(localData, item.id, {
                  status: item.status === 'approved' ? 'draft' : 'approved',
                  approvedAt: item.status === 'approved' ? undefined : new Date().toISOString().slice(0, 10),
                }, handleUpdate)}
              >
                {item.status === 'approved' ? '已核准' : '待核准'}
              </Button>
              <Button variant="danger" onClick={() => handleUpdate({ ...localData, changeOrders: localData.changeOrders.filter((entry) => entry.id !== item.id) })}>刪除</Button>
            </div>
          ))}
          <Button variant="outline" onClick={() => handleUpdate({ ...localData, changeOrders: [...(localData.changeOrders || []), { id: `CO-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10), reason: '', amount: 0, status: 'draft' as ChangeOrder['status'] }] })}><Plus size={14} /> 新增追加減</Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ExportButton onClick={async () => (await getPDFService()).generateEvaluationPDF(buildPdfParams(), 'preview')} icon={<Eye size={20} />} label="預覽評估 / EVAL" />
        <ExportButton onClick={async () => (await getPDFService()).generateQuotationPDF(buildPdfParams(), 'preview')} icon={<Eye size={20} />} label="預覽報價 / QUOTE" />
        <ExportButton onClick={async () => (await getPDFService()).generateContractPDF(buildPdfParams(), 'preview')} icon={<Eye size={20} />} label="預覽合約 / CONTRACT" />
        <ExportButton onClick={async () => (await getPDFService()).generateInvoicePDF(buildPdfParams(), 'DEPOSIT', 'preview')} icon={<Eye size={20} />} label="預覽頭期 / DEPOSIT" />
        <ExportButton onClick={async () => (await getPDFService()).generateInvoicePDF(buildPdfParams(), 'FINAL', 'preview')} icon={<Eye size={20} />} label="預覽尾款 / FINAL" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ExportButton onClick={async () => (await getPDFService()).generateCompletionPDF(buildPdfParams(), 'preview')} icon={<Eye size={20} />} label="預覽完工 / COMPLETION" />
        <ExportButton onClick={async () => (await getPDFService()).generateWarrantyCertificatePDF(buildPdfParams(), 'preview')} icon={<Eye size={20} />} label="預覽保固 / WARRANTY" />
      </div>
    </div>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-zinc-100 bg-zinc-50 rounded-sm p-4">
    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</div>
    <div className="text-xl font-black mt-2">{value}</div>
  </div>
);

const handleChangeOrderUpdate = (
  localData: CaseData,
  id: string,
  patch: Partial<ChangeOrder>,
  handleUpdate: (data: CaseData) => void,
) => {
  handleUpdate({
    ...localData,
    changeOrders: localData.changeOrders.map((entry) => entry.id === id ? { ...entry, ...patch } : entry),
  });
};
