
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/InputComponents';
import { getAnalyticsData, subscribeToCases } from '../services/storageService';
import { CaseData, CaseStatus, ServiceCategory } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Calculator, TrendingUp, Users, Activity, Shield, FolderOpen } from 'lucide-react';


interface DataCenterProps {
    cases: CaseData[];
    onNavigate?: (view: 'dashboard' | 'datacenter' | 'settings') => void;
}

export const DataCenter: React.FC<DataCenterProps> = ({ cases = [], onNavigate }) => {
    // const [cases, setCases] = useState<CaseData[]>([]); // Lifted
    // const [loading, setLoading] = useState(true); // Lifted

    // Removed useEffect fetching logic


    const metrics = useMemo(() => {
        const assessmentCases = cases.filter(c => c.status === CaseStatus.ASSESSMENT || c.status === CaseStatus.NEW).length;
        const activeStatuses = [CaseStatus.DEPOSIT_RECEIVED, CaseStatus.PLANNING, CaseStatus.CONSTRUCTION, CaseStatus.FINAL_PAYMENT, CaseStatus.PROGRESS];
        const activeCases = cases.filter(c => activeStatuses.includes(c.status as CaseStatus)).length;
        const warrantyCases = cases.filter(c => c.status === CaseStatus.WARRANTY).length;
        const totalRevenue = cases.reduce((sum, c) => sum + (c.finalPrice || 0), 0);

        return { assessmentCases, activeCases, warrantyCases, totalRevenue };
    }, [cases]);

    const statusData = useMemo(() => {
        const counts = cases.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return [
            { name: '新案件 / New', value: counts[CaseStatus.NEW] || 0, color: '#3b82f6' },
            { name: '進行中 / Progress', value: counts[CaseStatus.PROGRESS] || 0, color: '#eab308' },
            { name: '已完工 / Done', value: counts[CaseStatus.DONE] || 0, color: '#22c55e' },
            { name: '保固中 / Warranty', value: counts[CaseStatus.WARRANTY] || 0, color: '#a855f7' },
        ].filter(d => d.value > 0);
    }, [cases]);

    const categoryData = useMemo(() => {
        // Group by first zone category as a proxy for case type
        const groups = cases.reduce((acc, c) => {
            const cat = c.zones?.[0]?.category || 'Unknown';
            if (!acc[cat]) acc[cat] = { name: cat, value: 0, count: 0 };
            acc[cat].value += (c.finalPrice || 0);
            acc[cat].count += 1;
            return acc;
        }, {} as Record<string, { name: string, value: number, count: number }>);

        return Object.values(groups).sort((a: any, b: any) => b.value - a.value);
    }, [cases]);

    return (
        <Layout
            title="數據中心 / DATA CENTER"
            onNavigate={onNavigate}
            currentView="datacenter"
        >
            <div className="space-y-6 animate-in fade-in duration-500">
                <OverviewTab cases={cases} metrics={metrics} statusData={statusData} categoryData={categoryData} loading={false} />
            </div>
        </Layout>
    );
};

const OverviewTab = ({ cases, metrics, statusData, categoryData, loading }: any) => (
    <div className="space-y-8 animate-in slide-in-from-right duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={<FolderOpen size={20} />} label="評估中 / ASSESSMENT" value={metrics.assessmentCases} subtext="New Leads" loading={loading} />
            <MetricCard icon={<Activity size={20} />} label="進行中 / ACTIVE" value={metrics.activeCases} subtext="In Progress" loading={loading} />
            <MetricCard icon={<Shield size={20} />} label="保固中 / WARRANTY" value={metrics.warrantyCases} subtext="Completed" loading={loading} />
            <MetricCard icon={<TrendingUp size={20} />} label="預估總營收 / REVENUE" value={metrics.totalRevenue} prefix="$" subtext="Total Value" highlight loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="案件狀態分佈 / STATUS DISTRIBUTION">
                <div className="h-[300px] w-full flex items-center justify-center">
                    {loading ? (
                        <div className="w-full h-full bg-zinc-50 animate-pulse rounded-full scale-75 opacity-50"></div>
                    ) : statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-gray-400 text-sm">無資料 / NO DATA</div>
                    )}
                </div>
            </Card>

            <Card title="工程類別營收排行 / REVENUE BY CATEGORY">
                <div className="h-[300px] w-full min-h-[300px]">
                    {loading ? (
                        <div className="space-y-4 pt-4 px-4 w-full h-full flex flex-col justify-center animate-pulse">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="w-20 h-4 bg-zinc-100 rounded-sm"></div>
                                    <div className="flex-1 h-6 bg-zinc-100 rounded-sm" style={{ width: `${100 - i * 15}%` }}></div>
                                </div>
                            ))}
                        </div>
                    ) : categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                            <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <XAxis type="number" tickFormatter={(value) => `$${value / 1000}k`} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                <Bar dataKey="value" fill="#18181b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-gray-400 text-sm flex items-center justify-center h-full">無資料 / NO DATA</div>
                    )}
                </div>
            </Card>
        </div>
    </div>
);


const useCountUp = (end: number, duration: number = 1500) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Ease Out Expo
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setCount(Math.floor(easeProgress * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
};

const MetricCard = ({ icon, label, value, subtext, highlight = false, loading = false, prefix = '' }: any) => {
    // Only animate if value is a number
    const isNumber = typeof value === 'number';
    const animatedValue = isNumber ? useCountUp(value) : value;
    const displayValue = isNumber ? `${prefix}${animatedValue.toLocaleString()}` : value;

    return (
        <div className={`p-5 rounded-lg border ${highlight ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-100'} shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all hover:scale-[1.02]`}>
            {loading && <div className="absolute inset-0 bg-white/50 z-20 animate-pulse"></div>}
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-md ${highlight ? 'bg-white/20' : 'bg-gray-100'} ${loading ? 'opacity-50' : ''}`}>
                    {icon}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${highlight ? 'text-gray-400' : 'text-gray-400'}`}>{subtext}</span>
            </div>
            <div>
                {loading ? (
                    <div className={`h-8 w-24 rounded mb-2 ${highlight ? 'bg-white/20' : 'bg-zinc-100'}`}></div>
                ) : (
                    <div className="text-2xl md:text-3xl font-black tracking-tight">{displayValue}</div>
                )}
                <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${highlight ? 'text-gray-300' : 'text-gray-500'}`}>{label}</div>
            </div>
        </div>
    );
};
