
import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Layout } from '../components/Layout';
import { Card, Button, Input, Select } from '../components/InputComponents';
import { MethodItem, ServiceCategory, MethodStep, Material, MethodRecipe, MaterialCategory, NavigationView, WarrantyType } from '../types';
import { getMethods, saveMethod, deleteMethod, getMaterials, getRecipes, upsertRecipe, deleteRecipe, upsertMaterial, deleteMaterial } from '../services/storageService';
import { Plus, Trash2, Save, ChevronRight, Layers, Clock, ArrowLeft, FolderOpen, Briefcase, ShieldCheck, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';


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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      const [allMaterials, allRecipes] = await Promise.all([getMaterials(), getRecipes()]);
      if (!mounted) return;
      setMaterials(allMaterials);
      setRecipes(allRecipes.filter(r => r.methodId === methodId));
    };

    void loadData();

    return () => {
      mounted = false;
    };
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
      consumptionRate: category === 'fixed' ? 0 : rate
    };

    await upsertRecipe(newRecipe);
    setShowAdd(false);
    load();
  };

  const handleRemove = async (id: string) => {
    setPendingDeleteId(id);
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
          <span>每坪耗材成本 / CONSUMABLE COST PER UNIT</span>
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
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="確定移除此配方？"
        message="此動作會從本方案移除配方材料。"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (!pendingDeleteId) return;
          await deleteRecipe(pendingDeleteId);
          setPendingDeleteId(null);
          load();
        }}
      />
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
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getMaterials();
    setMaterials(data);
  };

  const closeEditor = () => {
    setEditingId(null);
    setEditForm({});
    setShowAdd(false);
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
    closeEditor();
    load();
  };

  const handleEdit = (m: Material) => {
    setEditingId(m.id);
    setEditForm({ ...m });
    setShowAdd(true);
  };

  const handleDelete = (id: string, name: string) => {
    setPendingDelete({ id, name });
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = !normalizedSearch || m.name.toLowerCase().includes(normalizedSearch) || m.brand?.toLowerCase().includes(normalizedSearch);
    return matchesSearch && (selectedCategory === 'ALL' || (m.category || MaterialCategory.OTHER) === selectedCategory);
  });

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
              <button onClick={closeEditor} className="hover:bg-blue-700 p-1 rounded"><Trash2 className="opacity-0" size={16} />✕</button>
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
              <Button variant="outline" onClick={closeEditor}>取消</Button>
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
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="確定刪除材料？"
        message={pendingDelete ? `確定刪除材料「${pendingDelete.name}」？\n注意：已使用此材料的配方將會受到影響。` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteMaterial(pendingDelete.id);
          toast.success('材料已刪除');
          setPendingDelete(null);
          closeEditor();
          load();
        }}
      />
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

const SchemeMetric: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-sm border border-zinc-200 bg-white/90 p-4 shadow-sm">
    <div className="flex items-center gap-2 text-zinc-400">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">{icon}</div>
      <div className="text-[9px] font-black uppercase tracking-[0.24em]">{label}</div>
    </div>
    <div className="mt-3 text-lg font-black tracking-tight text-zinc-950 break-words">{value}</div>
  </div>
);


export const KnowledgeBase: React.FC<{ onBack: () => void, onNavigate: (view: NavigationView) => void }> = ({ onBack, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'schemes' | 'materials'>('schemes');
  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [editingMethod, setEditingMethod] = useState<MethodItem | null>(null);
  const [pristineMethod, setPristineMethod] = useState<MethodItem | null>(null);
  const [pendingDeleteMethodId, setPendingDeleteMethodId] = useState<string | null>(null);
  const [expandedStepIdx, setExpandedStepIdx] = useState<number | null>(0);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    const data = await getMethods();
    setMethods(data);
  };

  const closeMethodEditor = () => {
    setEditingMethod(null);
    setPristineMethod(null);
    setExpandedStepIdx(0);
  };

  const openMethodEditor = (method: MethodItem) => {
    setEditingMethod(method);
    setPristineMethod(method);
    setExpandedStepIdx(0);
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
      laborHourlyRate: 0,
      laborHours: 0,
      estimatedDays: 1,
      warrantyType: 'leak_handled',
      warrantyMonths: 12,
      warrantyHandledMonths: 12,
      warrantyUnhandledMonths: 12,
      warrantyUnhandledVisits: 1,
      warrantyIgnoredText: '不提供保固',
      steps: [{ name: '第一工序', description: '', prepMinutes: 0, execMinutes: 60 }]
    };
    openMethodEditor(newMethod);
  };

  const isDirty = useMemo(() => {
    if (!editingMethod || !pristineMethod) return false;
    return JSON.stringify(editingMethod) !== JSON.stringify(pristineMethod);
  }, [editingMethod, pristineMethod]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSave = async () => {
    if (editingMethod) {
      const totalMins = editingMethod.steps.reduce((sum, s) => sum + s.prepMinutes + s.execMinutes, 0);
      const handledMonths = editingMethod.warrantyHandledMonths ?? editingMethod.warrantyMonths ?? 12;
      const unhandledMonths = editingMethod.warrantyUnhandledMonths ?? editingMethod.warrantyMonths ?? 12;
      const unhandledVisits = editingMethod.warrantyUnhandledVisits ?? editingMethod.warrantyVisits ?? 1;
      const selectedType = editingMethod.warrantyType || 'leak_handled';
      const fallbackMonths = selectedType === 'leak_unhandled' ? unhandledMonths : handledMonths;
      const fallbackVisits = selectedType === 'leak_unhandled' ? unhandledVisits : 1;
      const toSave = {
        ...editingMethod,
        estimatedDays: Math.ceil(totalMins / 480),
        warrantyHandledMonths: handledMonths,
        warrantyUnhandledMonths: unhandledMonths,
        warrantyUnhandledVisits: unhandledVisits,
        warrantyIgnoredText: editingMethod.warrantyIgnoredText || '不提供保固',
        warrantyMonths: fallbackMonths,
        warrantyVisits: fallbackVisits,
      };
      await saveMethod(toSave);
      closeMethodEditor();
      loadMethods();
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteMethodId(id);
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

  const formatDuration = (months: number) => {
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    if (years > 0 && remainMonths > 0) return `${years} 年 ${remainMonths} 個月`;
    if (years > 0) return `${years} 年`;
    return `${remainMonths} 個月`;
  };

  const laborCost = editingMethod ? ((editingMethod.laborHourlyRate || 0) * (editingMethod.laborHours || 0)) : 0;
  const totalStepMinutes = editingMethod ? editingMethod.steps.reduce((sum, step) => sum + step.prepMinutes + step.execMinutes, 0) : 0;
  const warrantyType = editingMethod?.warrantyType || 'leak_handled';

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
          <div className="border border-zinc-200 rounded-sm bg-gradient-to-br from-white via-zinc-50 to-zinc-100 p-5 md:p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3 min-w-0">
                <button onClick={closeMethodEditor} className="text-zinc-400 hover:text-black flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <ArrowLeft size={16} /> 返回清單 / BACK TO LIST
                </button>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">ENGINEERING SCHEME</div>
                  <h1 className="text-2xl md:text-4xl font-black tracking-tight text-zinc-950 break-words">{editingMethod.name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <span className="px-2 py-1 rounded-full bg-white border border-zinc-200">{editingMethod.englishName || 'UNNAMED'}</span>
                    <span className="px-2 py-1 rounded-full bg-white border border-zinc-200">{editingMethod.category}</span>
                    <span className={`px-2 py-1 rounded-full border ${isDirty ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{isDirty ? '未儲存變更' : '已同步'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <Button onClick={() => handleDelete(editingMethod.id)} variant="danger" className="bg-red-50 text-red-600 border-red-100 px-6 font-black uppercase text-xs">刪除 / DELETE</Button>
                <Button onClick={handleSave} className="flex gap-2 bg-black px-8 font-black uppercase text-xs tracking-widest"><Save size={14} /> 儲存變更 / SAVE</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <SchemeMetric icon={<DollarSign size={16} />} label="預設單價" value={`$${editingMethod.defaultUnitPrice.toLocaleString()} / ${editingMethod.defaultUnit}`} />
              <SchemeMetric icon={<Clock size={16} />} label="預估工期" value={`${editingMethod.estimatedDays} 天`} />
              <SchemeMetric icon={<Briefcase size={16} />} label="預估人事費" value={`$${laborCost.toLocaleString()}`} />
              <SchemeMetric icon={<ShieldCheck size={16} />} label="保固規則" value="3 種情境設定" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
            <Card title="商務設定 / COMMERCIAL CONFIG">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="方案名稱 (中) / NAME (CN)" value={editingMethod.name} onChange={e => setEditingMethod({ ...editingMethod, name: e.target.value })} />
                <Input label="方案名稱 (英) / NAME (EN)" value={editingMethod.englishName} onChange={e => setEditingMethod({ ...editingMethod, englishName: e.target.value })} />
                <Select label="工程大類 / CATEGORY" value={editingMethod.category} onChange={e => setEditingMethod({ ...editingMethod, category: e.target.value as ServiceCategory })}>
                  {Object.values(ServiceCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </Select>
                <Input label="計價單位 / UNIT" value={editingMethod.defaultUnit} onChange={e => setEditingMethod({ ...editingMethod, defaultUnit: e.target.value })} />
                <Input label="預設單價 / UNIT PRICE" type="number" value={editingMethod.defaultUnitPrice} onChange={e => setEditingMethod({ ...editingMethod, defaultUnitPrice: parseInt(e.target.value, 10) || 0 })} />
                <div className="bg-zinc-50 border border-zinc-200 rounded-sm p-4 flex flex-col justify-center">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">施工步驟總分鐘 / TOTAL STEP MINUTES</div>
                  <div className="text-2xl font-black text-zinc-900 mt-2">{totalStepMinutes.toLocaleString()}</div>
                </div>
              </div>
            </Card>

            <Card title="人事費用 / LABOR COST">
              <div className="space-y-4">
                <Input
                  label="薪資單價（每小時） / HOURLY RATE"
                  type="number"
                  value={editingMethod.laborHourlyRate || ''}
                  onChange={e => setEditingMethod({ ...editingMethod, laborHourlyRate: parseInt(e.target.value, 10) || 0 })}
                />
                <Input
                  label="預估工時（小時） / HOURS"
                  type="number"
                  value={editingMethod.laborHours || ''}
                  onChange={e => setEditingMethod({ ...editingMethod, laborHours: parseInt(e.target.value, 10) || 0 })}
                />
                <div className="bg-zinc-950 text-white rounded-sm p-4">
                  <div className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">預估人事費 / EST. LABOR COST</div>
                  <div className="text-3xl font-black tracking-tight mt-2">${laborCost.toLocaleString()}</div>
                  <div className="text-xs text-zinc-400 mt-2">用於財務總覽的人事成本試算</div>
                </div>
              </div>
            </Card>
          </div>

          {/* 保固設定 / WARRANTY CONFIG */}
          <Card title="保固設定 / WARRANTY CONFIG">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'leak_handled', title: '有處理漏水源', desc: '正常保固情境，直接設定保固月數。', tone: 'emerald' },
                  { key: 'leak_unhandled', title: '無法處理漏水源', desc: '需要保固次數與較保守的條件。', tone: 'amber' },
                  { key: 'leak_ignored', title: '不處理漏水源', desc: '只顯示說明文字，不提供標準保固。', tone: 'rose' },
                ].map((option) => {
                  const active = warrantyType === option.key;
                  const toneClass = option.tone === 'emerald'
                    ? active ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-200 bg-white'
                    : option.tone === 'amber'
                      ? active ? 'border-amber-500 bg-amber-50' : 'border-zinc-200 bg-white'
                      : active ? 'border-rose-500 bg-rose-50' : 'border-zinc-200 bg-white';
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setEditingMethod({ ...editingMethod, warrantyType: option.key as WarrantyType })}
                      className={`text-left rounded-sm border p-4 transition-all hover:border-zinc-950 ${toneClass}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">DEFAULT TYPE</div>
                      <div className="text-base font-black text-zinc-900">{option.title}</div>
                      <div className="text-sm text-zinc-500 mt-2">{option.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`bg-white border rounded-sm p-4 space-y-3 ${warrantyType === 'leak_handled' ? 'border-zinc-950 shadow-sm' : 'border-zinc-200'}`}>
                  <div className="text-[10px] font-black text-zinc-700 tracking-tight">有處理漏水源 / HANDLED</div>
                  <Input
                    label="保固月數 / MONTHS"
                    type="number"
                    value={editingMethod.warrantyHandledMonths ?? editingMethod.warrantyMonths ?? 12}
                    onChange={e => setEditingMethod({ ...editingMethod, warrantyHandledMonths: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className={`bg-white border rounded-sm p-4 space-y-3 ${warrantyType === 'leak_unhandled' ? 'border-zinc-950 shadow-sm' : 'border-zinc-200'}`}>
                  <div className="text-[10px] font-black text-zinc-700 tracking-tight">無法處理漏水源 / UNHANDLED</div>
                  <Input
                    label="保固月數 / MONTHS"
                    type="number"
                    value={editingMethod.warrantyUnhandledMonths ?? editingMethod.warrantyMonths ?? 12}
                    onChange={e => setEditingMethod({ ...editingMethod, warrantyUnhandledMonths: parseInt(e.target.value) || 0 })}
                  />
                  <Input
                    label="保固次數 / VISITS"
                    type="number"
                    value={editingMethod.warrantyUnhandledVisits ?? editingMethod.warrantyVisits ?? 1}
                    onChange={e => setEditingMethod({ ...editingMethod, warrantyUnhandledVisits: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className={`bg-white border rounded-sm p-4 space-y-3 ${warrantyType === 'leak_ignored' ? 'border-zinc-950 shadow-sm' : 'border-zinc-200'}`}>
                  <div className="text-[10px] font-black text-zinc-700 tracking-tight">不處理漏水源 / IGNORED</div>
                  <Input
                    label="顯示文案 / DISPLAY TEXT"
                    value={editingMethod.warrantyIgnoredText || '不提供保固'}
                    onChange={e => setEditingMethod({ ...editingMethod, warrantyIgnoredText: e.target.value })}
                  />
                </div>
              </div>

              {/* 保固預覽 / WARRANTY PREVIEW */}
              <div className="bg-zinc-50 p-4 rounded-sm border border-zinc-200">
                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">保固條件預覽 / WARRANTY PREVIEW</div>
                <div className="space-y-1.5 text-sm font-bold text-zinc-800">
                  <div className={`${(editingMethod.warrantyType || 'leak_handled') === 'leak_handled' ? 'text-zinc-900' : 'text-zinc-500'}`}>
                    ✅ 有處理漏水源：{formatDuration(editingMethod.warrantyHandledMonths ?? editingMethod.warrantyMonths ?? 12)}保固
                  </div>
                  <div className={`${editingMethod.warrantyType === 'leak_unhandled' ? 'text-zinc-900' : 'text-zinc-500'}`}>
                    ⚠️ 無法處理漏水源：{formatDuration(editingMethod.warrantyUnhandledMonths ?? editingMethod.warrantyMonths ?? 12)} {editingMethod.warrantyUnhandledVisits ?? editingMethod.warrantyVisits ?? 1} 次保固
                  </div>
                  <div className={`${editingMethod.warrantyType === 'leak_ignored' ? 'text-zinc-900' : 'text-zinc-500'}`}>
                    ❌ 不處理漏水源：{editingMethod.warrantyIgnoredText || '不提供保固'}
                  </div>
                </div>
              </div>
            </div>
          </Card>


          <RecipeManager methodId={editingMethod.id} />

          <Card title="標準施工程序 / CONSTRUCTION STEPS" action={<Button onClick={addStep} variant="outline" className="text-[9px] font-black tracking-widest py-1.5 uppercase"><Plus size={14} className="mr-1" /> 新增工序 / ADD STEP</Button>}>
            <div className="space-y-4">
              {editingMethod.steps.map((step, idx) => (
                <div key={idx} className="border border-zinc-200 rounded-sm bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                    <button type="button" onClick={() => setExpandedStepIdx(expandedStepIdx === idx ? null : idx)} className="flex items-center gap-3 text-left min-w-0">
                      <div className="bg-black text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] shrink-0">{idx + 1}</div>
                      <div className="min-w-0">
                        <div className="font-black text-zinc-900 truncate">{step.name || `工序 ${idx + 1}`}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">PREP {step.prepMinutes}M / EXEC {step.execMinutes}M / TOTAL {step.prepMinutes + step.execMinutes}M</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setExpandedStepIdx(expandedStepIdx === idx ? null : idx)} className="text-zinc-400 hover:text-zinc-950 p-2 transition-colors" aria-label={expandedStepIdx === idx ? '收合工序' : '展開工序'}>
                        {expandedStepIdx === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button onClick={() => setEditingMethod({ ...editingMethod, steps: editingMethod.steps.filter((_, i) => i !== idx) })} className="text-zinc-300 hover:text-red-500 p-2 transition-colors" aria-label="刪除工序"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  {expandedStepIdx === idx && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
                      <div className="md:col-span-2">
                        <Input label="工序名稱 / TASK NAME" value={step.name} onChange={e => updateStep(idx, 'name', e.target.value)} />
                      </div>
                      <Input label="準備期 / PREP (M)" type="number" value={step.prepMinutes} onChange={e => updateStep(idx, 'prepMinutes', parseInt(e.target.value, 10) || 0)} />
                      <Input label="施作期 / EXEC (M)" type="number" value={step.execMinutes} onChange={e => updateStep(idx, 'execMinutes', parseInt(e.target.value, 10) || 0)} />
                      <div className="md:col-span-4">
                        <Input label="工藝說明 / DESCRIPTION" value={step.description} onChange={e => updateStep(idx, 'description', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {editingMethod.steps.length === 0 && <div className="text-center py-10 text-gray-300 font-black tracking-widest text-[10px] uppercase">請點擊上方按鈕新增標準工序 / NO STEPS</div>}
            </div>
          </Card>

        </div>
      ) : (
          <div className="space-y-8 pb-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            <div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Standardized Database</h2>
              <div className="text-3xl font-black text-black tracking-tighter">工程方案庫 / SCHEMES</div>
              <div className="text-sm text-zinc-500 mt-2">先比較價格、工期、人事費與保固，再決定是否點進去編輯。</div>
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
                      <div key={m.id} className="group bg-white border border-gray-100 p-6 rounded-md hover:border-black transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between" onClick={() => openMethodEditor(m)}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{m.englishName}</div>
                            <div className="text-gray-200 group-hover:text-black transition-colors"><ChevronRight size={18} /></div>
                          </div>
                          <h4 className="font-black text-lg text-black tracking-tight mb-6 uppercase">{m.name}</h4>
                          <div className="flex flex-wrap gap-2 mb-5 text-[9px] font-black uppercase tracking-widest">
                            <span className="px-2 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-500">{m.category}</span>
                            <span className="px-2 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-500">{m.warrantyType === 'leak_handled' ? '正常保固' : m.warrantyType === 'leak_unhandled' ? '限次保固' : '不保固'}</span>
                          </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-gray-50 text-[9px] font-black uppercase tracking-widest">
                          <div className="grid grid-cols-2 gap-2 text-zinc-500">
                            <span className="flex items-center gap-1.5"><Layers size={12} /> {m.steps.length} Steps</span>
                            <span className="flex items-center gap-1.5"><Clock size={12} /> {m.estimatedDays} Days</span>
                            <span className="flex items-center gap-1.5"><Briefcase size={12} /> 人事 ${(((m.laborHourlyRate || 0) * (m.laborHours || 0))).toLocaleString()}</span>
                            <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> {m.warrantyHandledMonths ?? m.warrantyMonths ?? 12} Months</span>
                          </div>
                          <div className="flex items-end justify-between gap-3">
                            <div className="text-black font-black tracking-tighter text-sm">${m.defaultUnitPrice.toLocaleString()} / {m.defaultUnit}</div>
                            <div className="text-zinc-300 group-hover:text-black transition-colors flex items-center gap-1">查看設定 <ChevronRight size={14} /></div>
                          </div>
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
      <ConfirmDialog
        open={Boolean(pendingDeleteMethodId)}
        title="確定刪除此方案？"
        message="刪除後將無法復原，且現有案件若仍引用該方案，需手動調整。"
        onCancel={() => setPendingDeleteMethodId(null)}
        onConfirm={async () => {
          if (!pendingDeleteMethodId) return;
          await deleteMethod(pendingDeleteMethodId);
          setPendingDeleteMethodId(null);
          closeMethodEditor();
          loadMethods();
        }}
      />
    </Layout>
  );
};
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">CONFIRMATION</div>
          <h3 className="text-lg font-black text-zinc-900 mt-1">{title}</h3>
          <p className="text-sm text-zinc-500 mt-2 whitespace-pre-line">{message}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>取消</Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>確認</Button>
        </div>
      </div>
    </div>
  );
};
