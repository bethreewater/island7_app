import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CaseData, ServiceCategory } from '../../types';
import { getMaterials, getRecipes } from '../storageService';
import { getPaymentBreakdown } from '../../utils/payment';
import {
  BANK_ACCOUNT,
  BANK_CODE,
  BANK_NAME,
  CATEGORY_MATERIAL_RULES,
  CATEGORY_WARRANTY_RULES,
  PDF_THEME,
  COMPANY_ID,
  COMPANY_NAME,
  drawFooter,
  drawSectionHeader,
  drawSignatureBlock,
  ensurePageSpace,
  formatCurrency,
  formatDate,
  getCategoryList,
  getDisplayCaseId,
  getMethodById,
  getMethodDisplayName,
  getMethodWarrantyText,
  getProjectDurationDays,
  getZoneSubtotal,
  getZoneTotalArea,
  getZoneWorkflowSteps,
  loadDbMethods,
  loadFont,
  outputPDF,
  resolveMethodWarrantyByType,
  setupDocument,
  truncateTextToWidth,
  writeWrappedText,
} from './shared';

export const generateQuotationPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);
  setupDocument(doc, 'FORMAL QUOTATION', '正式報價單');

  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  const dbMethods = await loadDbMethods();
  const baseSubtotal = (data.zones || []).reduce((sum, zone) => sum + getZoneSubtotal(zone), 0);
  const adjustment = data.manualPriceAdjustment || 0;
  const total = data.finalPrice || (baseSubtotal + adjustment);
  const hasDiscountAdjustment = adjustment < 0 && total < baseSubtotal;
  const projectDays = getProjectDurationDays(data);

  doc.setFontSize(10);
  doc.text(`報價單號 / QUOTE NO: ${displayId}`, 14, 45);
  doc.text(`客戶名稱 / CLIENT: ${data.customerName}`, 14, 51);
  doc.text(`聯絡電話 / PHONE: ${data.phone || '-'}`, 14, 57);
  doc.text(`工程地址 / ADDRESS: ${data.address || '-'}`, 14, 63);
  doc.text(`建立日期 / DATE: ${formatDate(data.createdDate)}`, 120, 45);
  doc.text(`預估工期 / DURATION: 約 ${projectDays} 天`, 120, 51);
  doc.text(`報價版本 / VERSION: V${data.quoteVersion || 1}`, 120, 57);
  doc.text(`現場聯絡 / SITE CONTACT: ${data.siteContactName || data.customerName || '-'}`, 120, 63);
  if (data.contractSignedDate || data.depositReceivedDate) {
    doc.text(`簽約 / 頭期: ${formatDate(data.contractSignedDate || data.createdDate)} / ${formatDate(data.depositReceivedDate || '')}`, 14, 69);
  }

  const detailRows = (data.zones || []).map((zone, index) => {
    const methodDisplay = getMethodDisplayName(zone.methodId, zone.methodName);
    const area = getZoneTotalArea(zone);
    const qty = (zone.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
    const measure = area > 0 ? `${area.toFixed(2)} 坪` : `${qty || '-'} ${zone.unit || ''}`.trim();
    return [
      `${index + 1}. ${zone.zoneName || `區域 ${index + 1}`}`,
      methodDisplay,
      measure,
      formatCurrency(zone.unitPrice || 0),
      formatCurrency(getZoneSubtotal(zone)),
    ];
  });

  autoTable(doc, {
    startY: data.contractSignedDate || data.depositReceivedDate ? 78 : 72,
    head: [['區域 ZONE', '工法 METHOD', '數量 QTY', '單價 PRICE', '小計 SUBTOTAL']],
    body: detailRows.length ? detailRows : [['-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, font: 'NotoSansTC' },
    headStyles: { fillColor: [...PDF_THEME.headerBg], textColor: 255, font: 'NotoSansTC', fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 45 }, 2: { cellWidth: 25 }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 30 } },
  });

  let y = ((doc as any).lastAutoTable?.finalY || 120) + 8;
  y = ensurePageSpace(doc, y, 24);
  doc.setFillColor(...PDF_THEME.surface);
  doc.rect(14, y, 182, 18, 'F');
  doc.setFontSize(9.5);
  doc.text(`漏水症狀 / LEAK: ${data.leakSymptoms || '-'}`, 18, y + 6);
  doc.text(`施工限制 / ACCESS: ${data.accessConstraints || data.addressNote || '-'}`, 18, y + 12);
  y += 24;
  y = ensurePageSpace(doc, y, hasDiscountAdjustment ? 42 : 30);

  doc.setFillColor(...PDF_THEME.surface);
  doc.rect(14, y, 182, hasDiscountAdjustment ? 28 : 18, 'F');
  if (hasDiscountAdjustment) {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    const originalTotalText = `專案總費用 TOTAL: ${formatCurrency(baseSubtotal)}`;
    const originalTotalY = y + 9;
    doc.text(originalTotalText, 18, originalTotalY);
    const originalTotalWidth = doc.getTextWidth(originalTotalText);
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.35);
    const strikeY = originalTotalY - (doc.getFontSize() * 0.2);
    doc.line(18, strikeY, 18 + originalTotalWidth, strikeY);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.text(`折扣後費用 DISCOUNTED TOTAL: ${formatCurrency(total)}`, 18, y + 22);
    y += 34;
  } else {
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.text(`專案總費用 TOTAL: ${formatCurrency(total)}`, 18, y + 12);
    y += 24;
  }
  doc.setTextColor(30, 30, 30);

  y = ensurePageSpace(doc, y, 18);
  y = drawSectionHeader(doc, '施工流程 / CONSTRUCTION WORKFLOW', y);

  (data.zones || []).forEach((zone, index) => {
    const steps = getZoneWorkflowSteps(zone, dbMethods);
    const tagPaddingX = 2.5;
    const tagHeight = 12.5;
    const tagGapX = 3;
    const tagGapY = 2.5;
    const tagStartX = 20;
    const tagMaxX = 192;
    const tagColumns = 3;
    const availableWidth = tagMaxX - tagStartX;
    const tagWidth = (availableWidth - (tagGapX * (tagColumns - 1))) / tagColumns;
    const titleStartX = tagPaddingX + 8.5;
    const rowCount = Math.max(1, Math.ceil(steps.length / tagColumns));
    const tagsHeight = (rowCount * tagHeight) + ((rowCount - 1) * tagGapY);
    y = ensurePageSpace(doc, y, 10 + tagsHeight + 10);
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    y = writeWrappedText(doc, `> ${zone.zoneName || `區域 ${index + 1}`} / ${getMethodDisplayName(zone.methodId, zone.methodName)}`, 16, y + 4.5, 178, 5);

    if (steps.length) {
      const tags = steps.map((step, stepIndex) => {
        doc.setFontSize(8);
        const title = truncateTextToWidth(doc, step.name, tagWidth - titleStartX - tagPaddingX);
        doc.setFontSize(7);
        const desc = truncateTextToWidth(doc, step.description || '-', tagWidth - titleStartX - tagPaddingX);
        return { order: String(stepIndex + 1).padStart(2, '0'), title, desc };
      });

      let drawY = y + 1.5;
      doc.setFont('NotoSansTC', 'normal');
      tags.forEach((tag, i) => {
        const col = i % tagColumns;
        const row = Math.floor(i / tagColumns);
        const drawX = tagStartX + (col * (tagWidth + tagGapX));
        drawY = y + 1.5 + (row * (tagHeight + tagGapY));

        doc.setFillColor(...PDF_THEME.surface);
        doc.setDrawColor(...PDF_THEME.line);
        doc.setLineWidth(0.25);
        doc.roundedRect(drawX, drawY, tagWidth, tagHeight, 1.2, 1.2, 'FD');
        doc.setFont('NotoSansTC', 'bold');
        doc.setTextColor(...PDF_THEME.textSub);
        doc.setFontSize(8.5);
        doc.text(tag.order, drawX + tagPaddingX, drawY + 4.3);
        doc.setTextColor(...PDF_THEME.textMain);
        doc.setFontSize(8);
        doc.text(tag.title, drawX + titleStartX, drawY + 4.4);
        doc.setDrawColor(...PDF_THEME.line);
        doc.setLineWidth(0.22);
        doc.line(drawX + titleStartX, drawY + 6.1, drawX + titleStartX + 7, drawY + 6.1);
        doc.setFont('NotoSansTC', 'normal');
        doc.setTextColor(...PDF_THEME.textSub);
        doc.setFontSize(7.2);
        doc.text(tag.desc, drawX + titleStartX, drawY + 8.2);
      });
      doc.setFont('NotoSansTC', 'normal');
      doc.setTextColor(...PDF_THEME.textMain);
      y = drawY + tagHeight + 2.5;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      y = writeWrappedText(doc, '  依現場評估流程執行', 20, y + 3, 172, 5);
    }
    doc.setTextColor(30, 30, 30);
    y += 3;
  });
  y += 2;

  y = ensurePageSpace(doc, y, 22);
  y = drawSectionHeader(doc, '品牌材料與特色 / BRAND MATERIALS & FEATURES', y);

  let allRecipes: any[] = [];
  let allMaterials: any[] = [];
  try {
    [allRecipes, allMaterials] = await Promise.all([getRecipes(), getMaterials()]);
  } catch (e) {
    console.warn('Failed to load recipes/materials for PDF', e);
  }

  const usedMethodIds = new Set((data.zones || []).map((z) => z.methodId));
  const relevantRecipes = allRecipes.filter((r) => usedMethodIds.has(r.methodId));
  const relevantMatIds = new Set(relevantRecipes.map((r) => r.materialId));
  const EXCLUDED_CATEGORIES = ['其他'];
  const EXCLUDED_NAMES = ['人事費用'];
  const relevantMaterials = allMaterials.filter((m: any) => relevantMatIds.has(m.id)).filter((m: any) => !EXCLUDED_CATEGORIES.includes(m.category)).filter((m: any) => !EXCLUDED_NAMES.includes(m.name));
  const CATEGORY_GROUP_MAP: Record<string, string> = { '塗料': '防水塗料', '防水材': '防水材', '泥作/結構': '防水材', '填縫/矽利康': '防水材', '工具/設備': '工具', '其他耗材': '耗材' };
  const grouped: Record<string, any[]> = {};
  relevantMaterials.forEach((m: any) => {
    const groupName = CATEGORY_GROUP_MAP[m.category] || m.category || '其他材料';
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(m);
  });
  const groupOrder = ['防水塗料', '防水材', '工具', '耗材'];
  const sortedGroups = Object.keys(grouped).sort((a, b) => ((groupOrder.indexOf(a) === -1 ? 99 : groupOrder.indexOf(a)) - (groupOrder.indexOf(b) === -1 ? 99 : groupOrder.indexOf(b))));

  if (sortedGroups.length > 0) {
    sortedGroups.forEach((groupName) => {
      y = ensurePageSpace(doc, y, 16);
      doc.setFontSize(9);
      doc.text(`[ ${groupName} ]`, 16, y + 4);
      y += 6;
      const matRows = grouped[groupName].map((m: any) => [m.brand || '-', m.name]);
      autoTable(doc, {
        startY: y,
        head: [['品牌 BRAND', '材料 MATERIAL']],
        body: matRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, font: 'NotoSansTC' },
        headStyles: { fillColor: [...PDF_THEME.brandAccent], textColor: 255, font: 'NotoSansTC', fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 40 } },
      });
      y = ((doc as any).lastAutoTable?.finalY || y + 10) + 3;
    });
  }

  getCategoryList(data).forEach((category) => {
    const rule = CATEGORY_MATERIAL_RULES[category] || '依雙方確認材料規格與施作規則執行。';
    y = ensurePageSpace(doc, y, 10);
    y = writeWrappedText(doc, `- ${category}: ${rule}`, 16, y + 4.5, 178, 5);
  });
  y += 4;

  y = ensurePageSpace(doc, y, 30);
  y = drawSectionHeader(doc, '保固說明 / WARRANTY TERMS', y);
  const warrantyLines: string[] = [];
  (data.zones || []).forEach((zone, index) => {
    const method = getMethodById(zone.methodId, dbMethods);
    const zoneName = zone.zoneName || `區域 ${index + 1}`;
    if (method) {
      const effectiveWarrantyType = zone.warrantyType || method.warrantyType;
      const warrantyConfig = resolveMethodWarrantyByType(method, effectiveWarrantyType || 'leak_handled');
      const warrantyText = getMethodWarrantyText(effectiveWarrantyType, warrantyConfig.months, warrantyConfig.visits, warrantyConfig.ignoredText);
      warrantyLines.push(`- ${zoneName} (${zone.methodName}): ${warrantyText}`);
    } else {
      const catWarranty = CATEGORY_WARRANTY_RULES[zone.category as ServiceCategory];
      warrantyLines.push(`- ${zoneName}: ${catWarranty || '保固條件依雙方簽署文件為準。'}`);
    }
  });
  if (warrantyLines.length === 0) warrantyLines.push('- 保固條件依雙方簽署文件為準。');
  warrantyLines.push('- 保固排除: 天災、結構新增裂縫、第三方施工破壞、人為不當使用。');
  warrantyLines.push('- 報價有效期 30 日, 逾期需重新確認材料與工資成本。');
  warrantyLines.push('- 未列入報價項目 (如隱蔽管線、結構損傷擴大、第三方修復) 屬追加範圍。');
  doc.setFontSize(9);
  warrantyLines.forEach((line) => {
    y = ensurePageSpace(doc, y, 10);
    y = writeWrappedText(doc, line, 16, y + 4.5, 178, 5);
  });

  y = ensurePageSpace(doc, y + 8, 26);
  drawSignatureBlock(doc, y, '雙方簽名確認 / SIGNATURES', '業主簽名 / Client', '承攬方簽名 / Contractor');
  drawFooter(doc);
  outputPDF(doc, `QUOTATION_${displayId}.pdf`, mode);
};

export const generateContractPDF = async (data: CaseData, mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);
  const dbMethods = await loadDbMethods();
  setupDocument(doc, 'SERVICE CONTRACT', '工程承攬合約書');

  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  const baseSubtotal = (data.zones || []).reduce((sum, zone) => sum + getZoneSubtotal(zone), 0);
  const adjustment = data.manualPriceAdjustment || 0;
  const total = data.finalPrice || (baseSubtotal + adjustment);
  const { depositRatio, finalRatio, depositPercent, finalPercent } = getPaymentBreakdown(total, data.depositPercentage);
  const projectDays = getProjectDurationDays(data);
  const startDate = data.startDate ? formatDate(data.startDate) : '待雙方確認';
  const expectedEndDate = data.startDate ? formatDate(new Date(new Date(data.startDate).getTime() + (projectDays - 1) * 24 * 60 * 60 * 1000).toISOString()) : '依排程確認';

  let y = 45;
  doc.setFontSize(10);
  doc.text('甲方 (業主) / CLIENT', 14, y);
  doc.text(`${data.customerName}`, 14, y + 6);
  doc.text(`地址 / ADDRESS: ${data.address || '-'}`, 14, y + 12);
  doc.text(`電話 / PHONE: ${data.phone || '-'}`, 14, y + 18);
  doc.text(`現場聯絡 / SITE: ${data.siteContactName || data.customerName || '-'} / ${data.siteContactPhone || data.phone || '-'}`, 14, y + 24);
  doc.text('乙方 (承攬) / CONTRACTOR', 110, y);
  doc.text(`${COMPANY_NAME}`, 110, y + 6);
  doc.text(`${COMPANY_ID}`, 110, y + 12);
  doc.text(`合約編號 / CONTRACT NO: ${displayId}`, 110, y + 18);
  doc.text(`簽約日期 / SIGN DATE: ${formatDate(data.contractSignedDate || data.createdDate)}`, 110, y + 24);

  y = 78;
  y = drawSectionHeader(doc, '一、工程範圍（與評估表一致） / SCOPE', y);
  autoTable(doc, {
    startY: y + 2,
    head: [['區域', '工法', '施作內容']],
    body: (data.zones || []).map((zone, index) => {
      const steps = getZoneWorkflowSteps(zone, dbMethods).map((step) => step.name).join(' -> ') || '依現勘評估內容';
      return [`${index + 1}. ${zone.zoneName || `區域 ${index + 1}`}`, getMethodDisplayName(zone.methodId, zone.methodName), steps];
    }),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, font: 'NotoSansTC' },
    headStyles: { fillColor: [...PDF_THEME.headerBg], textColor: 255, font: 'NotoSansTC', fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 35 } },
  });
  y = ((doc as any).lastAutoTable?.finalY || y + 40) + 8;
  y = ensurePageSpace(doc, y, 30);
  y = drawSectionHeader(doc, '二、工程總價與工期 / PRICE & SCHEDULE', y);
  doc.setFillColor(...PDF_THEME.surface);
  doc.rect(14, y - 1, 182, 18, 'F');
  doc.setFontSize(10);
  y = writeWrappedText(doc, `1) 合約總價：${formatCurrency(total)}（含稅）`, 16, y + 4, 178, 5);
  y = writeWrappedText(doc, `2) 預定工期：約 ${projectDays} 天，預定開工 ${startDate}，預定完工 ${expectedEndDate}。`, 16, y, 178, 5);
  y = writeWrappedText(doc, `3) 付款：訂金 ${depositPercent}%（${formatCurrency(Math.round(total * depositRatio))}），尾款 ${finalPercent}%（${formatCurrency(Math.round(total * finalRatio))}）。`, 16, y, 178, 5);

  y += 4;
  y = ensurePageSpace(doc, y, 40);
  y = drawSectionHeader(doc, '三、驗收標準與保固 / ACCEPTANCE & WARRANTY', y);
  const contractWarrantyLines: string[] = [
    '1) 驗收標準：施工區域完成後應達無明顯滲漏、鼓起、剝落；表面平整且收邊完整。',
    '2) 驗收程序：甲乙雙方現場共同點交，未完成項目由乙方限期改善。',
  ];
  (data.zones || []).forEach((zone, index) => {
    const method = getMethodById(zone.methodId, dbMethods);
    const zoneName = zone.zoneName || `區域 ${index + 1}`;
    if (method) {
      const effectiveWarrantyType = zone.warrantyType || method.warrantyType;
      const warrantyConfig = resolveMethodWarrantyByType(method, effectiveWarrantyType || 'leak_handled');
      const warrantyText = getMethodWarrantyText(effectiveWarrantyType, warrantyConfig.months, warrantyConfig.visits, warrantyConfig.ignoredText);
      contractWarrantyLines.push(`${contractWarrantyLines.length + 1}) ${zoneName} (${zone.methodName}): ${warrantyText}`);
    } else {
      const catWarranty = CATEGORY_WARRANTY_RULES[zone.category as ServiceCategory];
      contractWarrantyLines.push(`${contractWarrantyLines.length + 1}) ${catWarranty || '保固條件依雙方簽署文件為準。'}`);
    }
  });
  contractWarrantyLines.push(`${contractWarrantyLines.length + 1}) 保固排除: 天災、結構新增裂縫、第三方施工破壞、人為不當使用、未按建議保養者。`);
  contractWarrantyLines.forEach((line) => {
    y = ensurePageSpace(doc, y, 10);
    y = writeWrappedText(doc, line, 16, y, 178, 5);
  });

  y += 4;
  y = ensurePageSpace(doc, y, 45);
  y = drawSectionHeader(doc, '四、權利義務、毀約與爭議 / RIGHTS, BREACH & JURISDICTION', y);
  const legalTerms = [
    '1) 甲方應提供施工必要之作業空間與用電用水，並依約支付工程款。',
    '2) 乙方應依估價與工法流程施工，確保施工安全與品質。',
    '3) 任一方違約致契約無法履行，應賠償對方因此所受損害。',
    '4) 因不可抗力致工期延誤，雙方應另行書面協調展延。',
    '5) 爭議處理：雙方先行協商；協商不成，以臺灣臺北地方法院為第一審管轄法院。',
    `6) 其他約定：${data.specialNote || '無'}`,
  ];
  legalTerms.forEach((line) => {
    y = ensurePageSpace(doc, y, 10);
    y = writeWrappedText(doc, line, 16, y, 178, 5);
  });

  y = ensurePageSpace(doc, y + 10, 30);
  drawSignatureBlock(doc, y, '立合約書人簽署 / SIGNATURES', '甲方簽章 (Client)', '乙方簽章 (Contractor)');
  drawFooter(doc);
  outputPDF(doc, `CONTRACT_${displayId}.pdf`, mode);
};

export const generateInvoicePDF = async (data: CaseData, type: 'DEPOSIT' | 'FINAL', mode: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  await loadFont(doc);
  setupDocument(doc, type === 'DEPOSIT' ? 'DEPOSIT PAYMENT REQUEST' : 'FINAL PAYMENT REQUEST', type === 'DEPOSIT' ? '頭期款請款單' : '尾款請款單');

  const total = data.finalPrice;
  const { depositPercent, finalPercent, depositAmount: deposit, finalAmount: final } = getPaymentBreakdown(total, data.depositPercentage);
  doc.setFillColor(...PDF_THEME.surface);
  doc.rect(14, 45, 182, 25, 'F');
  doc.setFontSize(10);
  const displayId = getDisplayCaseId(data.caseId, data.customerName);
  doc.text(`客戶名稱 / BILL TO: ${data.customerName}`, 20, 55);
  doc.text(`案件編號 / CASE NO: ${displayId}`, 20, 62);
  doc.text(`開立日期 / DATE: ${formatDate(new Date().toISOString())}`, 120, 55);
  doc.text(`發票抬頭 / TITLE: ${data.invoiceTitle || data.customerName}`, 120, 62);
  doc.text(`付款日期 / PAYMENT DATE: ${formatDate(type === 'DEPOSIT' ? (data.depositReceivedDate || '') : (data.finalPaymentReceivedDate || ''))}`, 120, 69);

  const tableBody = type === 'DEPOSIT'
    ? [['工程總價 / TOTAL PROJECT VALUE', formatCurrency(total)], [`本次請款: 訂金 (${depositPercent}%) / DEPOSIT DUE`, formatCurrency(deposit)], ['( 餘額待完工驗收後支付 / Balance upon completion )', formatCurrency(final)]]
    : [['工程總價 / TOTAL PROJECT VALUE', formatCurrency(total)], ['已付訂金 / LESS: DEPOSIT PAID', `-${formatCurrency(deposit)}`], [`本次請款: 尾款 (${finalPercent}%) / FINAL PAYMENT DUE`, formatCurrency(final)]];

  autoTable(doc, {
    startY: 86,
    head: [['項目說明 / DESCRIPTION', '金額 / AMOUNT (TWD)']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 11, cellPadding: 8, font: 'NotoSansTC' },
    headStyles: { fillColor: [...PDF_THEME.headerBg], textColor: 255, font: 'NotoSansTC', fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
  });

  let bankY = ((doc as any).lastAutoTable?.finalY || 120) + 14;
  bankY = ensurePageSpace(doc, bankY, 34, 24);
  bankY = drawSectionHeader(doc, '匯款資訊 / PAYMENT DETAILS', bankY);
  doc.setFillColor(...PDF_THEME.surface);
  doc.rect(14, bankY - 1, 182, 24, 'F');
  doc.setFontSize(10);
  doc.text(`銀行代碼: ${BANK_CODE} (${BANK_NAME})`, 16, bankY + 6);
  doc.text(`銀行帳號: ${BANK_ACCOUNT}`, 16, bankY + 12);
  doc.text(`戶名: ${COMPANY_NAME}`, 16, bankY + 18);

  if (data.paymentNote) {
    let noteY = bankY + 28;
    noteY = ensurePageSpace(doc, noteY, 14, 24);
    drawSectionHeader(doc, '付款說明 / PAYMENT NOTE', noteY);
    doc.setFontSize(9.5);
    doc.text(data.paymentNote, 16, noteY + 10);
  }

  drawFooter(doc);
  outputPDF(doc, `INVOICE_${type}_${displayId}.pdf`, mode);
};
