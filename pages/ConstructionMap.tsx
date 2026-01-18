import React, { useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Layout } from '../components/Layout';
import { CaseData, CaseStatus, STATUS_LABELS } from '../types';
import 'leaflet/dist/leaflet.css';

// 修復 Leaflet 預設圖示路徑問題
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 施工階段顏色對應
const STATUS_COLORS: Record<CaseStatus | string, string> = {
    [CaseStatus.ASSESSMENT]: '#3b82f6',        // 藍色 - 評估中
    [CaseStatus.DEPOSIT_RECEIVED]: '#8b5cf6', // 紫色 - 收訂金
    [CaseStatus.PLANNING]: '#f59e0b',          // 橙色 - 規劃中
    [CaseStatus.CONSTRUCTION]: '#ef4444',      // 紅色 - 施工中（重要）
    [CaseStatus.FINAL_PAYMENT]: '#14b8a6',     // 青色 - 請款中
    [CaseStatus.COMPLETED]: '#10b981',         // 綠色 - 已完工
    [CaseStatus.WARRANTY]: '#6b7280',          // 灰色 - 保固期
    // Legacy 狀態對應
    [CaseStatus.NEW]: '#3b82f6',
    [CaseStatus.PROGRESS]: '#ef4444',
    [CaseStatus.DONE]: '#10b981',
};

// 修復地圖渲染問題的輔助元件
const MapResizeFix: React.FC = () => {
    const map = useMap();

    useEffect(() => {
        // 延遲呼叫 invalidateSize 確保地圖容器已完全渲染
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
    // 過濾有座標的案件
    const casesWithLocation = useMemo(() =>
        cases.filter(c => c.latitude && c.longitude),
        [cases]
    );

    // 計算地圖中心點（所有案件的平均座標）
    const mapCenter = useMemo<[number, number]>(() => {
        if (casesWithLocation.length === 0) {
            return [25.0330, 121.5654]; // 預設：台北市中心
        }

        const avgLat = casesWithLocation.reduce((sum, c) => sum + c.latitude!, 0) / casesWithLocation.length;
        const avgLng = casesWithLocation.reduce((sum, c) => sum + c.longitude!, 0) / casesWithLocation.length;

        return [avgLat, avgLng];
    }, [casesWithLocation]);

    // 建立自訂標記圖示
    const createIcon = (color: string) => {
        const svgIcon = `
      <svg width="32" height="42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26c0-8.8-7.2-16-16-16z" 
              fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="#fff"/>
      </svg>
    `;

        return L.divIcon({
            html: svgIcon,
            className: 'custom-marker',
            iconSize: [32, 42],
            iconAnchor: [16, 42],
            popupAnchor: [0, -42]
        });
    };

    return (
        <Layout title="施工地圖 / CONSTRUCTION MAP" onNavigate={onNavigate} currentView="map">
            <div className="space-y-4">
                {/* 圖例 */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-zinc-200">
                    <div className="text-[10px] font-black uppercase text-zinc-400 mb-3 tracking-wider">
                        施工階段圖例 / LEGEND
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {[
                            CaseStatus.ASSESSMENT,
                            CaseStatus.DEPOSIT_RECEIVED,
                            CaseStatus.PLANNING,
                            CaseStatus.CONSTRUCTION,
                            CaseStatus.FINAL_PAYMENT,
                            CaseStatus.COMPLETED,
                            CaseStatus.WARRANTY
                        ].map(status => (
                            <div key={status} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: STATUS_COLORS[status] }}
                                />
                                <span className="text-xs font-bold">{STATUS_LABELS[status]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 地圖容器 */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-zinc-200">
                    <MapContainer
                        center={mapCenter}
                        zoom={casesWithLocation.length === 0 ? 12 : 11}
                        zoomControl={false}
                        className="h-[600px] w-full"
                        style={{ zIndex: 1 }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ZoomControl position="topright" />
                        <MapResizeFix />

                        {casesWithLocation.map(caseData => (
                            <Marker
                                key={caseData.caseId}
                                position={[caseData.latitude!, caseData.longitude!]}
                                icon={createIcon(STATUS_COLORS[caseData.status] || STATUS_COLORS[CaseStatus.NEW])}
                                eventHandlers={{
                                    click: () => onCaseClick?.(caseData)
                                }}
                            >
                                <Popup>
                                    <div className="p-2 min-w-[200px]">
                                        <div className="font-black text-sm mb-2">{caseData.customerName}</div>
                                        <div className="text-xs space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-zinc-500">階段:</span>
                                                <span
                                                    className="px-2 py-0.5 rounded-sm text-white font-bold text-[10px]"
                                                    style={{ backgroundColor: STATUS_COLORS[caseData.status] || STATUS_COLORS[CaseStatus.NEW] }}
                                                >
                                                    {STATUS_LABELS[caseData.status]}
                                                </span>
                                            </div>
                                            {caseData.address && (
                                                <div className="text-zinc-600">
                                                    📍 {caseData.address}
                                                </div>
                                            )}
                                            <div className="text-zinc-500 text-[10px]">
                                                案號: {caseData.caseId}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onCaseClick?.(caseData)}
                                            className="mt-2 w-full py-1 bg-zinc-950 text-white text-[10px] font-black uppercase rounded-sm hover:bg-zinc-800 transition-colors"
                                        >
                                            查看詳情
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                {/* 統計資訊 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-zinc-200">
                        <div className="text-2xl font-black">{casesWithLocation.length}</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">地圖上案件</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-zinc-200">
                        <div className="text-2xl font-black text-amber-600">{cases.length - casesWithLocation.length}</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">待加入座標</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-zinc-200">
                        <div className="text-2xl font-black text-red-600">
                            {casesWithLocation.filter(c => c.status === CaseStatus.CONSTRUCTION || c.status === CaseStatus.PROGRESS).length}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">施工中</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-zinc-200">
                        <div className="text-2xl font-black text-green-600">
                            {casesWithLocation.filter(c => c.status === CaseStatus.COMPLETED || c.status === CaseStatus.DONE).length}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">已完工</div>
                    </div>
                </div>

                {/* 無座標案件提示 */}
                {cases.length - casesWithLocation.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                        <div className="text-amber-800 text-sm font-bold">
                            💡 提示：有 {cases.length - casesWithLocation.length} 個案件尚未設定地址座標
                        </div>
                        <div className="text-amber-600 text-xs mt-1">
                            請在案件詳情頁面加入地址，系統將自動轉換為地圖座標
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};
