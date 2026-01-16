
import React, { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { CaseDetail } from './pages/CaseDetail';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { DataCenter } from './pages/DataCenter';
import { Settings } from './pages/Settings';
import { CaseData } from './types';


const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'detail' | 'kb' | 'datacenter' | 'settings'>('dashboard');
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);

  const handleCaseSelect = (caseData: CaseData) => {
    setSelectedCase(caseData);
    setView('detail');
  };

  // Common navigation handler passed to pages that use Layout
  const handleNavigate = (target: 'dashboard' | 'datacenter' | 'settings') => {
    setView(target);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'dashboard' && <Dashboard onSelectCase={handleCaseSelect} onOpenKB={() => setView('kb')} onNavigate={handleNavigate} />}
      {view === 'kb' && <KnowledgeBase onBack={() => setView('dashboard')} />}
      {view === 'detail' && selectedCase && <CaseDetail caseData={selectedCase} onBack={() => setView('dashboard')} onUpdate={setSelectedCase} />}
      {view === 'datacenter' && <DataCenter onNavigate={handleNavigate} />}
      {view === 'settings' && <Settings onNavigate={handleNavigate} />}
    </div>
  );
};

export default App;
