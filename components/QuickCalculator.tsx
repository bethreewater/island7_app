import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Select } from './InputComponents';
import { MethodItem, Material, MethodRecipe, ServiceCategory } from '../types';
import { getMethods, getMaterials, getRecipes } from '../services/storageService';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';

type SeverityLevel = 'light' | 'medium' | 'severe';

const severityMultipliers: Record<SeverityLevel, number> = {
    light: 0.8,
    medium: 1.0,
    severe: 1.2
};

const severityLabels: Record<SeverityLevel, string> = {
    light: '輕微',
    medium: '中度',
    severe: '嚴重'
};

export const QuickCalculator: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [methods, setMethods] = useState<MethodItem[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [recipes, setRecipes] = useState<MethodRecipe[]>([]);

    // User Inputs
    const [selectedMethodId, setSelectedMethodId] = useState<string>('');
    const [area, setArea] = useState<number>(0);
    const [severity, setSeverity] = useState<SeverityLevel>('medium');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [methodsData, materialsData, recipesData] = await Promise.all([
            getMethods(),
            getMaterials(),
            getRecipes()
        ]);
        setMethods(methodsData);
        setMaterials(materialsData);
        setRecipes(recipesData);
    };

    // Create a Map for O(1) recipe lookups (performance optimization)
    const methodRecipeMap = useMemo(() => {
        const map = new Map<string, boolean>();
        recipes.forEach(r => {
            if (r.category === 'variable') {
                map.set(r.methodId, true);
            }
        });
        return map;
    }, [recipes]);

    // Group methods by category and filter only those with recipes
    const groupedMethods = useMemo(() => {
        const methodsWithRecipes = methods.filter(method => methodRecipeMap.has(method.id));

        const groups: Record<string, MethodItem[]> = {};
        Object.values(ServiceCategory).forEach(category => {
            const categoryMethods = methodsWithRecipes.filter(m => m.category === category);
            if (categoryMethods.length > 0) {
                groups[category] = categoryMethods.sort((a, b) => a.defaultUnitPrice - b.defaultUnitPrice);
            }
        });
        return groups;
    }, [methods, methodRecipeMap]);

    // Get recipes for selected method
    const methodRecipes = useMemo(() => {
        if (!selectedMethodId) return [];
        return recipes.filter(r => r.methodId === selectedMethodId && r.category === 'variable');
    }, [selectedMethodId, recipes]);

    // Calculate material requirements
    const calculatedMaterials = useMemo(() => {
        if (!selectedMethodId || !area || area <= 0) return [];

        const multiplier = severityMultipliers[severity];

        return methodRecipes.map(recipe => {
            const material = materials.find(m => m.id === recipe.materialId);
            if (!material) return null;

            const baseQuantity = recipe.consumptionRate * area;
            const adjustedQuantity = baseQuantity * multiplier;

            // Round up to reasonable precision
            const roundedQuantity = Math.ceil(adjustedQuantity * 10) / 10;

            const totalCost = roundedQuantity * material.unitPrice;

            return {
                materialName: material.name,
                quantity: roundedQuantity,
                unit: material.unit,
                unitPrice: material.unitPrice,
                totalCost
            };
        }).filter(Boolean);
    }, [selectedMethodId, area, severity, methodRecipes, materials]);

    // Calculate cost range
    const costEstimate = useMemo(() => {
        if (calculatedMaterials.length === 0) return { min: 0, max: 0, average: 0 };

        const totalCost = calculatedMaterials.reduce((sum, mat) => sum + (mat?.totalCost || 0), 0);

        // ±15% variance for min/max
        const variance = 0.15;
        const min = Math.floor(totalCost * (1 - variance));
        const max = Math.ceil(totalCost * (1 + variance));

        return { min, max, average: Math.round(totalCost) };
    }, [calculatedMaterials]);

    // Get selected method details
    const selectedMethod = methods.find(m => m.id === selectedMethodId);

    return (
        <Card
            title={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <Calculator size={18} />
                        <span>快速估算器 / QUICK CALCULATOR</span>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-zinc-400 hover:text-zinc-950 transition-colors p-1"
                    >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            }
            className="border-2 border-blue-100 bg-blue-50/30"
        >
            {isExpanded && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Input Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">
                                施工類型 / SERVICE TYPE
                            </label>
                            <select
                                className="w-full bg-white border border-zinc-200 rounded-sm p-2.5 text-sm font-bold outline-none focus:border-zinc-950 transition-colors"
                                value={selectedMethodId}
                                onChange={e => setSelectedMethodId(e.target.value)}
                            >
                                <option value="">選擇工法...</option>
                                {(Object.entries(groupedMethods) as [string, MethodItem[]][]).map(([category, categoryMethods]) => (
                                    <optgroup key={category} label={category}>
                                        {categoryMethods.map(method => (
                                            <option key={method.id} value={method.id}>
                                                {method.name} - ${method.defaultUnitPrice}/{method.defaultUnit}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            {Object.keys(groupedMethods).length === 0 && (
                                <div className="text-[9px] text-amber-600 mt-1.5 font-bold">
                                    ⚠️ 尚無已設定配方的工法
                                </div>
                            )}
                        </div>

                        <Input
                            label="施工面積 / AREA"
                            type="number"
                            placeholder="輸入坪數"
                            value={area || ''}
                            onChange={e => setArea(parseFloat(e.target.value) || 0)}
                            suffix={selectedMethod?.defaultUnit || '坪'}
                        />

                        <div>
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">
                                嚴重程度 / SEVERITY
                            </label>
                            <div className="flex gap-2">
                                {(Object.entries(severityLabels) as [SeverityLevel, string][]).map(([level, label]) => (
                                    <button
                                        key={level}
                                        onClick={() => setSeverity(level)}
                                        className={`flex-1 py-2.5 px-3 rounded-sm border-2 font-black text-xs uppercase tracking-wider transition-all ${severity === level
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-zinc-200 text-zinc-400 hover:border-blue-300 hover:text-blue-600'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="text-[9px] text-zinc-400 mt-1.5 font-bold">
                                係數: {severityMultipliers[severity]}x
                            </div>
                        </div>
                    </div>

                    {/* Results Section */}
                    {selectedMethodId && area > 0 && (
                        <>
                            {methodRecipes.length === 0 ? (
                                <div className="bg-amber-50 border border-amber-200 p-6 rounded-sm text-center">
                                    <div className="text-amber-600 font-black text-sm mb-2">⚠️ 此工法尚未設定材料配方</div>
                                    <div className="text-amber-500 text-xs">
                                        請前往工程方案庫為「{selectedMethod?.name}」新增標準備料配方。
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
                                    {/* Cost Summary */}
                                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-sm">
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">
                                            預估材料成本 / Estimated Material Cost
                                        </div>
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-4xl font-black tracking-tighter">
                                                ${costEstimate.min.toLocaleString()}
                                            </span>
                                            <span className="text-xl font-black opacity-60">~</span>
                                            <span className="text-4xl font-black tracking-tighter">
                                                ${costEstimate.max.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-xs mt-2 opacity-75 font-bold">
                                            平均: ${costEstimate.average.toLocaleString()} (基於{severity === 'light' ? '輕微' : severity === 'medium' ? '中度' : '嚴重'}施工)
                                        </div>
                                    </div>

                                    {/* Material List */}
                                    <div>
                                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
                                            建議材料清單 / Material Requirements
                                        </div>
                                        <div className="border border-zinc-200 rounded-sm overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-zinc-50 text-[10px] uppercase font-black text-zinc-400">
                                                    <tr>
                                                        <th className="p-3">材料名稱 / Material</th>
                                                        <th className="p-3 text-right">數量 / Qty</th>
                                                        <th className="p-3 text-right">單價 / Unit Price</th>
                                                        <th className="p-3 text-right">小計 / Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-100">
                                                    {calculatedMaterials.map((mat, idx) => (
                                                        <tr key={idx} className="bg-white hover:bg-zinc-50">
                                                            <td className="p-3 font-bold text-zinc-700">{mat?.materialName}</td>
                                                            <td className="p-3 text-right font-mono text-zinc-600">
                                                                {mat?.quantity} {mat?.unit.replace(/^[0-9.]+/g, '')}
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-zinc-500">
                                                                ${mat?.unitPrice.toLocaleString()}
                                                            </td>
                                                            <td className="p-3 text-right font-black text-zinc-950">
                                                                ${mat?.totalCost.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-3 pt-2 border-t border-zinc-100">
                                        <div className="text-[9px] text-zinc-400 font-bold flex items-center">
                                            💡 提示: 此為材料成本估算，不含人工費用
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Empty State */}
                    {(!selectedMethodId || area <= 0) && (
                        <div className="text-center py-12 text-zinc-300">
                            <Calculator size={48} className="mx-auto mb-4 opacity-30" />
                            <div className="font-black text-sm uppercase tracking-widest">
                                請選擇工法並輸入面積開始估算
                            </div>
                            <div className="text-xs mt-2 opacity-60">
                                SELECT METHOD & ENTER AREA TO START
                            </div>
                        </div>
                    )}
                </div>
            )
            }
        </Card >
    );
};
