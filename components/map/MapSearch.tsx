import React, { useState, useMemo } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { CaseData } from '../../types';

interface MapSearchProps {
    cases: CaseData[];
    onSelectCase: (caseData: CaseData) => void;
}

export const MapSearch: React.FC<MapSearchProps> = ({ cases, onSelectCase }) => {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Filter results
    const results = useMemo(() => {
        if (!query.trim()) return [];
        const lowerQ = query.toLowerCase();
        return cases
            .filter(c =>
                (c.customerName.toLowerCase().includes(lowerQ) ||
                    c.address?.toLowerCase().includes(lowerQ)) &&
                c.latitude && c.longitude
            )
            .slice(0, 5); // Limit to top 5
    }, [cases, query]);

    const handleSelect = (c: CaseData) => {
        onSelectCase(c);
        setQuery('');
        setIsFocused(false);
    };

    return (
        <div className="absolute top-16 left-4 right-4 md:right-auto md:w-80 z-[600] pointer-events-none">
            <div className="pointer-events-auto relative">
                <div className="relative shadow-lg rounded-full overflow-hidden border border-zinc-200 bg-white">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        // onBlur handled by overlay click or timeout? better to use backdrop
                        placeholder="搜尋客戶或地址..."
                        className="w-full pl-10 pr-10 py-3 text-sm font-bold bg-transparent outline-none focus:bg-zinc-50 transition-colors"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Results Dropdown */}
                {isFocused && query && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {results.map(c => (
                            <button
                                key={c.caseId}
                                onClick={() => handleSelect(c)}
                                className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-50 last:border-0 transition-colors group"
                            >
                                <div className="font-bold text-sm text-zinc-900 group-hover:text-blue-600 transition-colors">
                                    {c.customerName}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                                    <MapPin size={12} className="shrink-0" />
                                    <span className="truncate">{c.address}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Backdrop to close */}
                {isFocused && (
                    <div
                        className="fixed inset-0 z-[-1]"
                        onClick={() => setIsFocused(false)}
                    />
                )}
            </div>
        </div>
    );
};
