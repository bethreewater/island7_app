import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CloudRain, Route as RouteIcon } from 'lucide-react';
import { Layout } from '../components/Layout';
import { CaseData, CaseStatus, STATUS_LABELS } from '../types';
import { CaseMapCard } from '../components/map/CaseMapCard';
import { MapFilterBar } from '../components/map/MapFilterBar';
import { LocationControl } from '../components/map/LocationControl';
import { MapSearch } from '../components/map/MapSearch';
import { WeatherLayer } from '../components/map/WeatherLayer';
import { RouteLayer } from '../components/map/RouteLayer';
import 'leaflet/dist/leaflet.css';

// 修復 Leaflet 預設圖示路徑問題
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 施工階段顏色對應 (Phase 1 Optimization)
const STATUS_COLORS: Record<CaseStatus | string, string> = {
    [CaseStatus.ASSESSMENT]: '#3b82f6',        // Blue: 評估 (冷靜)
    [CaseStatus.DEPOSIT_RECEIVED]: '#6366f1', // Indigo: 已收訂 (進展)
    [CaseStatus.PLANNING]: '#8b5cf6',          // Violet: 規劃
    [CaseStatus.CONSTRUCTION]: '#f97316',      // Orange: 施工中 (醒目/警示)
    [CaseStatus.FINAL_PAYMENT]: '#06b6d4',     // Cyan: 請款
    [CaseStatus.COMPLETED]: '#10b981',         // Emerald: 完工 (安全)
    [CaseStatus.WARRANTY]: '#a855f7',          // Purple: 保固 (服務)
    // Legacy mapping
    [CaseStatus.NEW]: '#3b82f6',
    [CaseStatus.PROGRESS]: '#f97316',
    [CaseStatus.DONE]: '#10b981',
};

// 修復地圖渲染問題的輔助元件
const MapResizeFix: React.FC = () => {
    const map = useMap();

    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

    return null;
};

interface ConstructionMapProps {
    cases: CaseData[];
    onNavigate?: (view: 'dashboard' | 'datacenter' | 'settings' | 'map') => void;
    onCaseClick?: (caseData: CaseData) => void;
}

export const ConstructionMap: React.FC<ConstructionMapProps> = ({
    cases,
    onNavigate,
    onCaseClick
}) => {
    // 本地狀態：當前選中的案件（顯示卡片用）
    const [activeCase, setActiveCase] = useState<CaseData | null>(null);

    // 過濾狀態：空陣列表示「全部」
    const [filterStatuses, setFilterStatuses] = useState<CaseStatus[]>([]);

    // Phase 3: Layer Toggles
    const [showWeather, setShowWeather] = useState(false);
    const [showRoute, setShowRoute] = useState(false);

    // 1. 過濾有座標的案件
    const casesWithLocation = useMemo(() =>
        cases.filter(c => c.latitude && c.longitude),
        [cases]
    );

    // 2. 應用狀態過濾
    const filteredCases = useMemo(() => {
        if (filterStatuses.length === 0) return casesWithLocation;
        return casesWithLocation.filter(c => filterStatuses.includes(c.status));
    }, [casesWithLocation, filterStatuses]);

    // 計算各狀態數量（用於 Filter Bar）
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { total: casesWithLocation.length };
        casesWithLocation.forEach(c => {
            counts[c.status] = (counts[c.status] || 0) + 1;
        });
        return counts;
    }, [casesWithLocation]);

    // 計算地圖中心點
    const mapCenter = useMemo<[number, number]>(() => {
        // 如果有選中的案件，優先以此為中心 (但要稍微往下移一點，留空間給卡片)
        if (activeCase && activeCase.latitude && activeCase.longitude) {
            // 手機版卡片由下往上，無需特殊偏移，Leaflet 自動置中即可，或微調
            return [activeCase.latitude, activeCase.longitude];
        }

        if (casesWithLocation.length === 0) {
            return [25.0330, 121.5654]; // 台北市中心
        }

        const avgLat = casesWithLocation.reduce((sum, c) => sum + c.latitude!, 0) / casesWithLocation.length;
        const avgLng = casesWithLocation.reduce((sum, c) => sum + c.longitude!, 0) / casesWithLocation.length;

        return [avgLat, avgLng];
    }, [casesWithLocation, activeCase]);

    // 處理過濾切換
    const handleToggleStatus = (status: CaseStatus | 'ALL') => {
        if (status === 'ALL') {
            setFilterStatuses([]);
            return;
        }
        setFilterStatuses(prev => {
            if (prev.includes(status)) {
                return prev.filter(s => s !== status);
            } else {
                // 單選模式？還是多選？建議單選或是累積？
                // 為了簡單直覺，這裡實作「累積多選」，但如果是第一次點，是否要清空其他的？
                // 工務華哥說：「我想看施工中」，他點施工中。
                // 如果他先看施工中， फिर想看評估中，通常是切換。
                // 所以這裡實作：點擊「全部」清空。點擊某個狀態 -> Toggle。
                // 如果目前是空（全部），點某個狀態，則只顯示該狀態。
                if (prev.length === 0) return [status];
                return [...prev, status];
            }
        });
        // 切換過濾時關閉卡片
        setActiveCase(null);
    };

    // 處理搜尋選擇
    const handleSearchSelect = (caseData: CaseData) => {
        // 選擇搜尋結果時，清空過濾器以確保該案件可見
        setFilterStatuses([]);
        setActiveCase(caseData);
    };

    // 建立自訂標記圖示
    const createIcon = (color: string, isSelected: boolean) => {
        const size = isSelected ? 48 : 32; // 選中時變大
        const anchor = isSelected ? [24, 48] : [16, 32];

        // 使用更現代的 Pin 形狀
        const svgIcon = `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C7.58172 0 4 3.58172 4 8C4 13.5 12 24 12 24C12 24 20 13.5 20 8C20 3.58172 16.4183 0 12 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="8" r="3" fill="white"/>
          </svg>
        `;

        return L.divIcon({
            html: svgIcon,
            className: `custom-marker ${isSelected ? 'z-50' : 'z-10'} transition-all duration-300`,
            iconSize: [size, size] as [number, number],
            iconAnchor: anchor as [number, number],
            popupAnchor: [0, -size] as [number, number]
        });
    };

    return (
        <Layout title="施工地圖 / CONSTRUCTION MAP" onNavigate={onNavigate} currentView="map">
            <div className="space-y-4 relative h-[calc(100dvh-140px)] md:h-auto">

                {/* 地圖容器 - 全螢幕適應 */}
                <div className="absolute inset-0 md:relative md:h-[600px] bg-zinc-100 md:rounded-lg shadow-lg overflow-hidden border-t md:border border-zinc-200">

                    {/* 過濾器 (Overlay) */}
                    <MapFilterBar
                        selectedStatuses={filterStatuses}
                        onToggleStatus={handleToggleStatus}
                        counts={statusCounts}
                    />

                    {/* 搜尋框 (Overlay) - 在 Filter 下方 */}
                    <MapSearch
                        cases={casesWithLocation}
                        onSelectCase={handleSearchSelect}
                    />

                    {/* Layer Controls (Bottom Left) */}
                    <div className="absolute bottom-6 left-4 z-[400] flex flex-col gap-2">
                        <button
                            onClick={() => setShowRoute(!showRoute)}
                            className={`p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center ${showRoute ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                            title="顯示今日路徑"
                        >
                            <RouteIcon size={20} />
                        </button>
                        <button
                            onClick={() => setShowWeather(!showWeather)}
                            className={`p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center ${showWeather ? 'bg-sky-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                            title="顯示降雨雷達"
                        >
                            <CloudRain size={20} />
                        </button>
                    </div>

                    <MapContainer
                        center={mapCenter}
                        zoom={casesWithLocation.length === 0 ? 12 : 13} // 稍微拉近一點
                        zoomControl={false}
                        className="h-full w-full"
                        style={{ zIndex: 1 }}
                        onClick={() => setActiveCase(null)} // 點擊空白處關閉卡片
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ZoomControl position="topright" />
                        <MapResizeFix />
                        <LocationControl />

                        {/* Phase 3 Layers */}
                        {showWeather && <WeatherLayer />}
                        {showRoute && <RouteLayer cases={casesWithLocation} />}

                        {filteredCases.map(caseData => {
                            const isSelected = activeCase?.caseId === caseData.caseId;
                            const color = STATUS_COLORS[caseData.status] || STATUS_COLORS[CaseStatus.NEW];

                            return (
                                <Marker
                                    key={caseData.caseId}
                                    position={[caseData.latitude!, caseData.longitude!]}
                                    icon={createIcon(color, isSelected)}
                                    eventHandlers={{
                                        click: (e) => {
                                            L.DomEvent.stopPropagation(e); // 防止地圖點擊事件觸發
                                            setActiveCase(caseData);
                                        }
                                    }}
                                />
                            );
                        })}
                    </MapContainer>

                    {/* 資訊卡片 (Overlay) */}
                    {activeCase && (
                        <CaseMapCard
                            caseData={activeCase}
                            statusColor={STATUS_COLORS[activeCase.status] || STATUS_COLORS[CaseStatus.NEW]}
                            onClose={() => setActiveCase(null)}
                            onViewDetail={() => onCaseClick?.(activeCase)}
                        />
                    )}
                </div>

                {/* 統計資訊 */}
                <div className="hidden md:grid md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-zinc-200">
                        <div className="text-2xl font-black">{casesWithLocation.length}</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">地圖上案件</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-zinc-200">
                        <div className="text-2xl font-black text-amber-600">{cases.length - casesWithLocation.length}</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">待加入座標</div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
