
import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Layout } from '../components/Layout';
import { Card, Button, Input, Select } from '../components/InputComponents';
import { QuickCalculator } from '../components/QuickCalculator';
import { MethodItem, ServiceCategory, MethodStep, Material, MethodRecipe, MaterialCategory } from '../types';
import { getMethods, saveMethod, deleteMethod, getMaterials, getRecipes, upsertRecipe, deleteRecipe, upsertMaterial, deleteMaterial } from '../services/storageService';
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
    if (!selectedMatId) return toast('請選擇材料', { icon: '⚠️' });

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

// -- MaterialManager Component --
const MaterialManager = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Material>>({});

  // Category Filter
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'ALL'>('ALL');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getMaterials();
    setMaterials(data);
  };

  const handleSave = async () => {
    if (!editForm.name || !editForm.unit || !editForm.unitPrice) {
      toast.error('請填寫完整資料');
      return;
    }

    const toSave: Material = {
      id: editingId || `MAT-${Date.now()}`,
      name: editForm.name,
      brand: editForm.brand || '',
      category: editForm.category || MaterialCategory.OTHER,
      unit: editForm.unit,
      unitPrice: editForm.unitPrice,
      costPerVal: 0, // Not used yet
      updatedAt: new Date().toISOString()
    };

    await upsertMaterial(toSave);
    toast.success(editingId ? '材料已更新' : '材料已新增');
    setEditingId(null);
    setEditForm({});
    setShowAdd(false);
    load();
  };

  const handleEdit = (m: Material) => {
    setEditingId(m.id);
    setEditForm({ ...m });
    setShowAdd(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`確定刪除材料「${name}」？\n注意：已使用此材料的配方將會受到影響。`)) {
      await deleteMaterial(id);
      toast.success('材料已刪除');
      load();
    }
  };

  const filteredMaterials = materials.filter(m =>
    (m.name.includes(searchTerm) || m.brand?.includes(searchTerm)) &&
    (selectedCategory === 'ALL' || (m.category || MaterialCategory.OTHER) === selectedCategory)
  );

  // Group materials by category if viewing ALL
  const groupedMaterials = useMemo<Record<string, Material[]> | null>(() => {
    if (selectedCategory !== 'ALL') return null;

    const groups: Record<string, Material[]> = {};
    Object.values(MaterialCategory).forEach(cat => groups[cat] = []);
    groups['Uncategorized'] = [];

    filteredMaterials.forEach(m => {
      const cat = (m.category as string) || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });

    return groups;
  }, [filteredMaterials, selectedCategory]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Central Database</h2>
          <div className="text-3xl font-black text-blue-900 tracking-tighter">備料中心 / MATERIALS</div>
        </div>
        <Button onClick={() => { setEditingId(null); setEditForm({ unit: '桶', unitPrice: 0, category: MaterialCategory.PAINT }); setShowAdd(true); }} className="flex gap-3 bg-blue-600 px-6 font-black uppercase text-[10px] tracking-[0.2em] py-4"><Plus size={18} /> 新增材料 / NEW MATERIAL</Button>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            className="w-full bg-white border border-zinc-200 rounded-sm py-3 px-4 font-bold text-sm outline-none focus:border-blue-500 transition-colors"
            placeholder="搜尋材料名稱或品牌..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-black uppercase transition-all ${selectedCategory === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-zinc-200 text-zinc-500 hover:border-blue-300'}`}
          >
            全部 / ALL
          </button>
          {Object.values(MaterialCategory).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-black uppercase transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-zinc-200 text-zinc-500 hover:border-blue-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal (Inline for now) */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-black text-sm uppercase tracking-widest">{editingId ? '編輯材料' : '新增材料'} / {editingId ? 'EDIT' : 'NEW'}</h3>
              <button onClick={() => setShowAdd(false)} className="hover:bg-blue-700 p-1 rounded"><Trash2 className="opacity-0" size={16} />✕</button>
            </div>
            <div className="p-6 space-y-4">
              <Input label="材料名稱 / NAME" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="例如：得利全效乳膠漆" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">分類 / CATEGORY</label>
                  <select
                    className="w-full bg-white border border-zinc-200 rounded-sm p-2 text-sm font-bold outline-none"
                    value={editForm.category || MaterialCategory.OTHER}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value as MaterialCategory })}
                  >
                    {Object.values(MaterialCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <Input label="品牌 (選填) / BRAND" value={editForm.brand || ''} onChange={e => setEditForm({ ...editForm, brand: e.target.value })} placeholder="例如：Dulux" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="單位 / UNIT" value={editForm.unit || ''} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} placeholder="桶、包、支" />
                <Input label="單價 / PRICE" type="number" value={editForm.unitPrice || ''} onChange={e => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })} />
              </div>
            </div>
            <div className="bg-zinc-50 p-4 flex justify-end gap-3 border-t border-zinc-100">
              <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
              <Button onClick={handleSave} className="bg-blue-600 px-8">儲存</Button>
            </div>
          </div>
        </div>
      )}

      {selectedCategory === 'ALL' && groupedMaterials ? (
        <div className="space-y-12">
          {Object.entries(groupedMaterials).map(([cat, items]) => (
            (items as Material[]).length > 0 && (
              <div key={cat}>
                <div className="flex items-center gap-3 border-b-2 border-zinc-100 pb-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <h3 className="font-black text-lg text-zinc-800 tracking-tight uppercase">{cat}</h3>
                  <span className="bg-zinc-100 text-zinc-400 text-[9px] font-black px-2 py-0.5 rounded-full">{(items as Material[]).length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(items as Material[]).map((m: Material) => <MaterialCard key={m.id} material={m} onEdit={handleEdit} onDelete={handleDelete} />)}
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map(m => <MaterialCard key={m.id} material={m} onEdit={handleEdit} onDelete={handleDelete} />)}
        </div>
      )}

      {filteredMaterials.length === 0 && (
        <div className="text-center py-20 bg-zinc-50 border border-dashed border-zinc-200 rounded text-zinc-400 text-xs font-black uppercase tracking-widest">
          No Materials Found
        </div>
      )}
    </div>
  );
};

// Sub-component for Card
const MaterialCard: React.FC<{ material: Material, onEdit: (m: Material) => void, onDelete: (id: string, name: string) => void }> = ({ material: m, onEdit, onDelete }) => (
  <div className="group bg-white border border-zinc-200 rounded-sm p-4 hover:border-blue-500 transition-all shadow-sm flex flex-col justify-between h-[140px]">
    <div>
      <div className="flex justify-between items-start">
        <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{m.brand || 'NO BRAND'}</div>
        <div className="text-[8px] font-black text-blue-300 uppercase tracking-widest bg-blue-50 px-1.5 rounded">{m.category || '未分類'}</div>
      </div>
      <h4 className="font-bold text-lg text-zinc-800 line-clamp-2 mt-1">{m.name}</h4>
    </div>
    <div className="flex justify-between items-end border-t border-zinc-50 pt-3 mt-2">
      <div className="font-mono font-bold text-blue-600">
        ${m.unitPrice.toLocaleString()} <span className="text-zinc-400 text-[10px] font-normal">/ {m.unit}</span>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(m)} className="text-zinc-400 hover:text-blue-600 transition-colors p-1"><Save size={14} /></button>
        <button onClick={() => onDelete(m.id, m.name)} className="text-zinc-400 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
      </div>
    </div>
  </div>
);


export const KnowledgeBase: React.FC<{ onBack: () => void, onNavigate: (view: 'dashboard' | 'datacenter' | 'settings') => void }> = ({ onBack, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'schemes' | 'materials'>('schemes');
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
      {/* Top Tab Bar */}
      <div className="flex justify-center mb-8 border-b border-zinc-100">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('schemes')}
            className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${activeTab === 'schemes' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            工程方案 / SCHEMES
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${activeTab === 'materials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            備料中心 / MATERIALS
          </button>
        </div>
      </div>

      {activeTab === 'materials' ? (
        <div className="animate-in fade-in duration-300">
          <MaterialManager />
        </div>
      ) : editingMethod ? (
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
        <div className="space-y-8 pb-20">
          {/* Quick Calculator Widget */}
          <QuickCalculator />

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
