
import React, { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { CaseDetail } from './pages/CaseDetail';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { DataCenter } from './pages/DataCenter';
import { Settings } from './pages/Settings';
import { CaseData } from './types';


import { supabase } from './services/supabaseClient';
import { Login } from './pages/Login';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<'dashboard' | 'detail' | 'kb' | 'datacenter' | 'settings'>('dashboard');
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCaseSelect = (caseData: CaseData) => {
    setSelectedCase(caseData);
    setView('detail');
  };

  const handleNavigate = (target: 'dashboard' | 'datacenter' | 'settings') => {
    setView(target);
  };

  if (!session) {
    return <Login />;
  }

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
