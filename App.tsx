import React, { useState, Suspense, useCallback, useRef } from 'react';
import { CaseData, NavigationView } from './types';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Toaster } from 'react-hot-toast';

import { NetworkStatusIndicator } from './components/NetworkStatusIndicator';
import { getCaseDetails, getCasesPaginated, initDB } from './services/storageService';

const Dashboard = React.lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const CaseDetail = React.lazy(() => import('./pages/CaseDetail').then((m) => ({ default: m.CaseDetail })));
const KnowledgeBase = React.lazy(() => import('./pages/KnowledgeBase').then((m) => ({ default: m.KnowledgeBase })));
const DataCenter = React.lazy(() => import('./pages/DataCenter').then((m) => ({ default: m.DataCenter })));
const Settings = React.lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Login = React.lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const ConstructionMap = React.lazy(() => import('./pages/ConstructionMap').then((m) => ({ default: m.ConstructionMap })));

type AppView = 'dashboard' | 'detail' | 'kb' | 'datacenter' | 'settings' | 'map';

interface PersistedViewState {
  view: AppView;
  caseId?: string;
  updatedAt: number;
}

const VIEW_STATE_STORAGE_KEY = 'ISLAND7_VIEW_STATE_V1';
const REMOTE_VIEW_STATE_KEY = 'island7_view_state';
const VIEW_SYNC_DEBOUNCE_MS = 1200;
const APP_VIEWS: AppView[] = ['dashboard', 'detail', 'kb', 'datacenter', 'settings', 'map'];

const parsePersistedViewState = (value: unknown): PersistedViewState | null => {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<PersistedViewState>;

  if (!input.view || !APP_VIEWS.includes(input.view)) return null;
  if (typeof input.updatedAt !== 'number' || Number.isNaN(input.updatedAt)) return null;
  if (input.caseId != null && typeof input.caseId !== 'string') return null;

  return {
    view: input.view,
    caseId: input.caseId,
    updatedAt: input.updatedAt,
  };
};

const loadPersistedViewState = (): PersistedViewState | null => {
  try {
    const raw = localStorage.getItem(VIEW_STATE_STORAGE_KEY);
    if (!raw) return null;
    return parsePersistedViewState(JSON.parse(raw));
  } catch {
    return null;
  }
};

const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-white">
    <div className="w-8 h-8 md:w-12 md:h-12 border-[3px] md:border-4 border-zinc-100 border-t-zinc-950 rounded-full animate-spin mb-3"></div>
    <div className="text-zinc-400 text-[8px] md:text-[9px] font-black tracking-widest uppercase whitespace-nowrap">SYSTEM LOADING</div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<AppView>('dashboard');
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [persistedView, setPersistedView] = useState<PersistedViewState | null>(() => loadPersistedViewState());
  const [viewRestored, setViewRestored] = useState(false);
  const [remoteViewChecked, setRemoteViewChecked] = useState(false);
  const syncTimerRef = useRef<number | null>(null);
  const lastSyncedPayloadRef = useRef<string>('');

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

  // Fetch latest cross-device view state from Supabase user metadata.
  React.useEffect(() => {
    if (!session) {
      setRemoteViewChecked(false);
      return;
    }

    let canceled = false;
    setRemoteViewChecked(false);

    const hydrateRemoteView = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (canceled) return;

        const remoteView = parsePersistedViewState(data.user?.user_metadata?.[REMOTE_VIEW_STATE_KEY]);
        if (remoteView) {
          const localView = loadPersistedViewState();
          const latest = !localView || remoteView.updatedAt > localView.updatedAt ? remoteView : localView;
          if (latest) {
            localStorage.setItem(VIEW_STATE_STORAGE_KEY, JSON.stringify(latest));
            setPersistedView(latest);
          }
        }
      } catch (error) {
        console.warn('Failed to hydrate remote view state:', error);
      } finally {
        if (!canceled) setRemoteViewChecked(true);
      }
    };

    hydrateRemoteView();

    return () => {
      canceled = true;
    };
  }, [session?.user?.id]);

  // Restore the last visited view (and detail case) after data is ready.
  React.useEffect(() => {
    if (!session || !remoteViewChecked || isDataLoading || viewRestored || !persistedView) return;

    let canceled = false;

    const applyViewRestore = async () => {
      if (persistedView.view === 'detail' && persistedView.caseId) {
        const cached = cases.find((item) => item.caseId === persistedView.caseId);
        if (cached && !canceled) {
          setSelectedCase(cached);
          setView('detail');
          setViewRestored(true);
          return;
        }

        const detailCase = await getCaseDetails(persistedView.caseId);
        if (detailCase && !canceled) {
          setSelectedCase(detailCase);
          setView('detail');
          setViewRestored(true);
          return;
        }
      } else if (!canceled) {
        setView(persistedView.view);
      }

      if (!canceled) {
        setViewRestored(true);
      }
    };

    applyViewRestore();

    return () => {
      canceled = true;
    };
  }, [session, remoteViewChecked, isDataLoading, viewRestored, persistedView, cases]);

  React.useEffect(() => {
    if (session && remoteViewChecked && !persistedView && !viewRestored) {
      setViewRestored(true);
    }
  }, [session, remoteViewChecked, persistedView, viewRestored]);

  // Persist current view locally and sync to Supabase metadata for cross-device resume.
  React.useEffect(() => {
    if (!session) return;
    if (!remoteViewChecked) return;
    if (!viewRestored && persistedView) return;
    const caseId = view === 'detail' ? selectedCase?.caseId : undefined;
    if (persistedView?.view === view && persistedView?.caseId === caseId) return;

    const payload: PersistedViewState = {
      view,
      caseId,
      updatedAt: Date.now(),
    };
    const payloadString = JSON.stringify(payload);

    localStorage.setItem(VIEW_STATE_STORAGE_KEY, JSON.stringify(payload));
    setPersistedView(payload);

    if (lastSyncedPayloadRef.current === payloadString) return;
    if (syncTimerRef.current) globalThis.clearTimeout(syncTimerRef.current);

    syncTimerRef.current = globalThis.setTimeout(async () => {
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            [REMOTE_VIEW_STATE_KEY]: payload,
          },
        });
        if (!error) {
          lastSyncedPayloadRef.current = payloadString;
        } else {
          console.warn('Failed to sync remote view state:', error);
        }
      } catch (error) {
        console.warn('Failed to sync remote view state:', error);
      }
    }, VIEW_SYNC_DEBOUNCE_MS);
  }, [session, remoteViewChecked, viewRestored, persistedView, view, selectedCase?.caseId]);

  React.useEffect(() => {
    if (session) return;
    if (syncTimerRef.current) {
      globalThis.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    lastSyncedPayloadRef.current = '';
  }, [session]);

  // Preload PDF font in idle time to reduce first-export memory spikes on mobile.
  React.useEffect(() => {
    if (!session) return;

    const preload = () => {
      import('./services/pdfService')
        .then((module) => module.preloadFont())
        .catch(() => {
          // Keep app flow resilient if preload fails.
        });
    };

    const requestIdle = (window as any).requestIdleCallback as ((cb: () => void) => number) | undefined;
    const cancelIdle = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
    if (typeof requestIdle === 'function') {
      const id = requestIdle(preload);
      return () => cancelIdle?.(id);
    }

    const timer = globalThis.setTimeout(preload, 800);
    return () => globalThis.clearTimeout(timer);
  }, [session]);

  const handleCaseSelect = useCallback((caseData: CaseData) => {
    setSelectedCase(caseData);
    setView('detail');
  }, []);

  const handleNavigate = useCallback((target: NavigationView) => {
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
      <Suspense fallback={<LoadingFallback />}>
        {view === 'dashboard' && <Dashboard cases={cases} onSelectCase={handleCaseSelect} onOpenKB={() => setView('kb')} onNavigate={handleNavigate} />}
        {view === 'kb' && <KnowledgeBase onBack={() => setView('dashboard')} onNavigate={handleNavigate} />}
        {view === 'detail' && selectedCase && <CaseDetail caseData={selectedCase} onBack={() => setView('dashboard')} onUpdate={handleCaseUpdate} onNavigate={handleNavigate} />}
        {view === 'datacenter' && <DataCenter onNavigate={handleNavigate} />}
        {view === 'settings' && <Settings onNavigate={handleNavigate} />}
        {view === 'map' && <ConstructionMap cases={cases} onNavigate={handleNavigate} onCaseClick={handleCaseSelect} />}
      </Suspense>

    </div>
  );
};

export default App;
