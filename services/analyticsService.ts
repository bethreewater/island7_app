import { CaseData, MethodItem, ScheduleTask, ConstructionLog, CaseStatus } from '../types';

export interface MethodPerformance {
    methodName: string;
    methodId: string;
    totalCases: number;
    onTimeCases: number;
    delayedCases: number;
    onTimeRate: number; // 百分比
    avgActualDays: number;
    avgExpectedDays: number;
}

export interface DelayedCaseInfo {
    caseId: string;
    customerName: string;
    delayDays: number;
    methodName: string;
    status: CaseStatus;
}

/**
 * 判斷案件是否準時完工
 */
const isCaseOnTime = (caseData: CaseData): boolean => {
    if (!caseData.schedule || caseData.schedule.length === 0) {
        return true; // 沒有排程，視為準時
    }

    const today = new Date().toISOString().slice(0, 10);

    // 檢查是否有逾期未完成的任務
    const hasOverdueTasks = caseData.schedule.some(task =>
        !task.isCompleted && task.date < today
    );

    // 檢查施工日誌是否有延期記錄
    const hasDelayLogs = (caseData.logs || []).some(log =>
        log.delayDays && log.delayDays > 0
    );

    return !hasOverdueTasks && !hasDelayLogs;
};

/**
 * 計算案件實際施工天數
 */
const getActualConstructionDays = (caseData: CaseData): number => {
    if (!caseData.logs || caseData.logs.length === 0) {
        return 0;
    }

    const dates = caseData.logs.map(log => log.date).sort();
    if (dates.length === 0) return 0;

    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);

    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 包含首尾日

    return diffDays;
};

/**
 * 取得案件的延期天數
 */
const getCaseDelayDays = (caseData: CaseData): number => {
    // 從施工日誌取得延期天數
    const logDelays = (caseData.logs || [])
        .filter(log => log.delayDays && log.delayDays > 0)
        .reduce((sum, log) => sum + (log.delayDays || 0), 0);

    if (logDelays > 0) return logDelays;

    // 檢查逾期未完成的任務
    if (!caseData.schedule || caseData.schedule.length === 0) return 0;

    const today = new Date().toISOString().slice(0, 10);
    const overdueTasks = caseData.schedule.filter(task =>
        !task.isCompleted && task.date < today
    );

    if (overdueTasks.length === 0) return 0;

    // 計算最早逾期任務的天數
    const earliestOverdue = overdueTasks
        .map(task => task.date)
        .sort()[0];

    const overdueDate = new Date(earliestOverdue);
    const todayDate = new Date(today);
    const diffTime = todayDate.getTime() - overdueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

/**
 * 分析工法表現
 */
export const analyzeMethodPerformance = (
    cases: CaseData[],
    methods: MethodItem[]
): MethodPerformance[] => {
    // 只分析已完工或進行中的案件
    const relevantStatuses = [
        CaseStatus.CONSTRUCTION,
        CaseStatus.FINAL_PAYMENT,
        CaseStatus.COMPLETED,
        CaseStatus.WARRANTY,
        CaseStatus.PROGRESS,
        CaseStatus.DONE
    ];

    const relevantCases = cases.filter(c =>
        relevantStatuses.includes(c.status as CaseStatus) && c.zones && c.zones.length > 0
    );

    // 按工法分組統計
    const methodStats = new Map<string, {
        methodId: string;
        methodName: string;
        cases: CaseData[];
        onTimeCases: number;
        totalDays: number;
    }>();

    relevantCases.forEach(caseData => {
        caseData.zones.forEach(zone => {
            if (!zone.methodId || !zone.methodName) return;

            if (!methodStats.has(zone.methodId)) {
                methodStats.set(zone.methodId, {
                    methodId: zone.methodId,
                    methodName: zone.methodName,
                    cases: [],
                    onTimeCases: 0,
                    totalDays: 0
                });
            }

            const stats = methodStats.get(zone.methodId)!;

            // 避免重複計算同一案件
            if (!stats.cases.find(c => c.caseId === caseData.caseId)) {
                stats.cases.push(caseData);
                if (isCaseOnTime(caseData)) {
                    stats.onTimeCases++;
                }
                stats.totalDays += getActualConstructionDays(caseData);
            }
        });
    });

    // 轉換為 MethodPerformance 陣列
    const performance: MethodPerformance[] = [];

    methodStats.forEach((stats, methodId) => {
        const method = methods.find(m => m.id === methodId);
        const totalCases = stats.cases.length;
        const onTimeCases = stats.onTimeCases;
        const delayedCases = totalCases - onTimeCases;
        const onTimeRate = totalCases > 0 ? (onTimeCases / totalCases) * 100 : 0;
        const avgActualDays = totalCases > 0 ? stats.totalDays / totalCases : 0;
        const avgExpectedDays = method?.estimatedDays || 7;

        performance.push({
            methodName: stats.methodName,
            methodId,
            totalCases,
            onTimeCases,
            delayedCases,
            onTimeRate,
            avgActualDays: Math.round(avgActualDays),
            avgExpectedDays
        });
    });

    // 依案件數排序
    return performance.sort((a, b) => b.totalCases - a.totalCases);
};

/**
 * 取得所有延期案件
 */
export const getDelayedCases = (cases: CaseData[]): DelayedCaseInfo[] => {
    const delayed: DelayedCaseInfo[] = [];

    cases.forEach(caseData => {
        const delayDays = getCaseDelayDays(caseData);

        if (delayDays > 0) {
            // 取得主要工法名稱
            const primaryMethod = caseData.zones && caseData.zones.length > 0
                ? caseData.zones[0].methodName
                : '未指定工法';

            delayed.push({
                caseId: caseData.caseId,
                customerName: caseData.customerName,
                delayDays,
                methodName: primaryMethod,
                status: caseData.status
            });
        }
    });

    // 依延期天數排序（最嚴重的在前）
    return delayed.sort((a, b) => b.delayDays - a.delayDays);
};

/**
 * 計算整體準時完工率
 */
export const calculateOverallOnTimeRate = (cases: CaseData[]): number => {
    const relevantStatuses = [
        CaseStatus.COMPLETED,
        CaseStatus.WARRANTY,
        CaseStatus.DONE
    ];

    const completedCases = cases.filter(c => relevantStatuses.includes(c.status as CaseStatus));

    if (completedCases.length === 0) return 100;

    const onTimeCases = completedCases.filter(c => isCaseOnTime(c)).length;

    return (onTimeCases / completedCases.length) * 100;
};

/**
 * 計算平均施工天數
 */
export const calculateAvgConstructionDays = (cases: CaseData[]): number => {
    const relevantStatuses = [
        CaseStatus.COMPLETED,
        CaseStatus.WARRANTY,
        CaseStatus.DONE
    ];

    const completedCases = cases.filter(c =>
        relevantStatuses.includes(c.status as CaseStatus) && c.logs && c.logs.length > 0
    );

    if (completedCases.length === 0) return 0;

    const totalDays = completedCases.reduce((sum, c) => sum + getActualConstructionDays(c), 0);

    return Math.round(totalDays / completedCases.length);
};
