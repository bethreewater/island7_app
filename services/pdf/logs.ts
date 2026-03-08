import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CaseData, ConstructionLog } from '../../types';
import {
  PDF_THEME,
  drawFooter,
  drawSectionHeader,
  ensurePageSpace,
  fetchImageAsDataUrl,
  formatDate,
  getDisplayCaseId,
  loadFont,
  outputPDF,
  setupDocument,
  writeWrappedText,
} from './shared';

const ISSUE_LABELS: Record<string, string> = {
  normal: '正常施工',
  weather_delay: '天候延誤',
  access_issue: '進場受阻',
  material_delay: '材料延誤',
  customer_change: '客戶變更',
  warranty_visit: '保固回訪',
};

const isAutoPlaceholderLog = (log: ConstructionLog) => log.description?.startsWith('[系統自動生成]');

const formatBreaks = (log: ConstructionLog) => {
  if (!log.breaks?.length) return '-';
  return log.breaks.map((item) => `${item.start}-${item.end || '未復工'}`).join(' / ');
};

const formatMaterials = (log: ConstructionLog) => {
  if (!log.materialsUsed?.length) return '-';
  return log.materialsUsed.map((item) => `${item.brand ? `${item.brand} - ` : ''}${item.name}`).join(' / ');
};

const getLogSummary = (logs: ConstructionLog[]) => {
  const realLogs = logs.filter((log) => !isAutoPlaceholderLog(log));
  const activeDates = new Set(realLogs.filter((log) => !log.isNoWorkDay).map((log) => log.date));
  return {
    totalLogs: logs.length,
    workDays: activeDates.size,
    delayDays: logs.reduce((sum, log) => sum + (log.delayDays || 0), 0),
    signedOffCount: logs.filter((log) => log.customerSignedOff).length,
    warrantyVisitCount: logs.filter((log) => log.issueType === 'warranty_visit').length,
    totalPhotos: logs.reduce((sum, log) => sum + (log.beforePhotos?.length || 0) + (log.afterPhotos?.length || 0), 0),
  };
};

const drawLogPageHeader = (doc: jsPDF, log: ConstructionLog, continuation = false) => {
  doc.setFillColor(...PDF_THEME.surface);
  doc.rect(14, 18, 182, 12, 'F');
  doc.setTextColor(...PDF_THEME.textMain);
  doc.setFontSize(10);
  doc.text(`${continuation ? '施工日誌續頁 / CONTINUED' : '施工日誌 / DAILY LOG'} - ${log.date}`, 16, 25);
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_THEME.textSub);
  doc.text(`${log.zoneName || '未指定區域'} / ${log.action || '未指定工項'}`, 16, 30);
  return 36;
};

const drawPhotoGrid = async (doc: jsPDF, title: string, labelPrefix: string, photos: string[], startY: number, log: ConstructionLog) => {
  if (!photos.length) return startY;

  let y = ensurePageSpace(doc, startY, 14, drawLogPageHeader(doc, log, true));
  if (y === 36) {
    y = drawLogPageHeader(doc, log, true);
  }

  doc.setFontSize(9);
  doc.setTextColor(...PDF_THEME.textMain);
  doc.text(title, 16, y);
  y += 5;

  const marginX = 16;
  const gap = 6;
  const cols = 2;
  const imageWidth = 86;
  const imageHeight = 64;
  const captionHeight = 5;

  for (let index = 0; index < photos.length; index++) {
    const col = index % cols;
    if (col === 0) {
      y = ensurePageSpace(doc, y, imageHeight + captionHeight + 6, drawLogPageHeader(doc, log, true));
      if (y === 36) {
        y = drawLogPageHeader(doc, log, true);
      }
    }

    const x = marginX + (col * (imageWidth + gap));
    const rowY = y;
    doc.setDrawColor(...PDF_THEME.line);
    doc.setLineWidth(0.25);
    doc.rect(x, rowY, imageWidth, imageHeight);

    try {
      const dataUrl = await fetchImageAsDataUrl(photos[index]);
      if (dataUrl) {
        doc.addImage(dataUrl, 'JPEG', x, rowY, imageWidth, imageHeight);
      } else {
        doc.setFontSize(8);
        doc.setTextColor(...PDF_THEME.textSub);
        doc.text('圖片載入失敗', x + (imageWidth / 2), rowY + (imageHeight / 2), { align: 'center' });
      }
    } catch (error) {
      console.warn('Failed to add construction log photo', error);
    }

    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.textSub);
    doc.text(`${labelPrefix} ${index + 1}`, x, rowY + imageHeight + 4);

    if (col === cols - 1 || index === photos.length - 1) {
      y += imageHeight + captionHeight + 6;
    }
  }

  return y + 2;
};

export const generateConstructionLogPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);
  setupDocument(doc, 'CONSTRUCTION LOG REPORT', '施工日誌報告');

  const logs = [...(data.logs || [])].sort((a, b) => a.date.localeCompare(b.date));
  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  const summary = getLogSummary(logs);

  doc.setFontSize(10);
  doc.setTextColor(...PDF_THEME.textMain);
  doc.text(`案件編號 / CASE NO: ${displayId}`, 14, 45);
  doc.text(`客戶名稱 / CLIENT: ${data.customerName}`, 14, 52);
  doc.text(`工程地址 / ADDRESS: ${data.address || '-'}`, 14, 59);
  doc.text(`現場聯絡 / SITE CONTACT: ${data.siteContactName || data.customerName || '-'}`, 110, 45);
  doc.text(`聯絡電話 / PHONE: ${data.siteContactPhone || data.phone || '-'}`, 110, 52);
  doc.text(`開工 / 完工: ${formatDate(data.startDate || '')} / ${formatDate(data.completionAcceptedDate || '')}`, 110, 59);

  let y = 72;
  y = drawSectionHeader(doc, '施工摘要 / WORK SUMMARY', y);
  autoTable(doc, {
    startY: y + 2,
    head: [['項目', '數值', '項目', '數值']],
    body: [[
      '日誌總筆數', String(summary.totalLogs),
      '實際施工日數', String(summary.workDays),
    ], [
      '累計順延天數', String(summary.delayDays),
      '客戶確認筆數', String(summary.signedOffCount),
    ], [
      '保固回訪筆數', String(summary.warrantyVisitCount),
      '總照片數', String(summary.totalPhotos),
    ]],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, font: 'NotoSansTC' },
    headStyles: { fillColor: [...PDF_THEME.headerBg], textColor: 255, font: 'NotoSansTC', fontStyle: 'bold' },
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 28) + 8;
  y = drawSectionHeader(doc, '施工日誌明細 / LOG DETAILS', y);

  if (logs.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...PDF_THEME.textSub);
    doc.text('目前尚無施工日誌。', 16, y + 6);
    drawFooter(doc);
    outputPDF(doc, `CONSTRUCTION_LOG_${displayId}.pdf`, mode);
    return;
  }

  for (const [index, log] of logs.entries()) {
    y = ensurePageSpace(doc, y, 64, 20);
    if (y === 20) {
      y = drawLogPageHeader(doc, log, false);
    }

    doc.setFillColor(log.isNoWorkDay ? 255 : PDF_THEME.surface[0], log.isNoWorkDay ? 247 : PDF_THEME.surface[1], log.isNoWorkDay ? 219 : PDF_THEME.surface[2]);
    doc.rect(14, y, 182, 10, 'F');
    doc.setTextColor(...PDF_THEME.textMain);
    doc.setFontSize(10);
    doc.text(`${String(index + 1).padStart(2, '0')}. ${log.date} / ${log.action || '未填工項'}`, 16, y + 6.5);
    if (log.isNoWorkDay) {
      doc.setTextColor(180, 83, 9);
      doc.text(`順延 ${log.delayDays || 0} 天`, 192, y + 6.5, { align: 'right' });
    }
    y += 14;

    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_THEME.textMain);
    doc.text(`區域 / ZONE: ${log.zoneName || '-'}`, 16, y);
    doc.text(`天氣 / WEATHER: ${log.weather || '-'}`, 110, y);
    y += 5;
    doc.text(`任務 / TASK: ${log.taskId || '-'}`, 16, y);
    doc.text(`工班 / CREW: ${log.crewLabel || '-'}`, 110, y);
    y += 5;
    doc.text(`打卡 / TIME: ${log.startTime || '-'} -> ${formatBreaks(log)} -> ${log.endTime || '-'}`, 16, y);
    y += 5;
    doc.text(`事件 / ISSUE: ${ISSUE_LABELS[log.issueType || 'normal'] || log.issueType || '-'}`, 16, y);
    doc.text(`客戶確認 / SIGN-OFF: ${log.customerSignedOff ? '是' : '否'}`, 110, y);
    y += 7;

    y = writeWrappedText(doc, `施工說明 / NOTES: ${log.description || '-'}`, 16, y, 176, 4.5);
    y = writeWrappedText(doc, `證據摘要 / EVIDENCE: ${log.evidenceNote || '-'}`, 16, y + 1, 176, 4.5);
    y = writeWrappedText(doc, `材料使用 / MATERIALS: ${formatMaterials(log)}`, 16, y + 1, 176, 4.5);

    if (isAutoPlaceholderLog(log)) {
      y = writeWrappedText(doc, '系統註記 / SYSTEM NOTE: 此筆為系統自動同步產生，若內容未補齊請回系統編輯。', 16, y + 1, 176, 4.5);
    }

    y += 3;

    y = await drawPhotoGrid(doc, `施工前照片 / BEFORE (${log.beforePhotos?.length || 0})`, 'BEFORE', log.beforePhotos || [], y, log);
    y = await drawPhotoGrid(doc, `施工後照片 / AFTER (${log.afterPhotos?.length || 0})`, 'AFTER', log.afterPhotos || [], y, log);

    doc.setDrawColor(...PDF_THEME.line);
    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);
    y += 8;
  }

  drawFooter(doc);
  outputPDF(doc, `CONSTRUCTION_LOG_${displayId}.pdf`, mode);
};
