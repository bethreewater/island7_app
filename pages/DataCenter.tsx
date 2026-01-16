
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/InputComponents';
import { getCases, subscribeToCases } from '../services/storageService';
import { CaseData, CaseStatus, ServiceCategory } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Calculator, TrendingUp, Users, Activity } from 'lucide-react';


interface DataCenterProps {
    onNavigate?: (view: 'dashboard' | 'datacenter' | 'settings') => void;
}

export const DataCenter: React.FC<DataCenterProps> = ({ onNavigate }) => {
    const [cases, setCases] = useState<CaseData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // subscribeToCases returns a subscription object, and callback takes no args
        const subscription = subscribeToCases(() => {
            loadData();
        });

        // Cleanup: subscription.unsubscribe()
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loadData = async () => {
        try {
            const data = await getCases();
            setCases(data);
        } catch (error) {
            console.error('Failed to load cases:', error);
        } finally {
            setLoading(false);
        }
    };

    const metrics = useMemo(() => {
        const totalCases = cases.length;
        const totalRevenue = cases.reduce((sum, c) => sum + (c.finalPrice || 0), 0);
        const activeCases = cases.filter(c => c.status === CaseStatus.PROGRESS).length;
        const avgRevenue = totalCases > 0 ? Math.round(totalRevenue / totalCases) : 0;

        return { totalCases, totalRevenue, activeCases, avgRevenue };
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
            <div className="space-y-8 animate-in fade-in duration-500">

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard icon={<Users size={20} />} label="總案件數 / TOTAL CASES" value={metrics.totalCases} subtext="Lifetime" />
                    <MetricCard icon={<TrendingUp size={20} />} label="預估總營收 / REVENUE" value={`$${metrics.totalRevenue.toLocaleString()}`} subtext="Estimated" highlight />
                    <MetricCard icon={<Activity size={20} />} label="進行中 / ACTIVE" value={metrics.activeCases} subtext="Current Projects" />
                    <MetricCard icon={<Calculator size={20} />} label="平均客單價 / AVG TICKET" value={`$${metrics.avgRevenue.toLocaleString()}`} subtext="Per Case" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Status Chart */}
                    <Card title="案件狀態分佈 / STATUS DISTRIBUTION">
                        <div className="h-[300px] w-full flex items-center justify-center">
                            {statusData.length > 0 ? (
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
                                            {statusData.map((entry, index) => (
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

                    {/* Revenue Chart */}
                    <Card title="工程類別營收排行 / REVENUE BY CATEGORY">
                        <div className="h-[300px] w-full min-h-[300px]">
                            {categoryData.length > 0 ? (
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
        </Layout>
    );
};

const MetricCard = ({ icon, label, value, subtext, highlight = false }: any) => (
    <div className={`p-5 rounded-lg border ${highlight ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-100'} shadow-sm flex flex-col gap-4`}>
        <div className="flex justify-between items-start">
            <div className={`p-2 rounded-md ${highlight ? 'bg-white/20' : 'bg-gray-100'}`}>
                {icon}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${highlight ? 'text-gray-400' : 'text-gray-400'}`}>{subtext}</span>
        </div>
        <div>
            <div className="text-2xl md:text-3xl font-black tracking-tight">{value}</div>
            <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${highlight ? 'text-gray-300' : 'text-gray-500'}`}>{label}</div>
        </div>
    </div>
);
