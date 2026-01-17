import React, { useState, useEffect, useMemo } from 'react';
import { Zone, MethodRecipe } from '../../types';
import { getRecipes } from '../../services/storageService';

export const MaterialList: React.FC<{ zones: Zone[] }> = ({ zones }) => {
    const [recipes, setRecipes] = useState<MethodRecipe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getRecipes();
            setRecipes(data);
            setLoading(false);
        };
        load();
    }, []);

    const { materials, tools, totalCost } = useMemo(() => {
        const totals: Record<string, { name: string, unit: string, qty: number, category: string, cost: number }> = {};

        zones.forEach(zone => {
            const zoneRecipes = recipes.filter(r => r.methodId === zone.methodId);
            const zoneArea = zone.items.reduce((sum, item) => sum + (item.areaPing || 0), 0) || 1;

            zoneRecipes.forEach(recipe => {
                const mat = recipe.material;
                if (!mat) return;

                if (!totals[mat.id]) {
                    totals[mat.id] = { name: mat.name, unit: mat.unit, qty: 0, category: recipe.category, cost: 0 };
                }

                if (recipe.category === 'fixed') {
                    // Fixed items (Tools) are calculated per Project (Max of any usage), not per Zone
                    const needed = recipe.quantity || 1;
                    if (needed > totals[mat.id].qty) {
                        totals[mat.id].qty = needed;
                        totals[mat.id].cost = needed * (mat.unitPrice || 0);
                    }
                } else {
                    // Variable items are summed up based on Area
                    const amount = (recipe.consumptionRate || 0) * zoneArea;
                    totals[mat.id].qty += amount;
                    totals[mat.id].cost += amount * (mat.unitPrice || 0);
                }
            });
        });

        const allItems = Object.values(totals);
        return {
            materials: allItems.filter(i => i.category !== 'fixed').sort((a, b) => b.cost - a.cost),
            tools: allItems.filter(i => i.category === 'fixed').sort((a, b) => b.cost - a.cost),
            totalCost: allItems.reduce((sum, i) => sum + i.cost, 0)
        };
    }, [zones, recipes]);

    if (loading) return <div className="text-center py-4 text-xs text-zinc-400">Loading materials...</div>;

    if (materials.length === 0 && tools.length === 0) return (
        <div className="text-center py-8 border border-dashed border-zinc-200 rounded-sm bg-zinc-50">
            <div className="text-zinc-400 text-xs">尚無備料資料 (請確認工法是否對應) / NO DATA</div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-end border-b border-zinc-100 pb-4">
                <div className="text-xs font-black uppercase text-zinc-400">ESTIMATED MATERIALS / 預估用料</div>
                <div className="text-sm font-black">預估總成本: <span className="text-lg">${Math.round(totalCost).toLocaleString()}</span></div>
            </div>

            {/* Materials Table */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-zinc-950"></div>
                    <div className="text-[10px] font-black uppercase text-zinc-950">耗材清單 / CONSUMABLES</div>
                </div>
                <div className="border border-zinc-100 rounded-sm overflow-hidden overflow-x-auto shadow-sm">
                    <table className="w-full text-left text-sm min-w-[300px]">
                        <thead className="bg-zinc-50 text-[9px] uppercase font-black text-zinc-400">
                            <tr>
                                <th className="p-3">名稱 / NAME</th>
                                <th className="p-3 text-right">數量 / QTY</th>
                                <th className="p-3 text-right">成本 / COST</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {materials.length > 0 ? materials.map((req, idx) => (
                                <tr key={idx} className="bg-white hover:bg-zinc-50/50">
                                    <td className="p-3 font-bold text-zinc-700">{req.name}</td>
                                    <td className="p-3 text-right font-mono text-zinc-600">
                                        {req.qty > 0 && req.qty < 1 ? req.qty.toFixed(2) : Math.ceil(req.qty)} <span className="text-[10px] text-zinc-300 ml-1">{req.unit}</span>
                                    </td>
                                    <td className="p-3 text-right font-mono text-zinc-400">${Math.round(req.cost).toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={3} className="p-4 text-center text-xs text-zinc-300 italic">無耗材需求</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tools Table */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-zinc-300"></div>
                    <div className="text-[10px] font-black uppercase text-zinc-500">工具清單 / TOOLS</div>
                </div>
                <div className="border border-zinc-100 rounded-sm overflow-hidden overflow-x-auto shadow-sm">
                    <table className="w-full text-left text-sm min-w-[300px]">
                        <thead className="bg-zinc-50 text-[9px] uppercase font-black text-zinc-400">
                            <tr>
                                <th className="p-3">名稱 / NAME</th>
                                <th className="p-3 text-right">數量 / QTY</th>
                                <th className="p-3 text-right">成本 / COST</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {tools.length > 0 ? tools.map((req, idx) => (
                                <tr key={idx} className="bg-white hover:bg-zinc-50/50">
                                    <td className="p-3 font-bold text-zinc-700">{req.name}</td>
                                    <td className="p-3 text-right font-mono text-zinc-600">
                                        {Math.ceil(req.qty)} <span className="text-[10px] text-zinc-300 ml-1">{req.unit}</span>
                                    </td>
                                    <td className="p-3 text-right font-mono text-zinc-400">${Math.round(req.cost).toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={3} className="p-4 text-center text-xs text-zinc-300 italic">無工具需求</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
