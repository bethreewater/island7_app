import React, { useEffect, useState, useRef } from 'react';
import { TileLayer } from 'react-leaflet';
import toast from 'react-hot-toast';

export const WeatherLayer: React.FC = () => {
    const [tileData, setTileData] = useState<{ host: string; path: string; ts: number } | null>(null);
    const hasErrorShown = useRef(false);

    useEffect(() => {
        const loadingToast = toast.loading('正在載入降雨雷達...');
        hasErrorShown.current = false;

        // Fetch the latest weather maps metadata
        fetch('https://api.rainviewer.com/public/weather-maps.json')
            .then(res => res.json())
            .then(data => {
                if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
                    const lastFrame = data.radar.past[data.radar.past.length - 1];
                    // Use dynamic host from API or fallback
                    const host = data.host || 'https://tilecache.rainviewer.com';

                    setTileData({
                        host: host,
                        path: lastFrame.path,
                        ts: lastFrame.time
                    });

                    toast.success('雷達影像已更新', { id: loadingToast });
                } else {
                    toast.error('無法取得雷達資料', { id: loadingToast });
                }
            })
            .catch(err => {
                console.error('Failed to fetch rain radar data:', err);
                toast.error('降雨雷達連線失敗', { id: loadingToast });
            });

        return () => {
            toast.dismiss(loadingToast);
        };
    }, []);

    if (!tileData) return null;

    return (
        <>
            <TileLayer
                opacity={0.8}
                zIndex={10}
                // Construct URL using dynamic host and path
                url={`${tileData.host}${tileData.path}/256/{z}/{x}/{y}/6/0_0.png`}
                attribution='&copy; <a href="https://www.rainviewer.com">RainViewer</a>'
                maxNativeZoom={11}
                eventHandlers={{
                    tileerror: (e) => {
                        if (!hasErrorShown.current) {
                            console.warn('Weather Tile Error (suppressed):', e);
                            hasErrorShown.current = true;
                        }
                    }
                }}
            />
            {/* Simple Legend */}
            <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '20px', marginRight: '10px', pointerEvents: 'none' }}>
                <div className="leaflet-control bg-white/80 backdrop-blur p-2 rounded shadow text-[10px] font-bold text-zinc-600">
                    <div>降雨強度 (通用藍色)</div>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-zinc-400">輕</span>
                        <div className="h-2 w-20 rounded-full" style={{ background: 'linear-gradient(to right, #eef5fe, #1c7ed6, #0b5ed7)' }}></div>
                        <span className="text-blue-900">重</span>
                    </div>
                </div>
            </div>
        </>
    );
};
