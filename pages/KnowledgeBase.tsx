
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card, Button, Input, Select } from '../components/InputComponents';
import { MethodItem, ServiceCategory, MethodStep, Material, MethodRecipe } from '../types';
import { getMethods, saveMethod, deleteMethod, getMaterials, getRecipes, upsertRecipe, deleteRecipe } from '../services/storageService';
import { Plus, Trash2, Save, ChevronRight, Layers, Clock, ArrowLeft, FolderOpen } from 'lucide-react';


// -- RecipeManager Component (Defined first to avoid hoisting issues) --
const RecipeManager = ({ methodId }: { methodId: string }) => {
  const [recipes, setRecipes] = useState<MethodRecipe[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  // New Recipe Form
  const [selectedMatId, setSelectedMatId] = useState('');
  const [category, setCategory] = useState<'fixed' | 'variable'>('variable');
  const [qty, setQty] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);

  useEffect(() => {
    load();
  }, [methodId]);

  const load = async () => {
    const [allMaterials, allRecipes] = await Promise.all([getMaterials(), getRecipes()]);
    setMaterials(allMaterials);
    setRecipes(allRecipes.filter(r => r.methodId === methodId));
  };

  const handleAdd = async () => {
    if (!selectedMatId) return alert('請選擇材料');

    // Auto-generate ID? Or use backend? We use simple ID here.
    const newRecipe: MethodRecipe = {
      id: `REC-${Date.now()}`,
      methodId,
      materialId: selectedMatId,
      quantity: category === 'fixed' ? qty : 0,
      category,
      consumptionRate: category === 'variable' ? rate : 0
    };

    await upsertRecipe(newRecipe);
    setShowAdd(false);
    load();
  };

  const handleRemove = async (id: string) => {
    if (confirm('確定移除此配方？')) {
      await deleteRecipe(id);
      load();
    }
  };

  const costPerPing = recipes.reduce((sum, r) => {
    const mat = r.material || materials.find(m => m.id === r.materialId);
    if (!mat) return sum;
    if (r.category === 'fixed') return sum;
    return sum + (r.consumptionRate * mat.unitPrice);
  }, 0);

  return (
    <Card title="標準備料配方 / MATERIAL RECIPES" action={<Button onClick={() => setShowAdd(true)} variant="outline" className="text-[9px] font-black tracking-widest py-1.5 uppercase"><Plus size={14} className="mr-1" /> 新增配方 / ADD RECIPE</Button>}>
      <div className="space-y-4">
        <div className="bg-zinc-50 p-3 rounded-sm flex justify-between items-center text-xs font-black uppercase tracking-widest text-zinc-400">
          <span>每坪材料成本 / MAT COST PER UNIT</span>
          <span className="text-zinc-950 text-base">${Math.round(costPerPing).toLocaleString()}</span>
        </div>

        {showAdd && (
          <div className="bg-zinc-50 p-4 rounded-sm border border-zinc-200 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">材料 / MATERIAL</label>
                <select className="w-full bg-white border border-zinc-200 rounded-sm p-2 text-sm font-bold outline-none" value={selectedMatId} onChange={e => setSelectedMatId(e.target.value)}>
                  <option value="">選擇材料...</option>
                  {materials.sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                    <option key={m.id} value={m.id}>{m.name} (${m.unitPrice}/{m.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">類型 / TYPE</label>
                <select className="w-full bg-white border border-zinc-200 rounded-sm p-2 text-sm font-bold outline-none" value={category} onChange={e => setCategory(e.target.value as any)}>
                  <option value="variable">變動耗材 (Per Unit)</option>
                  <option value="fixed">固定工具 (Fixed)</option>
                </select>
              </div>

              {category === 'variable' ? (
                <Input label="每單位用量 / CONSUMPTION" type="number" placeholder="例如: 0.1 桶/坪" value={rate || ''} onChange={e => setRate(parseFloat(e.target.value))} />
              ) : (
                <Input label="固定數量 / QTY" type="number" placeholder="例如: 1 支" value={qty || ''} onChange={e => setQty(parseFloat(e.target.value))} />
              )}

              <div className="flex gap-2">
                <Button onClick={handleAdd} className="flex-1">ADD</Button>
                <Button onClick={() => setShowAdd(false)} variant="outline">CANCEL</Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Section 1: Fixed Tools */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400"></div>
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">固定器材 / FIXED TOOLS</h4>
            </div>
            <div className="border border-zinc-100 rounded-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-zinc-50 text-[10px] uppercase font-black text-zinc-400">
                  <tr>
                    <th className="p-3 w-1/2">器材名稱 / ITEM</th>
                    <th className="p-3 text-right">數量 / QTY</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recipes.filter(r => r.category === 'fixed').length > 0 ? (
                    recipes.filter(r => r.category === 'fixed').map(r => {
                      const mat = r.material || materials.find(m => m.id === r.materialId);
                      const unitLabel = (mat?.unit || '').replace(/^[0-9.]+/g, '') || mat?.unit;
                      return (
                        <tr key={r.id} className="bg-white hover:bg-zinc-50">
                          <td className="p-3 font-bold text-zinc-700">{mat?.name || '未知材料'}</td>
                          <td className="p-3 text-right font-mono text-zinc-600">
                            {Number(r.quantity)} {unitLabel}
                          </td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleRemove(r.id)} className="text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={3} className="p-4 text-center text-zinc-300 text-[10px] font-black uppercase tracking-widest">NO TOOLS</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Variable Materials */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">變動耗材 / VARIABLE MATERIALS</h4>
            </div>
            <div className="border border-blue-100 rounded-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-blue-50 text-[10px] uppercase font-black text-blue-400">
                  <tr>
                    <th className="p-3 w-1/2">材料名稱 / MATERIAL</th>
                    <th className="p-3 text-right">單位用量 / CONSUMPTION</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {recipes.filter(r => r.category === 'variable').length > 0 ? (
                    recipes.filter(r => r.category === 'variable').map(r => {
                      const mat = r.material || materials.find(m => m.id === r.materialId);
                      const unitLabel = (mat?.unit || '').replace(/^[0-9.]+/g, '') || mat?.unit;
                      return (
                        <tr key={r.id} className="bg-white hover:bg-blue-50/30">
                          <td className="p-3 font-bold text-zinc-700">{mat?.name || '未知材料'}</td>
                          <td className="p-3 text-right font-mono text-zinc-600">
                            {Number(r.consumptionRate)} {unitLabel} / 坪
                          </td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleRemove(r.id)} className="text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={3} className="p-4 text-center text-zinc-300 text-[10px] font-black uppercase tracking-widest">NO MATERIALS</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};


export const KnowledgeBase: React.FC<{ onBack: () => void, onNavigate: (view: 'dashboard' | 'datacenter' | 'settings') => void }> = ({ onBack, onNavigate }) => {
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
      groups[cat] = methods
        .filter(m => m.category === cat)
        .sort((a, b) => a.defaultUnitPrice - b.defaultUnitPrice);
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
    <Layout title="知識庫 / KNOWLEDGE BASE" onBack={onBack} onNavigate={onNavigate}>
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
              <Input label="方案名稱 (中) / NAME (CN)" value={editingMethod.name} onChange={e => setEditingMethod({ ...editingMethod, name: e.target.value })} />
              <Input label="方案名稱 (英) / NAME (EN)" value={editingMethod.englishName} onChange={e => setEditingMethod({ ...editingMethod, englishName: e.target.value })} />
              <Select label="工程大類 / CATEGORY" value={editingMethod.category} onChange={e => setEditingMethod({ ...editingMethod, category: e.target.value as ServiceCategory })}>
                {Object.values(ServiceCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input label="計價單位 / UNIT" value={editingMethod.defaultUnit} onChange={e => setEditingMethod({ ...editingMethod, defaultUnit: e.target.value })} />
                <Input label="預設單價 / UNIT PRICE" type="number" value={editingMethod.defaultUnitPrice} onChange={e => setEditingMethod({ ...editingMethod, defaultUnitPrice: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </Card>


          <RecipeManager methodId={editingMethod.id} />

          <Card title="標準施工程序 / CONSTRUCTION STEPS" action={<Button onClick={addStep} variant="outline" className="text-[9px] font-black tracking-widest py-1.5 uppercase"><Plus size={14} className="mr-1" /> 新增工序 / ADD STEP</Button>}>
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
                            <span className="text-gray-400 flex items-center gap-1.5"><Layers size={12} /> {m.steps.length} STEPS</span>
                            <span className="text-gray-400 flex items-center gap-1.5"><Clock size={12} /> {m.estimatedDays} DAYS</span>
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
      )
      }
    </Layout >
  );
};
