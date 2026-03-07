import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CaseData } from '../../types';
import {
  PDF_THEME,
  drawFooter,
  drawSectionHeader,
  drawSignatureBlock,
  formatCurrency,
  formatDate,
  getDisplayCaseId,
  getMethodDisplayName,
  loadFont,
  outputPDF,
  setupDocument,
} from './shared';

export const generateCompletionPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);
  setupDocument(doc, 'COMPLETION ACCEPTANCE', '完工驗收單');

  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  doc.setFontSize(10);
  doc.text(`案件編號 / CASE NO: ${displayId}`, 14, 45);
  doc.text(`客戶名稱 / CLIENT: ${data.customerName}`, 14, 52);
  doc.text(`工程地址 / ADDRESS: ${data.address || '-'}`, 14, 59);
  doc.text(`驗收日期 / ACCEPTED DATE: ${formatDate(data.completionAcceptedDate || new Date().toISOString())}`, 110, 45);
  doc.text(`現場聯絡 / SITE CONTACT: ${data.siteContactName || data.customerName || '-'}`, 110, 52);
  doc.text(`聯絡電話 / PHONE: ${data.siteContactPhone || data.phone || '-'}`, 110, 59);
  doc.text(`尾款入帳 / FINAL PAID: ${formatDate(data.finalPaymentReceivedDate || '')}`, 110, 66);

  let y = 79;
  y = drawSectionHeader(doc, '完工內容 / COMPLETED SCOPE', y);
  autoTable(doc, {
    startY: y + 2,
    head: [['區域', '工法', '重點備註']],
    body: (data.zones || []).map((zone, index) => [`${index + 1}. ${zone.zoneName || `區域 ${index + 1}`}`, getMethodDisplayName(zone.methodId, zone.methodName), zone.exclusionNote || zone.leakConditionNote || zone.substrateNote || '-']),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, font: 'NotoSansTC' },
    headStyles: { fillColor: [...PDF_THEME.headerBg], textColor: 255, font: 'NotoSansTC', fontStyle: 'bold' },
  });
  y = ((doc as any).lastAutoTable?.finalY || y + 40) + 8;
  y = drawSectionHeader(doc, '驗收說明 / ACCEPTANCE NOTE', y);
  doc.setFontSize(9.5);
  doc.text(`1) 本次完工金額：${formatCurrency(data.formalQuotedPrice || data.finalPrice)}`, 16, y + 6);
  doc.text(`2) 驗收備註：${data.specialNote || '依現場點交為準。'}`, 16, y + 12);
  doc.text(`3) 尾款狀態：${data.finalPaymentReceivedDate ? `已收款 ${formatDate(data.finalPaymentReceivedDate)}` : '待收尾款'}`, 16, y + 18);
  drawSignatureBlock(doc, y + 28, '驗收簽認 / ACCEPTANCE', '業主簽認', '施工單位簽認');
  drawFooter(doc);
  outputPDF(doc, `COMPLETION_${displayId}.pdf`, mode);
};

export const generateWarrantyCertificatePDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);
  setupDocument(doc, 'WARRANTY CERTIFICATE', '保固證明書');

  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  doc.setFontSize(10);
  doc.text(`案件編號 / CASE NO: ${displayId}`, 14, 45);
  doc.text(`客戶名稱 / CLIENT: ${data.customerName}`, 14, 52);
  doc.text(`完工日期 / COMPLETED: ${formatDate(data.completionAcceptedDate || data.createdDate)}`, 110, 45);
  doc.text(`工程地址 / ADDRESS: ${data.address || '-'}`, 14, 59);
  doc.text(`保固起始 / WARRANTY START: ${formatDate(data.completionAcceptedDate || data.createdDate)}`, 110, 52);
  doc.text(`現場聯絡 / SITE CONTACT: ${data.siteContactName || data.customerName || '-'}`, 110, 59);

  let y = 72;
  y = drawSectionHeader(doc, '保固範圍 / WARRANTY COVERAGE', y);
  (data.zones || []).forEach((zone, index) => {
    doc.text(`${index + 1}) ${zone.zoneName || `區域 ${index + 1}`} / ${zone.methodName || '-'} / ${zone.warrantyType || 'leak_handled'}`, 16, y + 6);
    y += 8;
  });
  y += 4;
  y = drawSectionHeader(doc, '售後紀錄摘要 / SERVICE HISTORY', y);
  const records = data.warrantyRecords || [];
  if (records.length === 0) {
    doc.text('目前尚無保固回訪紀錄。', 16, y + 6);
  } else {
    records.slice(0, 6).forEach((record, index) => {
      doc.text(`${index + 1}) ${formatDate(record.recordedAt)} / ${record.issueSummary || '-'} / ${record.responsibility || 'warranty'}`, 16, y + 6);
      y += 8;
    });
  }
  drawSignatureBlock(doc, y + 16, '保固簽認 / WARRANTY', '業主簽認', '保固單位簽認');
  drawFooter(doc);
  outputPDF(doc, `WARRANTY_${displayId}.pdf`, mode);
};
