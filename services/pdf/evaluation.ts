import jsPDF from 'jspdf';
import { CaseData } from '../../types';
import {
  PDF_THEME,
  drawFooter,
  drawProjectMeta,
  ensurePageSpace,
  fetchImageAsDataUrl,
  formatCurrency,
  formatDate,
  getDisplayCaseId,
  getMethodDisplayName,
  getZoneWorkflowSteps,
  loadDbMethods,
  loadFont,
  outputPDF,
  setupDocument,
  truncateTextToWidth,
} from './shared';

export const generateEvaluationPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);

  setupDocument(doc, 'EVALUATION REPORT', '現勘評估報告');
  const dbMethods = await loadDbMethods();

  doc.setFontSize(10);
  doc.text('客戶資料 / CLIENT INFO', 14, 45);
  doc.setLineWidth(0.35);
  doc.setDrawColor(...PDF_THEME.line);
  doc.line(14, 47, 196, 47);

  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  doc.text(`案件編號 / CASE ID: ${displayId}`, 14, 55);
  doc.text(`客戶姓名 / CLIENT: ${data.customerName}`, 14, 61);
  doc.text(`建立日期 / DATE: ${formatDate(data.createdDate)}`, 110, 55);
  doc.text(`工程地址 / ADDRESS: ${data.address || '-'}`, 110, 61);

  let currentY = drawProjectMeta(doc, data, 69) + 4;
  currentY = ensurePageSpace(doc, currentY, 24);
  doc.setFillColor(...PDF_THEME.surface);
  doc.rect(14, currentY, 182, 18, 'F');
  doc.setFontSize(9.5);
  doc.text(`漏水症狀 / LEAK SYMPTOMS: ${data.leakSymptoms || '-'}`, 16, currentY + 6);
  doc.text(`漏水源判定 / ROOT CAUSE: ${data.leakSourceDiagnosis || '-'}`, 16, currentY + 12);
  currentY += 24;

  for (let zIndex = 0; zIndex < data.zones.length; zIndex++) {
    const zone = data.zones[zIndex];
    currentY = ensurePageSpace(doc, currentY, 30);
    doc.setFillColor(248, 248, 248);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const methodDisplay = getMethodDisplayName(zone.methodId, zone.methodName);
    doc.text(`區域 ${zIndex + 1}: ${zone.zoneName}  |  ${methodDisplay}`, 16, currentY + 5.5);
    currentY += 10;

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(50, 50, 50);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.text('項次 / NO.', 16, currentY + 5.5);
    doc.text('規格 / SPEC', 36, currentY + 5.5);
    doc.text('坪數 / AREA', 110, currentY + 5.5);
    doc.text('價格 / PRICE', 194, currentY + 5.5, { align: 'right' });
    currentY += 8;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);

    for (const [iIndex, item] of zone.items.entries()) {
      const hasPhotos = item.photos && item.photos.length > 0;
      let neededHeight = 10;
      if (hasPhotos) {
        const photoRows = Math.ceil(item.photos!.length / 4);
        neededHeight += (photoRows * 45) + 5;
      }

      if (currentY + neededHeight > 270) {
        doc.addPage();
        currentY = 20;
        doc.setFillColor(50, 50, 50);
        doc.setTextColor(255, 255, 255);
        doc.rect(14, currentY, 182, 8, 'F');
        doc.text('項次 / NO.', 16, currentY + 5.5);
        doc.text('規格 / SPEC', 36, currentY + 5.5);
        doc.text('坪數 / AREA', 110, currentY + 5.5);
        doc.text('價格 / PRICE', 194, currentY + 5.5, { align: 'right' });
        doc.setTextColor(30, 30, 30);
        currentY += 8;
      }

      if (iIndex % 2 === 1) {
        doc.setFillColor(245, 245, 245);
        doc.rect(14, currentY, 182, 8, 'F');
      }

      const dimStr = item.quantity && item.quantity > 0
        ? `${item.quantity} ${zone.unit === '式' ? 'SET' : zone.unit === '米' ? 'M' : 'UNIT'}`
        : `L:${item.length} x W:${item.width} (${item.areaPing} P)`;

      doc.text(`#${iIndex + 1}`, 16, currentY + 5.5);
      doc.text(dimStr, 36, currentY + 5.5);
      doc.text(item.areaPing > 0 ? `${item.areaPing} 坪` : '-', 110, currentY + 5.5);
      doc.text(formatCurrency(item.itemPrice), 194, currentY + 5.5, { align: 'right' });
      currentY += 8;

      if (hasPhotos) {
        let xOffset = 20;
        const imgWidth = 40;
        const imgHeight = 40;
        const gap = 5;

        for (const [pIdx, photo] of item.photos!.entries()) {
          if (pIdx > 0 && pIdx % 4 === 0) {
            currentY += imgHeight + 5;
            xOffset = 20;
          }
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(xOffset, currentY, imgWidth, imgHeight);
          try {
            const dataUrl = await fetchImageAsDataUrl(photo);
            if (dataUrl) doc.addImage(dataUrl, 'JPEG', xOffset, currentY, imgWidth, imgHeight);
          } catch (e) {
            console.warn('Image add fail', e);
          }
          xOffset += imgWidth + gap;
        }
        currentY += imgHeight + 5;
      }

      doc.setDrawColor(230, 230, 230);
      doc.line(14, currentY, 196, currentY);
    }

    currentY += 6;
    const workflowSteps = getZoneWorkflowSteps(zone, dbMethods);
    if (workflowSteps.length) {
      const tagPaddingX = 2.5;
      const tagHeight = 12.5;
      const tagGapX = 3;
      const tagGapY = 2.5;
      const tagStartX = 18;
      const tagMaxX = 192;
      const tagColumns = 3;
      const availableWidth = tagMaxX - tagStartX;
      const tagWidth = (availableWidth - (tagGapX * (tagColumns - 1))) / tagColumns;
      const titleStartX = tagPaddingX + 8.5;

      doc.setFontSize(8);
      const tags = workflowSteps.map((step, stepIndex) => {
        const titleRaw = step.name;
        const title = truncateTextToWidth(doc, titleRaw, tagWidth - titleStartX - tagPaddingX);
        doc.setFontSize(7);
        const desc = truncateTextToWidth(doc, step.description || '-', tagWidth - titleStartX - tagPaddingX);
        doc.setFontSize(8);
        return { title, desc, order: String(stepIndex + 1).padStart(2, '0') };
      });

      const rowCount = Math.ceil(tags.length / tagColumns);
      const tagsHeight = (rowCount * tagHeight) + ((rowCount - 1) * tagGapY);
      currentY = ensurePageSpace(doc, currentY, 14 + tagsHeight + 5);
      doc.setFillColor(...PDF_THEME.surface);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setTextColor(...PDF_THEME.textMain);
      doc.setFontSize(9);
      doc.text('施作流程 / WORKFLOW', 16, currentY + 5.5);
      currentY += 9.5;

      let drawY = currentY;
      doc.setFont('NotoSansTC', 'normal');
      tags.forEach((tag, index) => {
        const col = index % tagColumns;
        const row = Math.floor(index / tagColumns);
        const drawX = tagStartX + (col * (tagWidth + tagGapX));
        drawY = currentY + (row * (tagHeight + tagGapY));

        doc.setFillColor(...PDF_THEME.surface);
        doc.setDrawColor(...PDF_THEME.line);
        doc.setLineWidth(0.25);
        doc.roundedRect(drawX, drawY, tagWidth, tagHeight, 1.2, 1.2, 'FD');

        doc.setFont('NotoSansTC', 'bold');
        doc.setTextColor(...PDF_THEME.textSub);
        doc.setFontSize(8.5);
        doc.text(tag.order, drawX + tagPaddingX, drawY + 4.3);

        doc.setTextColor(...PDF_THEME.textMain);
        doc.setFont('NotoSansTC', 'bold');
        doc.setFontSize(8);
        doc.text(tag.title, drawX + titleStartX, drawY + 4.4);

        doc.setDrawColor(...PDF_THEME.line);
        doc.setLineWidth(0.22);
        doc.line(drawX + titleStartX, drawY + 6.1, drawX + titleStartX + 7, drawY + 6.1);

        doc.setFont('NotoSansTC', 'normal');
        doc.setTextColor(...PDF_THEME.textSub);
        doc.setFontSize(7.2);
        doc.text(tag.desc, drawX + titleStartX, drawY + 8.2);

        const isFirstInWrappedRow = row > 0 && col === 0;
        if (isFirstInWrappedRow) {
          const resumeX = drawX - (tagGapX / 2);
          const resumeY = drawY + (tagHeight / 2);
          doc.setDrawColor(...PDF_THEME.line);
          doc.setLineWidth(0.26);
          doc.line(resumeX - 0.55, resumeY - 0.7, resumeX + 0.55, resumeY);
          doc.line(resumeX - 0.55, resumeY + 0.7, resumeX + 0.55, resumeY);
        }

        const hasNextInRow = col < (tagColumns - 1) && (index + 1) < tags.length;
        if (hasNextInRow) {
          const arrowX = drawX + tagWidth + (tagGapX / 2);
          const arrowY = drawY + (tagHeight / 2);
          doc.setDrawColor(...PDF_THEME.line);
          doc.setLineWidth(0.3);
          doc.line(arrowX - 0.55, arrowY - 0.7, arrowX + 0.55, arrowY);
          doc.line(arrowX - 0.55, arrowY + 0.7, arrowX + 0.55, arrowY);
        }

        const isEndOfRowWithNext = col === (tagColumns - 1) && (index + 1) < tags.length;
        if (isEndOfRowWithNext) {
          const dropX = drawX + tagWidth + (tagGapX / 2);
          const dropStartY = drawY + (tagHeight / 2) + 1;
          const dropEndY = drawY + tagHeight + (tagGapY / 2) + 1.2;
          doc.setDrawColor(...PDF_THEME.line);
          doc.setLineWidth(0.28);
          doc.line(dropX, dropStartY, dropX, dropEndY);
          doc.line(dropX - 0.65, dropEndY - 0.55, dropX, dropEndY + 0.25);
          doc.line(dropX + 0.65, dropEndY - 0.55, dropX, dropEndY + 0.25);
        }
      });
      doc.setFont('NotoSansTC', 'normal');
      currentY = drawY + tagHeight + 4;
    }
  }

  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(...PDF_THEME.line);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, 196, currentY);
  doc.setFillColor(...PDF_THEME.surface);
  doc.rect(14, currentY + 2, 182, 11, 'F');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_THEME.textMain);
  doc.text(`總金額 / TOTAL: ${formatCurrency(data.finalPrice)}`, 194, currentY + 10, { align: 'right' });

  drawFooter(doc);
  outputPDF(doc, `EVALUATION_${displayId}.pdf`, mode);
};
