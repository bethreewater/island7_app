import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Layout } from '../components/Layout';
import { Card, Button } from '../components/InputComponents';
import { getCases, getMethods } from '../services/storageService';
import { Download, Database, Server, Book, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SettingsProps {
    onNavigate?: (view: 'dashboard' | 'datacenter' | 'settings') => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
    const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected'>('disconnected');
    const [stats, setStats] = useState({ cases: 0, methods: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSystem();
    }, []);

    const checkSystem = async () => {
        try {
            const [casesData, methodsData] = await Promise.all([
                getCases(),
                getMethods()
            ]);
            setStats({ cases: casesData.length, methods: methodsData.length });
            setDbStatus('connected');
        } catch (e) {
            console.error(e);
            setDbStatus('disconnected');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const cases = await getCases();
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
                            <Button variant="outline" onClick={() => onNavigate?.('dashboard')} className="w-full flex items-center justify-center gap-2 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50">
                                <Book size={16} /> 返回前往技術手冊 / GO TO KB
                            </Button>
                            <div className="text-[10px] text-zinc-400 text-center pt-2">
                                (由 Dashboard &gt; KB 進入 / Access via Dashboard &gt; KB)
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
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`}
                                    alt="Connection QR Code"
                                    className="w-32 h-32 opacity-90"
                                />
                            </div>
                            <div className="text-[10px] text-zinc-300 font-mono break-all text-center px-4">
                                {window.location.href}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Footer */}
                <div className="text-center pt-10 pb-5">
                    <div className="text-[10px] text-zinc-300 font-mono tracking-widest">ISLAND NO.7 ENGINEERING SYSTEM</div>
                </div>

            </div>
        </Layout>
    );
};
