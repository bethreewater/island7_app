import React, { useState, Suspense } from 'react';
import { CaseData } from './types';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';

import { Dashboard } from './pages/Dashboard';
import { CaseDetail } from './pages/CaseDetail';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { DataCenter } from './pages/DataCenter';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { getCases, subscribeToCases, initDB } from './services/storageService';

const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-white">
    <div className="w-8 h-8 md:w-12 md:h-12 border-[3px] md:border-4 border-zinc-100 border-t-zinc-950 rounded-full animate-spin mb-3"></div>
    <div className="text-zinc-400 text-[8px] md:text-[9px] font-black tracking-widest uppercase whitespace-nowrap">SYSTEM LOADING</div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<'dashboard' | 'detail' | 'kb' | 'datacenter' | 'settings'>('dashboard');
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [cases, setCases] = useState<CaseData[]>([]);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Initial Data Load (Global)
    const loadGlobalData = async () => {
      await initDB();
      const data = await getCases();
      setCases(data.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
    };
    loadGlobalData();

    const dataSub = subscribeToCases(() => {
      loadGlobalData();
    });

    return () => {
      subscription.unsubscribe();
      dataSub.unsubscribe();
    };
  }, []);

  const handleCaseSelect = (caseData: CaseData) => {
    setSelectedCase(caseData);
    setView('detail');
  };

  const handleNavigate = (target: 'dashboard' | 'datacenter' | 'settings') => {
    setView(target);
  };

  if (!session) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'dashboard' && <Dashboard cases={cases} onSelectCase={handleCaseSelect} onOpenKB={() => setView('kb')} onNavigate={handleNavigate} />}
      {view === 'kb' && <KnowledgeBase onBack={() => setView('dashboard')} onNavigate={handleNavigate} />}
      {view === 'detail' && selectedCase && <CaseDetail caseData={selectedCase} onBack={() => setView('dashboard')} onUpdate={setSelectedCase} />}
      {view === 'datacenter' && <DataCenter cases={cases} onNavigate={handleNavigate} />}
      {view === 'settings' && <Settings onNavigate={handleNavigate} />}
    </div>
  );
};

export default App;
