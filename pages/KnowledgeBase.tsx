
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card, Button, Input, Select } from '../components/InputComponents';
import { MethodItem, ServiceCategory, MethodStep } from '../types';
import { getMethods, saveMethod, deleteMethod } from '../services/storageService';
import { Plus, Trash2, Save, ChevronRight, Layers, Clock, ArrowLeft, FolderOpen } from 'lucide-react';

export const KnowledgeBase: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [editingMethod, setEditingMethod] = useState<MethodItem | null>(null);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    const data = await getMethods();
    setMethods(data);
  };

  const groupedMethods = useMemo(() => {
    const groups: Record<string, MethodItem[]> = {};
    Object.values(ServiceCategory).forEach(cat => {
      groups[cat] = methods.filter(m => m.category === cat);
    });
    return groups;
  }, [methods]);

  const startNewMethod = () => {
    const newMethod: MethodItem = {
      id: `M-${Date.now()}`,
      category: ServiceCategory.CUSTOM,
      name: '新施工方案',
      englishName: 'New Scheme',
      defaultUnit: '坪',
      defaultUnitPrice: 0,
      estimatedDays: 1,
      steps: [{ name: '第一工序', description: '', prepMinutes: 0, execMinutes: 60 }]
    };
    setEditingMethod(newMethod);
  };

  const handleSave = async () => {
    if (editingMethod) {
      const totalMins = editingMethod.steps.reduce((sum, s) => sum + s.prepMinutes + s.execMinutes, 0);
      const toSave = { ...editingMethod, estimatedDays: Math.ceil(totalMins / 480) };
      await saveMethod(toSave);
      setEditingMethod(null);
      loadMethods();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('確定要刪除此方案嗎？')) {
      await deleteMethod(id);
      loadMethods();
    }
  };

  const addStep = () => {
    if (!editingMethod) return;
    const newSteps = [...editingMethod.steps, { name: '新工序', description: '', prepMinutes: 0, execMinutes: 60 }];
    setEditingMethod({ ...editingMethod, steps: newSteps });
  };

  const updateStep = (idx: number, field: keyof MethodStep, value: any) => {
    if (!editingMethod) return;
    const newSteps = [...editingMethod.steps];
    newSteps[idx] = { ...newSteps[idx], [field]: value };
    setEditingMethod({ ...editingMethod, steps: newSteps });
  };

  return (
    <Layout title="知識庫 / KNOWLEDGE BASE" onBack={onBack}>
      {editingMethod ? (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
          <div className="flex justify-between items-center">
            <button onClick={() => setEditingMethod(null)} className="text-gray-400 hover:text-black flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <ArrowLeft size={16} /> 返回清單 / BACK TO LIST
            </button>
            <div className="flex gap-2">
               <Button onClick={() => handleDelete(editingMethod.id)} variant="danger" className="bg-red-50 text-red-600 border-red-100 px-6 font-black uppercase text-xs">刪除 / DELETE</Button>
               <Button onClick={handleSave} className="flex gap-2 bg-black px-8 font-black uppercase text-xs tracking-widest">儲存變更 / SAVE</Button>
            </div>
          </div>

          <Card title="方案基礎資訊 / BASIC CONFIGURATION">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="方案名稱 (中) / NAME (CN)" value={editingMethod.name} onChange={e => setEditingMethod({...editingMethod, name: e.target.value})} />
              <Input label="方案名稱 (英) / NAME (EN)" value={editingMethod.englishName} onChange={e => setEditingMethod({...editingMethod, englishName: e.target.value})} />
              <Select label="工程大類 / CATEGORY" value={editingMethod.category} onChange={e => setEditingMethod({...editingMethod, category: e.target.value as ServiceCategory})}>
                {Object.values(ServiceCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input label="計價單位 / UNIT" value={editingMethod.defaultUnit} onChange={e => setEditingMethod({...editingMethod, defaultUnit: e.target.value})} />
                <Input label="預設單價 / UNIT PRICE" type="number" value={editingMethod.defaultUnitPrice} onChange={e => setEditingMethod({...editingMethod, defaultUnitPrice: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          </Card>

          <Card title="標準施工程序 / CONSTRUCTION STEPS" action={<Button onClick={addStep} variant="outline" className="text-[9px] font-black tracking-widest py-1.5 uppercase"><Plus size={14} className="mr-1"/> 新增工序 / ADD STEP</Button>}>
            <div className="space-y-4">
              {editingMethod.steps.map((step, idx) => (
                <div key={idx} className="flex gap-4 p-5 border border-gray-100 rounded-md bg-white items-start shadow-sm hover:border-gray-300 transition-colors">
                  <div className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Input label="工序名稱 / TASK NAME" value={step.name} onChange={e => updateStep(idx, 'name', e.target.value)} />
                    </div>
                    <Input label="準備期 / PREP (M)" type="number" value={step.prepMinutes} onChange={e => updateStep(idx, 'prepMinutes', parseInt(e.target.value) || 0)} />
                    <Input label="施作期 / EXEC (M)" type="number" value={step.execMinutes} onChange={e => updateStep(idx, 'execMinutes', parseInt(e.target.value) || 0)} />
                    <div className="md:col-span-4">
                      <Input label="工藝說明 / DESCRIPTION" value={step.description} onChange={e => updateStep(idx, 'description', e.target.value)} />
                    </div>
                  </div>
                  <button onClick={() => setEditingMethod({ ...editingMethod, steps: editingMethod.steps.filter((_, i) => i !== idx) })} className="text-gray-200 hover:text-red-500 p-2 mt-4 transition-colors"><Trash2 size={18} /></button>
                </div>
              ))}
              {editingMethod.steps.length === 0 && <div className="text-center py-10 text-gray-300 font-black tracking-widest text-[10px] uppercase">請點擊上方按鈕新增標準工序 / NO STEPS</div>}
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-12 pb-20">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Standardized Database</h2>
              <div className="text-3xl font-black text-black tracking-tighter">工程方案庫 / SCHEMES</div>
            </div>
            <Button onClick={startNewMethod} className="flex gap-3 bg-black px-6 font-black uppercase text-[10px] tracking-[0.2em] py-4"><Plus size={18} /> 新增方案 / NEW SCHEME</Button>
          </div>

          <div className="space-y-16">
            {(Object.entries(groupedMethods) as [string, MethodItem[]][]).map(([category, items]) => (
              items.length > 0 && (
                <div key={category} className="space-y-6">
                  <div className="flex items-center gap-4 border-b-2 border-black pb-3">
                    <FolderOpen size={20} className="text-black" />
                    <h3 className="font-black text-xl tracking-tighter text-black uppercase">{category}</h3>
                    <span className="bg-gray-100 text-gray-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{items.length} 方案 / ITEMS</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(m => (
                      <div key={m.id} className="group bg-white border border-gray-100 p-6 rounded-md hover:border-black transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between" onClick={() => setEditingMethod(m)}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{m.englishName}</div>
                            <div className="text-gray-200 group-hover:text-black transition-colors"><ChevronRight size={18} /></div>
                          </div>
                          <h4 className="font-black text-lg text-black tracking-tight mb-6 uppercase">{m.name}</h4>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-black pt-4 border-t border-gray-50 uppercase tracking-widest">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-400 flex items-center gap-1.5"><Layers size={12}/> {m.steps.length} STEPS</span>
                            <span className="text-gray-400 flex items-center gap-1.5"><Clock size={12}/> {m.estimatedDays} DAYS</span>
                          </div>
                          <span className="text-black font-black tracking-tighter text-sm">${m.defaultUnitPrice.toLocaleString()} / {m.defaultUnit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};
