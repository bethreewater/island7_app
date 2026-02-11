
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/InputComponents';
import { getBasicAnalytics, getCategoryStats, subscribeToCases, getMethods } from '../services/storageService';
import {
    CaseData,
    CaseStatus,
    MethodItem,
    NavigationView,
    isActiveStatus,
    isAssessmentStatus,
    normalizeCaseStatus
} from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Calculator, TrendingUp, Users, Activity, Shield, FolderOpen, AlertTriangle, Clock } from 'lucide-react';
import {
    analyzeMethodPerformance,
    getDelayedCases,
    calculateOverallOnTimeRate,
    calculateAvgConstructionDays,
    MethodPerformance,
    DelayedCaseInfo
} from '../services/analyticsService';


interface DataCenterProps {
    onNavigate?: (view: NavigationView) => void;
}

export const DataCenter: React.FC<DataCenterProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'efficiency'>('overview');
    const [basicData, setBasicData] = useState<CaseData[]>([]);
    const [categoryStats, setCategoryStats] = useState<{ finalPrice: number, category: string }[]>([]);
    const [methods, setMethods] = useState<MethodItem[]>([]);
    const [basicLoading, setBasicLoading] = useState(true);
    const [categoryLoading, setCategoryLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // 1. Load Basic Data (Instant)
        const loadBasic = async () => {
            try {
                const data = await getBasicAnalytics();
                const methodsData = await getMethods();
                if (mounted) {
                    setBasicData(data);
                    setMethods(methodsData);
                    setBasicLoading(false);
                }
            } catch (e) {
                console.error(e);
            }
        };

        // 2. Load Category Stats (Lazy)
        const loadCategory = async () => {
            try {
                const data = await getCategoryStats();
                if (mounted) {
                    setCategoryStats(data);
                    setCategoryLoading(false);
                }
            } catch (e) {
                console.error(e);
            }
        };

        loadBasic();
        setTimeout(loadCategory, 0);

        const sub = subscribeToCases(async () => {
            const basic = await getBasicAnalytics();
            if (mounted) setBasicData(basic);

            const cats = await getCategoryStats();
            if (mounted) setCategoryStats(cats);
        });

        return () => {
            mounted = false;
            sub.unsubscribe();
        };
    }, []);

    const metrics = useMemo(() => {
        const assessmentCases = basicData.filter(c => isAssessmentStatus(c.status)).length;
        const activeCases = basicData.filter(c => isActiveStatus(c.status)).length;
        const warrantyCases = basicData.filter(c => normalizeCaseStatus(c.status) === CaseStatus.WARRANTY).length;
        const totalRevenue = basicData.reduce((sum, c) => sum + (c.finalPrice || 0), 0);

        return { assessmentCases, activeCases, warrantyCases, totalRevenue };
    }, [basicData]);

    const statusData = useMemo(() => {
        const assessmentCount = basicData.filter(c => isAssessmentStatus(c.status)).length;
        const activeCount = basicData.filter(c => isActiveStatus(c.status)).length;
        const completedCount = basicData.filter(c => normalizeCaseStatus(c.status) === CaseStatus.COMPLETED).length;
        const warrantyCount = basicData.filter(c => normalizeCaseStatus(c.status) === CaseStatus.WARRANTY).length;

        return [
            { name: '新案件 / New', value: assessmentCount, color: '#3b82f6' },
            { name: '進行中 / Progress', value: activeCount, color: '#eab308' },
            { name: '已完工 / Done', value: completedCount, color: '#22c55e' },
            { name: '保固中 / Warranty', value: warrantyCount, color: '#a855f7' },
        ].filter(d => d.value > 0);
    }, [basicData]);

    const categoryData = useMemo(() => {
        const groups = categoryStats.reduce((acc, c) => {
            const cat = c.category || 'Unknown';
            if (!acc[cat]) acc[cat] = { name: cat, value: 0, count: 0 };
            acc[cat].value += (c.finalPrice || 0);
            acc[cat].count += 1;
            return acc;
        }, {} as Record<string, { name: string, value: number, count: number }>);

        return Object.values(groups).sort((a: any, b: any) => b.value - a.value);
    }, [categoryStats]);

    return (
        <Layout
            title="數據中心 / DATA CENTER"
            onNavigate={onNavigate}
            currentView="datacenter"
        >
            {/* Tab 切換 */}
            <div className="flex gap-4 mb-6 border-b border-zinc-200">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-3 font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'overview'
                            ? 'text-zinc-950 border-b-2 border-zinc-950'
                            : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    📊 財務總覽
                </button>
                <button
                    onClick={() => setActiveTab('efficiency')}
                    className={`px-4 py-3 font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'efficiency'
                            ? 'text-zinc-950 border-b-2 border-zinc-950'
                            : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    ⚡ 施工效率
                </button>
            </div>

            <div className="space-y-6 animate-in fade-in duration-500">
                {activeTab === 'overview' && (
                    <OverviewTab
                        metrics={metrics}
                        statusData={statusData}
                        categoryData={categoryData}
                        basicLoading={basicLoading}
                        categoryLoading={categoryLoading}
                    />
                )}
                {activeTab === 'efficiency' && (
                    <EfficiencyTab
                        cases={basicData}
                        methods={methods}
                        loading={basicLoading}
                    />
                )}
            </div>
        </Layout>
    );
};

const OverviewTab = ({ metrics, statusData, categoryData, basicLoading, categoryLoading }: any) => (
    <div className="space-y-8 animate-in slide-in-from-right duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={<FolderOpen size={20} />} label="評估中 / ASSESSMENT" value={metrics.assessmentCases} subtext="New Leads" loading={basicLoading} />
            <MetricCard icon={<Activity size={20} />} label="進行中 / ACTIVE" value={metrics.activeCases} subtext="In Progress" loading={basicLoading} />
            <MetricCard icon={<Shield size={20} />} label="保固中 / WARRANTY" value={metrics.warrantyCases} subtext="Completed" loading={basicLoading} />
            <MetricCard icon={<TrendingUp size={20} />} label="預估總營收 / REVENUE" value={metrics.totalRevenue} prefix="$" subtext="Total Value" highlight loading={basicLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="案件狀態分佈 / STATUS DISTRIBUTION">
                <div className="h-[300px] w-full flex items-center justify-center">
                    {basicLoading ? (
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
                    {categoryLoading ? (
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

// 施工效率分析 Tab
const EfficiencyTab = ({ cases, methods, loading }: { cases: CaseData[]; methods: MethodItem[]; loading: boolean }) => {
    const methodPerformance = useMemo(() => analyzeMethodPerformance(cases, methods), [cases, methods]);
    const delayedCases = useMemo(() => getDelayedCases(cases), [cases]);
    const avgDays = useMemo(() => calculateAvgConstructionDays(cases), [cases]);
    const onTimeRate = useMemo(() => calculateOverallOnTimeRate(cases), [cases]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-zinc-100 rounded-lg"></div>
                    ))}
                </div>
                <div className="h-64 bg-zinc-100 rounded-lg"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-right duration-300">
            {/* 總覽指標卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard 
                    icon={<Clock size={20} />} 
                    label="平均施工天數 / AVG DAYS" 
                    value={avgDays} 
                    subtext="實際天數"
                    suffix=" 天"
                />
                <MetricCard 
                    icon={<AlertTriangle size={20} />} 
                    label="延期案件 / DELAYED" 
                    value={delayedCases.length} 
                    subtext="需要關注"
                    highlight={delayedCases.length > 0}
                />
                <MetricCard 
                    icon={<TrendingUp size={20} />} 
                    label="整體準時率 / ON-TIME" 
                    value={onTimeRate.toFixed(1)} 
                    subtext="完工案件"
                    prefix=""
                    suffix="%"
                />
            </div>

            {/* 工法準時率圖表 */}
            {methodPerformance.length > 0 && (
                <Card title="工法準時完工率 / METHOD ON-TIME RATE">
                    <MethodPerformanceChart data={methodPerformance} />
                </Card>
            )}

            {/* 延期案件列表 */}
            {delayedCases.length > 0 && (
                <Card title={`延期案件 (${delayedCases.length}) / DELAYED CASES`}>
                    <DelayedCasesList cases={delayedCases} />
                </Card>
            )}

            {/* 空狀態 */}
            {methodPerformance.length === 0 && (
                <div className="text-center py-20 text-zinc-400">
                    <Activity size={48} className="mx-auto mb-4 opacity-30" />
                    <div className="font-black text-sm uppercase tracking-widest">
                        尚無足夠數據進行分析
                    </div>
                    <div className="text-xs mt-2 opacity-60">
                        需要至少一個進行中或已完工的案件
                    </div>
                </div>
            )}
        </div>
    );
};

// 工法準時率圖表元件
const MethodPerformanceChart = ({ data }: { data: MethodPerformance[] }) => (
    <div className="space-y-4">
        {data.map(method => {
            const barColor = 
                method.onTimeRate >= 90 ? 'bg-emerald-500' :
                method.onTimeRate >= 70 ? 'bg-yellow-500' :
                'bg-red-500';

            return (
                <div key={method.methodId} className="space-y-2">
                    <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-3">
                            <span className="font-black text-sm text-zinc-950">{method.methodName}</span>
                            <span className="text-[10px] text-zinc-400 font-bold">
                                {method.totalCases} 案件
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-zinc-500">
                                準時: {method.onTimeCases} / 延期: {method.delayedCases}
                            </div>
                        </div>
                    </div>
                    <div className="relative h-8 bg-zinc-100 rounded-sm overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${method.onTimeRate}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-zinc-950">
                            {method.onTimeRate.toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-400 font-bold">
                        <span>平均施工: {method.avgActualDays} 天</span>
                        <span>預估: {method.avgExpectedDays} 天</span>
                    </div>
                </div>
            );
        })}
    </div>
);

//延期案件列表元件
const DelayedCasesList = ({ cases }: { cases: DelayedCaseInfo[] }) => (
    <div className="space-y-2 max-h-96 overflow-y-auto">
        {cases.map(c => (
            <div 
                key={c.caseId} 
                className="flex justify-between items-center p-4 bg-red-50 border border-red-200 rounded-sm hover:bg-red-100 transition-colors"
            >
                <div className="flex-1">
                    <div className="font-black text-sm text-zinc-950">{c.customerName}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                        {c.methodName} • {c.caseId}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-red-600 font-black text-lg">+{c.delayDays}</div>
                    <div className="text-[9px] text-red-500 uppercase font-black tracking-wider">天延期</div>
                </div>
            </div>
        ))}
    </div>
);
