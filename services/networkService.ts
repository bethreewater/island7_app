import { useState, useEffect } from 'react';

export interface NetworkStatus {
    isOnline: boolean;
    effectiveType: string | null;
    downlink: number | null;
}

/**
 * Custom hook to monitor network connectivity status
 * Uses browser's online/offline events and Network Information API
 */
export const useNetworkStatus = (): NetworkStatus => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [effectiveType, setEffectiveType] = useState<string | null>(null);
    const [downlink, setDownlink] = useState<number | null>(null);

    useEffect(() => {
        // Update network connection type if available
        const updateConnectionInfo = () => {
            const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
            if (connection) {
                setEffectiveType(connection.effectiveType || null);
                setDownlink(connection.downlink || null);
            }
        };

        // Event handlers
        const handleOnline = () => {
            setIsOnline(true);
            updateConnectionInfo();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        const handleConnectionChange = () => {
            updateConnectionInfo();
        };

        // Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
            connection.addEventListener('change', handleConnectionChange);
        }

        // Initial check
        updateConnectionInfo();

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (connection) {
                connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, []);

    return { isOnline, effectiveType, downlink };
};
