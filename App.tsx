
import React, { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { CaseDetail } from './pages/CaseDetail';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { CaseData } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'detail' | 'kb'>('dashboard');
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);

  const handleCaseSelect = (caseData: CaseData) => {
    setSelectedCase(caseData);
    setView('detail');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'dashboard' && <Dashboard onSelectCase={handleCaseSelect} onOpenKB={() => setView('kb')} />}
      {view === 'kb' && <KnowledgeBase onBack={() => setView('dashboard')} />}
      {view === 'detail' && selectedCase && <CaseDetail caseData={selectedCase} onBack={() => setView('dashboard')} onUpdate={setSelectedCase} />}
    </div>
  );
};

export default App;
