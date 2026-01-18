import React from 'react';
import { Navigation, X, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { CaseData, STATUS_LABELS } from '../../types';

interface CaseMapCardProps {
    caseData: CaseData;
    onClose: () => void;
    onViewDetail: () => void;
    statusColor: string;
}

export const CaseMapCard: React.FC<CaseMapCardProps> = ({
    caseData,
    onClose,
    onViewDetail,
    statusColor
}) => {

    // Google Maps Navigation URL (Deep Link)
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${caseData.latitude},${caseData.longitude}`;

    return (
        <div className="absolute bottom-0 left-0 right-0 md:bottom-6 md:left-6 md:right-auto md:w-96 z-[1000] m-0 md:m-0 animate-in slide-in-from-bottom duration-300">
            {/* Overlay for mobile tap-to-close handling if needed, but usually map click handles it */}

            <div className="bg-white md:rounded-xl rounded-t-xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header Status Bar */}
                <div
                    className="h-2 w-full"
                    style={{ backgroundColor: statusColor }}
                />

                <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className="px-2 py-0.5 rounded text-white text-[10px] font-black uppercase tracking-wider"
                                    style={{ backgroundColor: statusColor }}
                                >
                                    {STATUS_LABELS[caseData.status]}
                                </span>
                                <span className="text-zinc-400 text-[10px] font-mono">
                                    #{caseData.caseId}
                                </span>
                            </div>
                            <h3 className="font-black text-lg text-zinc-900 leading-tight">
                                {caseData.customerName}
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 -mr-2 -mt-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Info */}
                    <div className="space-y-2.5">
                        <div className="flex items-start gap-3 text-sm text-zinc-600">
                            <MapPin size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                            <div className="flex-1">
                                <div>{caseData.address}</div>
                                {caseData.addressNote && (
                                    <div className="text-xs text-zinc-400 mt-0.5">
                                        備註: {caseData.addressNote}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-600">
                            <Calendar size={16} className="shrink-0 text-zinc-400" />
                            <span>
                                {new Date(caseData.createdDate).toLocaleDateString('zh-TW')} 立案
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={onViewDetail}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-zinc-200 rounded-lg text-sm font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all active:scale-95"
                        >
                            <ExternalLink size={18} />
                            檢視詳情
                        </button>

                        <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                        >
                            <Navigation size={18} />
                            開始導航
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
