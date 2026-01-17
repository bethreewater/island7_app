import React, { useState, Suspense } from 'react';
import { CaseData } from './types';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';

// Lazy Load Components
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const CaseDetail = React.lazy(() => import('./pages/CaseDetail').then(module => ({ default: module.CaseDetail })));
const KnowledgeBase = React.lazy(() => import('./pages/KnowledgeBase').then(module => ({ default: module.KnowledgeBase })));
const DataCenter = React.lazy(() => import('./pages/DataCenter').then(module => ({ default: module.DataCenter })));
const Settings = React.lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Login = React.lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));

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
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<LoadingFallback />}>
        {view === 'dashboard' && <Dashboard onSelectCase={handleCaseSelect} onOpenKB={() => setView('kb')} onNavigate={handleNavigate} />}
        {view === 'kb' && <KnowledgeBase onBack={() => setView('dashboard')} onNavigate={handleNavigate} />}
        {view === 'detail' && selectedCase && <CaseDetail caseData={selectedCase} onBack={() => setView('dashboard')} onUpdate={setSelectedCase} />}
        {view === 'datacenter' && <DataCenter onNavigate={handleNavigate} />}
        {view === 'settings' && <Settings onNavigate={handleNavigate} />}
      </Suspense>
    </div>
  );
};

export default App;
