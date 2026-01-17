import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Trash2, X, Plus } from 'lucide-react';
import { Zone, MethodItem, ServiceCategory } from '../../types';
import { Button, Card, Input, Select, ImageUploader } from '../InputComponents';

export const ZoneCard: React.FC<{ zone: Zone; methods: MethodItem[]; onUpdate: (z: Zone) => void; onDelete: () => void }> = ({ zone, methods, onUpdate, onDelete }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const filteredMethods = useMemo(() => methods.filter(m => m.category === zone.category).sort((a, b) => a.defaultUnitPrice - b.defaultUnitPrice), [methods, zone.category]);
    const isPing = zone.unit === '坪';

    const updateItem = (iIdx: number, field: string, value: any) => {
        const newItems = [...zone.items];
        const item = { ...newItems[iIdx], [field]: value };

        // Auto Calculate Area if L/W changes
        if (field === 'length' || field === 'width') {
            item.areaPing = Number(((item.length * item.width / 10000) * 0.3025).toFixed(2));
        }

        // Smart Price Logic: If Ping, use Area. Else use Quantity.
        const basis = isPing ? item.areaPing : item.quantity;
        item.itemPrice = Math.round(basis * zone.unitPrice * zone.difficultyCoefficient);

        newItems[iIdx] = item;
        onUpdate({ ...zone, items: newItems });
    };

    const TAG_MAP: Record<string, string[]> = {
        [ServiceCategory.WALL_CANCER]: ['主臥牆面', '客廳牆面', '廚房', '走道', '天花板', '樓梯間'],
        [ServiceCategory.WALL_WATERPROOF]: ['前陽台外牆', '後陽台外牆', '側面外牆', '頂樓女兒牆', '窗框周邊'],
        [ServiceCategory.ROOF_WATERPROOF]: ['頂樓地坪', '頂樓水塔區', '露台', '樓梯間屋頂'],
        [ServiceCategory.CRACK]: ['客廳牆面', '臥室牆面', '外牆裂縫', '窗角裂縫'],
        [ServiceCategory.STRUCTURE]: ['天花板鋼筋', '樑柱裂損', '承重牆', '陽台天花'],
        [ServiceCategory.SILICONE_BATH]: ['主臥衛浴', '客浴', '淋浴間', '浴缸周邊', '乾溼分離'],
        [ServiceCategory.SILICONE_WINDOW]: ['客廳落地窗', '主臥衛浴窗戶', '廚房窗戶', '陽台門框', '採光罩'],
        [ServiceCategory.CUSTOM]: ['儲藏室', '車庫', '地下室', '其他區域']
    };

    const currentTags = TAG_MAP[zone.category] || ['主臥', '客廳', '廚房', '陽台', '其他'];

    return (
        <Card className="border-t-4 border-t-zinc-950"
            title={
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 border border-zinc-100 rounded-full">{isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
                    <div className="flex flex-col">
                        <span className="text-base font-black uppercase">{zone.zoneName || "未命名區域"}</span>
                        <span className="text-[7px] text-zinc-300 uppercase tracking-widest">{zone.methodName || "未選工法"} / {zone.items.length} ITEMS</span>
                    </div>
                </div>
            }
            action={<button onClick={onDelete} className="text-zinc-200 hover:text-red-500"><Trash2 size={16} /></button>}
        >
            <div className={isCollapsed ? 'hidden' : 'space-y-6 animate-in fade-in duration-300'}>
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Input label="區域名稱 / NAME" value={zone.zoneName} onChange={e => onUpdate({ ...zone, zoneName: e.target.value })} />
                            {/* Engineer Quick Tags */}
                            <div className="flex flex-wrap gap-1.5">
                                {currentTags.map(tag => (
                                    <button key={tag} onClick={() => onUpdate({ ...zone, zoneName: tag })} className="text-[9px] px-2 py-1 bg-zinc-50 border border-zinc-100 rounded-sm hover:bg-zinc-950 hover:text-white transition-colors">
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Select label="服務大類 / CATEGORY" value={zone.category} onChange={e => onUpdate({ ...zone, category: e.target.value as ServiceCategory })}>
                            {Object.values(ServiceCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">工法選擇 / METHOD</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {filteredMethods.map(m => (
                            <button key={m.id} onClick={() => onUpdate({ ...zone, methodId: m.id, methodName: m.name, unit: m.defaultUnit, unitPrice: m.defaultUnitPrice })} className={`p-3 border rounded-sm text-left transition-all ${zone.methodId === m.id ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="text-[11px] font-black leading-tight">{m.name}</div>
                                    <div className="text-[9px] opacity-60">${m.defaultUnitPrice}/{m.defaultUnit}</div>
                                </div>
                                <div className="text-[7px] font-black uppercase opacity-40 mt-1">{m.englishName}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Measurements */}
                <div className="pt-4 border-t border-zinc-50 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">現勘數據 / MEASUREMENTS</div>
                        <div className="text-[9px] font-bold text-zinc-400">計價單位: {zone.unit}</div>
                    </div>

                    {zone.items.map((item, iIdx) => (
                        <div key={item.itemId} className="p-3 border border-zinc-50 rounded-sm bg-zinc-50/10 space-y-3 relative group">
                            <button onClick={() => {
                                const newItems = zone.items.filter((_, idx) => idx !== iIdx);
                                onUpdate({ ...zone, items: newItems });
                            }} className="absolute top-2 right-2 text-zinc-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>

                            <div className="grid grid-cols-2 gap-3 pr-6">
                                {isPing ? (
                                    <>
                                        <Input label="長 (cm) / L" type="number" value={item.length || ''} onChange={e => updateItem(iIdx, 'length', parseFloat(e.target.value) || 0)} />
                                        <Input label="寬 (cm) / W" type="number" value={item.width || ''} onChange={e => updateItem(iIdx, 'width', parseFloat(e.target.value) || 0)} />
                                    </>
                                ) : (
                                    <div className="col-span-2">
                                        <Input label={`數量 (${zone.unit}) / QTY`} type="number" value={item.quantity || ''} onChange={e => updateItem(iIdx, 'quantity', parseFloat(e.target.value) || 0)} />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                    <div className="text-xl font-black text-zinc-950">
                                        {isPing ? item.areaPing : item.quantity}
                                        <span className="text-[10px] text-zinc-400 uppercase ml-1">{isPing ? 'PING' : zone.unit === '式' ? 'SET' : 'UNIT'}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-zinc-500">
                                        單項價格: ${item.itemPrice?.toLocaleString()}
                                    </div>
                                </div>
                                <ImageUploader images={item.photos} onImagesChange={imgs => updateItem(iIdx, 'photos', imgs)} maxImages={3} />
                            </div>
                        </div>
                    ))}
                    <Button onClick={() => onUpdate({ ...zone, items: [...zone.items, { itemId: `I-${Date.now()}`, length: 0, width: 0, areaPing: 0, quantity: 1, itemPrice: zone.unitPrice, photos: [] }] })} variant="outline" className="w-full text-[9px]"><Plus size={14} /> 新增測量項 / ADD ITEM</Button>
                </div>
            </div>
        </Card>
    );
};
