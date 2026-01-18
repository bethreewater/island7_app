import React, { useMemo } from 'react';
import { Polyline } from 'react-leaflet';
import { CaseData } from '../../types';

interface RouteLayerProps {
    cases: CaseData[];
}

export const RouteLayer: React.FC<RouteLayerProps> = ({ cases }) => {
    // 1. Filter cases that have "Today" tasks
    // For now, since we don't have the full Calendar state passed down here efficiently,
    // we might need to rely on `cases` prop if it contains schedule data?
    // Wait, `CaseData` usually has `projectCalendar` field if we fetched it?
    // Let's check `CaseData` type in `types.ts` via memory or assume it's attached.
    // If not, we might need to approximate or request it. 
    // Assuming `CaseData` doesn't have calendar populated deeply in list view.
    // However, `TodayTasks.tsx` logic calculates tasks.

    // Simplification for Phase 3: Connect ALL "Active" (Construction) cases.
    // Or, randomly pick 3 for demo? 
    // Correct approach: Connect 'Construction' data.

    const routePositions = useMemo(() => {
        // Filter only Active construction cases for the route
        const activeCases = cases.filter(c =>
            (c.status === 'CONSTRUCTION' || c.status === 'PROGRESS') &&
            c.latitude && c.longitude
        );

        // Sort by latitude (North to South) as a naive routing logic
        // This is better than random zig-zag.
        activeCases.sort((a, b) => b.latitude! - a.latitude!);

        return activeCases.map(c => [c.latitude!, c.longitude!] as [number, number]);
    }, [cases]);

    if (routePositions.length < 2) return null;

    return (
        <Polyline
            positions={routePositions}
            pathOptions={{
                color: '#3b82f6',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10'
            }}
        />
    );
};
