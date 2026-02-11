import React, { useMemo } from 'react';
import { Polyline } from 'react-leaflet';
import { CaseData, isConstructionStatus } from '../../types';

interface RouteLayerProps {
    cases: CaseData[];
}

export const RouteLayer: React.FC<RouteLayerProps> = ({ cases }) => {
    const routePositions = useMemo(() => {
        const activeCases = cases.filter(c =>
            isConstructionStatus(c.status) &&
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
