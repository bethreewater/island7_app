import React, { useState, Suspense, useCallback } from 'react';
import { CaseData } from './types';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Toaster } from 'react-hot-toast';

import { Dashboard } from './pages/Dashboard';
import { CaseDetail } from './pages/CaseDetail';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { DataCenter } from './pages/DataCenter';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { ConstructionMap } from './pages/ConstructionMap';
import { NetworkStatusIndicator } from './components/NetworkStatusIndicator';
import { getCases, getCasesPaginated, subscribeToCases, initDB } from './services/storageService';

const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-white">
    <div className="w-8 h-8 md:w-12 md:h-12 border-[3px] md:border-4 border-zinc-100 border-t-zinc-950 rounded-full animate-spin mb-3"></div>
    <div className="text-zinc-400 text-[8px] md:text-[9px] font-black tracking-widest uppercase whitespace-nowrap">SYSTEM LOADING</div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<'dashboard' | 'detail' | 'kb' | 'datacenter' | 'settings' | 'map'>('dashboard');
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Auth Listener
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

  // Data Loading Effect
  React.useEffect(() => {
    if (!session) return;

    let mounted = true;

    const loadData = async () => {
      setIsDataLoading(true);
      try {
        await initDB();
        // Use paginated loading for better performance
        const { data } = await getCasesPaginated(1, 50); // Load first 50 cases
        if (mounted) {
          setCases(data);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        if (mounted) setIsDataLoading(false);
      }
    };

    loadData();

    /*
    const dataSub = subscribeToCases(async () => {
      const data = await getCases();
      if (mounted) {
        setCases(data.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
      }
    });
    */

    return () => {
      mounted = false;
      // dataSub.unsubscribe();
    };
  }, [session]);

  const handleCaseSelect = useCallback((caseData: CaseData) => {
    setSelectedCase(caseData);
    setView('detail');
  }, []);

  const handleNavigate = useCallback((target: 'dashboard' | 'datacenter' | 'settings' | 'map') => {
    setView(target);
  }, []);

  const handleCaseUpdate = useCallback((updatedCase: CaseData) => {
    setSelectedCase(updatedCase);
    setCases(prev => prev.map(c => c.caseId === updatedCase.caseId ? updatedCase : c));
  }, []);

  if (!session) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  if (isDataLoading) {
    return <LoadingFallback />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Network Status Indicator */}
      <NetworkStatusIndicator />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#18181b',
            color: '#fff',
            fontWeight: 900,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      {view === 'dashboard' && <Dashboard cases={cases} onSelectCase={handleCaseSelect} onOpenKB={() => setView('kb')} onNavigate={handleNavigate} />}
      {view === 'kb' && <KnowledgeBase onBack={() => setView('dashboard')} onNavigate={handleNavigate} />}
      {view === 'detail' && selectedCase && <CaseDetail caseData={selectedCase} onBack={() => setView('dashboard')} onUpdate={handleCaseUpdate} onNavigate={handleNavigate} />}
      {view === 'datacenter' && <DataCenter cases={cases} onNavigate={handleNavigate} />}
      {view === 'settings' && <Settings onNavigate={handleNavigate} />}
      {view === 'map' && <ConstructionMap cases={cases} onNavigate={handleNavigate} onCaseClick={handleCaseSelect} />}

    </div>
  );
};

export default App;
