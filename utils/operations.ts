import { CaseData, CaseStatus, normalizeCaseStatus } from '../types';

export const getTodayString = () => new Date().toISOString().slice(0, 10);

export const hasMissingLocation = (item: CaseData) => Boolean(item.address?.trim()) && (typeof item.latitude !== 'number' || typeof item.longitude !== 'number');
export const hasPendingDeposit = (item: CaseData) => normalizeCaseStatus(item.status) !== CaseStatus.ASSESSMENT && !item.depositReceivedDate;
export const hasPendingFinalPayment = (item: CaseData) => normalizeCaseStatus(item.status) === CaseStatus.FINAL_PAYMENT && !item.finalPaymentReceivedDate;
export const hasPendingWarrantyVisit = (item: CaseData) => (item.warrantyRecords || []).some((record) => record.nextVisitDate && !record.result?.trim());
export const hasOverdueWarrantyVisit = (item: CaseData, today = getTodayString()) => (item.warrantyRecords || []).some((record) => record.nextVisitDate && record.nextVisitDate < today && !record.result?.trim());
export const hasUpcomingWarrantyVisit = (item: CaseData, today = getTodayString(), nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)) =>
  (item.warrantyRecords || []).some((record) => record.nextVisitDate && record.nextVisitDate >= today && record.nextVisitDate <= nextWeek && !record.result?.trim());

export const buildOperationQueues = (cases: CaseData[]) => {
  const today = getTodayString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    missingLocation: cases.filter(hasMissingLocation),
    pendingDeposit: cases.filter(hasPendingDeposit),
    pendingFinalPayment: cases.filter(hasPendingFinalPayment),
    pendingWarrantyVisit: cases.filter(hasPendingWarrantyVisit),
    overdueWarrantyVisit: cases.filter((item) => hasOverdueWarrantyVisit(item, today)),
    upcomingWarrantyVisit: cases.filter((item) => hasUpcomingWarrantyVisit(item, today, nextWeek)),
  };
};
