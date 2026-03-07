import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { Layout } from '../components/Layout';
import { Card, Button } from '../components/InputComponents';
import { getCases, getCasesBackup, getMethods } from '../services/storageService';
import { Download, Database, Server, Book, AlertTriangle, ShieldCheck } from 'lucide-react';
import { CaseStatus, NavigationView } from '../types';

interface SettingsProps {
    onNavigate?: (view: NavigationView) => void;
}

interface HealthReport {
    checkedAt: string;
    totalCases: number;
    totalMethods: number;
    duplicateCaseIds: number;
    unknownStatusCases: number;
    invalidDateCases: number;
    missingAddressCases: number;
    missingLocationCases: number;
    emptyZoneCases: number;
    methodsMissingWarrantyConfig: number;
    methodsMissingSteps: number;
    issueCount: number;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
    const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected'>('disconnected');
    const [stats, setStats] = useState({ cases: 0, methods: 0 });
    const [loading, setLoading] = useState(true);
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

    const currentUrl = `${window.location.origin}${window.location.pathname}`;

    useEffect(() => {
        checkSystem();
    }, []);

    useEffect(() => {
        let mounted = true;
        const generateQr = async () => {
            try {
                const dataUrl = await QRCode.toDataURL(currentUrl, {
                    width: 150,
                    margin: 1,
                    errorCorrectionLevel: 'M',
                });
                if (mounted) setQrCodeDataUrl(dataUrl);
            } catch (error) {
                console.error('Failed to generate QR code:', error);
            }
        };

        void generateQr();

        return () => {
            mounted = false;
        };
    }, [currentUrl]);

    const checkSystem = async () => {
        try {
            const [casesData, methodsData] = await Promise.all([
                getCases(),
                getMethods()
            ]);
            setStats({ cases: casesData.length, methods: methodsData.length });
            setDbStatus('connected');
            runHealthCheck();
        } catch (e) {
            console.error(e);
            setDbStatus('disconnected');
        } finally {
            setLoading(false);
        }
    };

    const runHealthCheck = async () => {
        setHealthLoading(true);
        try {
            const [fullCases, methodsData] = await Promise.all([
                getCasesBackup(),
                getMethods(),
            ]);

            const validStatuses = new Set(Object.values(CaseStatus));
            const caseIdCounter = new Map<string, number>();
            fullCases.forEach((c) => {
                caseIdCounter.set(c.caseId, (caseIdCounter.get(c.caseId) || 0) + 1);
            });

            const duplicateCaseIds = Array.from(caseIdCounter.values()).filter((count) => count > 1).length;
            const unknownStatusCases = fullCases.filter((c) => !validStatuses.has(c.status as CaseStatus)).length;
            const invalidDateCases = fullCases.filter((c) => Number.isNaN(new Date(c.createdDate).getTime())).length;
            const missingAddressCases = fullCases.filter((c) => !c.address || !c.address.trim()).length;
            const missingLocationCases = fullCases.filter((c) => {
                const hasAddress = Boolean(c.address && c.address.trim());
                const hasLocation = typeof c.latitude === 'number' && typeof c.longitude === 'number';
                return hasAddress && !hasLocation;
            }).length;
            const emptyZoneCases = fullCases.filter((c) => !c.zones || c.zones.length === 0).length;

            const methodsMissingWarrantyConfig = methodsData.filter((m) =>
                m.warrantyHandledMonths == null ||
                m.warrantyUnhandledMonths == null ||
                m.warrantyUnhandledVisits == null ||
                !m.warrantyIgnoredText
            ).length;

            const methodsMissingSteps = methodsData.filter((m) => !m.steps || m.steps.length === 0).length;

            const issueCount = duplicateCaseIds + unknownStatusCases + invalidDateCases + missingAddressCases + missingLocationCases + emptyZoneCases + methodsMissingWarrantyConfig + methodsMissingSteps;

            setHealthReport({
                checkedAt: new Date().toISOString(),
                totalCases: fullCases.length,
                totalMethods: methodsData.length,
                duplicateCaseIds,
                unknownStatusCases,
                invalidDateCases,
                missingAddressCases,
                missingLocationCases,
                emptyZoneCases,
                methodsMissingWarrantyConfig,
                methodsMissingSteps,
                issueCount,
            });
        } catch (e) {
            console.error(e);
            toast.error('健康檢查失敗 / HEALTH CHECK FAILED', { duration: 5000 });
        } finally {
            setHealthLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const cases = await getCasesBackup();
            const dataStr = JSON.stringify(cases, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `island7_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            toast.error('匯出失敗 / Export Failed', { duration: 5000 });
        }
    };

    return (
        <Layout
            title="系統設定 / SETTINGS"
            onNavigate={onNavigate}
            currentView="settings"
        >
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

                {/* Connection Status */}
                <Card title="系統狀態 / SYSTEM STATUS">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-lg">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dbStatus === 'connected' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                <Server size={24} />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">CLOUD DATABASE</div>
                                <div className="font-black text-lg flex items-center gap-2">
                                    SUPABASE
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${dbStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {dbStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-lg">
                            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-600">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">SYSTEM VERSION</div>
                                <div className="font-black text-lg">v1.0.0 PRO</div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Database Stats */}
                <Card title="資料庫統計 / DATABASE STATISTICS">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-6 bg-zinc-50 rounded-lg">
                            <div className="text-3xl font-black text-zinc-900">{loading ? '-' : stats.cases}</div>
                            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">TOTAL CASES</div>
                        </div>
                        <div className="text-center p-6 bg-zinc-50 rounded-lg">
                            <div className="text-3xl font-black text-zinc-900">{loading ? '-' : stats.methods}</div>
                            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">METHOD CATALOG</div>
                        </div>
                    </div>
                </Card>

                {/* Utilities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="資料管理 / DATA MANAGEMENT">
                        <div className="space-y-4">
                            <p className="text-sm text-zinc-500">
                                您可以將所有案件資料匯出為 JSON 格式進行本地備份。
                                <br /><span className="text-xs opacity-60">You can export all case data as JSON for local backup.</span>
                            </p>
                            <Button onClick={handleExport} className="w-full flex items-center justify-center gap-2">
                                <Download size={16} /> 匯出備份 / EXPORT DATA
                            </Button>
                        </div>
                    </Card>

                    <Card title="捷徑 / SHORTCUTS">
                        <div className="space-y-4">
                            <p className="text-sm text-zinc-500">
                                快速存取工程技術手冊以查看或編輯施工方案。
                                <br /><span className="text-xs opacity-60">Quick access to the technical manual.</span>
                            </p>
                            <Button variant="outline" onClick={() => onNavigate?.('kb')} className="w-full flex items-center justify-center gap-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50">
                                <Book size={16} /> 返回前往技術手冊 / GO TO KB
                            </Button>
                            <div className="text-[10px] text-zinc-400 text-center pt-2">
                                (直接前往知識庫 / Direct to KB)
                            </div>
                        </div>
                    </Card>

                    <Card title="行動連線 / MOBILE CONNECT">
                        <div className="flex flex-col items-center space-y-4">
                            <p className="text-sm text-zinc-500 text-center">
                                掃描 QR Code 即可在手機上開啟系統。
                                <br /><span className="text-xs opacity-60">Scan to open on mobile device.</span>
                            </p>
                            <div className="bg-white p-2 border border-zinc-100 rounded-lg shadow-sm">
                                {qrCodeDataUrl ? (
                                    <img
                                        src={qrCodeDataUrl}
                                        alt="Connection QR Code"
                                        className="w-32 h-32 opacity-90"
                                    />
                                ) : (
                                    <div className="w-32 h-32 bg-zinc-100 animate-pulse" />
                                )}
                            </div>
                            <div className="text-[10px] text-zinc-300 font-mono break-all text-center px-4">
                                {currentUrl}
                            </div>
                        </div>
                    </Card>
                </div>

                <Card
                    title="系統健康檢查 / HEALTH CHECK"
                    action={
                        <Button variant="outline" onClick={runHealthCheck} disabled={healthLoading}>
                            {healthLoading ? '檢查中 / CHECKING...' : '重新檢查 / RE-CHECK'}
                        </Button>
                    }
                >
                    {healthReport ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-zinc-100 rounded-lg bg-zinc-50">
                                <div>
                                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">HEALTH SCORE</div>
                                    <div className="text-2xl font-black mt-1">{healthReport.issueCount === 0 ? 'GOOD' : `${healthReport.issueCount} ISSUES`}</div>
                                </div>
                                <div className={`text-xs px-3 py-1 rounded-full font-black ${healthReport.issueCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {healthReport.issueCount === 0 ? 'PASS' : 'NEEDS REVIEW'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <HealthItem label="案件總數" value={healthReport.totalCases} />
                                <HealthItem label="方案總數" value={healthReport.totalMethods} />
                                <HealthItem label="重複案件編號" value={healthReport.duplicateCaseIds} warn />
                                <HealthItem label="未知狀態案件" value={healthReport.unknownStatusCases} warn />
                                <HealthItem label="建立日期異常" value={healthReport.invalidDateCases} warn />
                                <HealthItem label="缺地址案件" value={healthReport.missingAddressCases} warn />
                                <HealthItem label="缺座標案件" value={healthReport.missingLocationCases} warn />
                                <HealthItem label="無施工區域案件" value={healthReport.emptyZoneCases} warn />
                                <HealthItem label="保固設定不完整方案" value={healthReport.methodsMissingWarrantyConfig} warn />
                                <HealthItem label="無工序方案" value={healthReport.methodsMissingSteps} warn />
                            </div>

                            <div className="text-[10px] text-zinc-400">
                                最後檢查時間 / LAST CHECK: {new Date(healthReport.checkedAt).toLocaleString()}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-zinc-500">尚未建立健康報告，請按「重新檢查」。</div>
                    )}
                </Card>

                {/* Footer */}
                <div className="text-center pt-10 pb-5">
                    <div className="text-[10px] text-zinc-300 font-mono tracking-widest">ISLAND NO.7 ENGINEERING SYSTEM</div>
                </div>

            </div>
        </Layout>
    );
};

const HealthItem: React.FC<{ label: string; value: number | string; warn?: boolean }> = ({ label, value, warn = false }) => {
    const hasIssue = warn && Number(value) > 0;
    return (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${hasIssue ? 'border-amber-200 bg-amber-50' : 'border-zinc-100 bg-white'}`}>
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{label}</div>
            <div className={`font-black ${hasIssue ? 'text-amber-700' : 'text-zinc-900'}`}>{value}</div>
        </div>
    );
};
