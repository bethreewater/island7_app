import React from 'react';
import { Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import { useNetworkStatus } from '../services/networkService';

export const NetworkStatusIndicator: React.FC = () => {
    const { isOnline, effectiveType } = useNetworkStatus();
    const [isReconnecting, setIsReconnecting] = React.useState(false);

    // Handle reconnection detection
    React.useEffect(() => {
        if (!isOnline) {
            setIsReconnecting(false);
        } else {
            // Show reconnecting briefly when coming back online
            setIsReconnecting(true);
            const timer = setTimeout(() => setIsReconnecting(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    // Don't show anything if online and not reconnecting
    if (isOnline && !isReconnecting) {
        return null;
    }

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isOnline ? 'animate-in slide-in-from-top' : ''
                }`}
        >
            <div
                className={`px-4 py-2.5 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest ${!isOnline
                        ? 'bg-amber-500 text-white animate-pulse'
                        : isReconnecting
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-950 text-white'
                    }`}
            >
                {/* Icon */}
                {!isOnline && <WifiOff size={16} className="shrink-0" />}
                {isReconnecting && <RefreshCcw size={16} className="shrink-0 animate-spin" />}
                {isOnline && !isReconnecting && <Wifi size={16} className="shrink-0" />}

                {/* Status Text */}
                <span className="text-[10px] md:text-xs">
                    {!isOnline && '🟠 離線模式 / OFFLINE MODE'}
                    {isReconnecting && '🟢 已重新連線 / CONNECTED'}
                </span>

                {/* Connection Type (if available and reconnecting) */}
                {isReconnecting && effectiveType && (
                    <span className="hidden md:inline text-[9px] opacity-75">
                        ({effectiveType.toUpperCase()})
                    </span>
                )}
            </div>

            {/* Offline Tips */}
            {!isOnline && (
                <div className="bg-amber-50 border-b-2 border-amber-200 px-4 py-2 text-center">
                    <p className="text-amber-800 text-[10px] font-bold">
                        💡 您目前處於離線狀態，部分功能可能受限。請檢查網路連線。
                    </p>
                </div>
            )}
        </div>
    );
};
