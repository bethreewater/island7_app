import React, { useState } from 'react';
import { useMap } from 'react-leaflet';
import { Locate, Loader2 } from 'lucide-react';

export const LocationControl: React.FC = () => {
    const map = useMap();
    const [loading, setLoading] = useState(false);

    const handleLocateCheck = () => {
        setLoading(true);
        map.locate().on("locationfound", function (e) {
            map.flyTo(e.latlng, map.getZoom());
            setLoading(false);
        }).on("locationerror", function (e) {
            console.error(e);
            setLoading(false);
            alert("無法獲取您的位置，請確認瀏覽器權限");
        });
    };

    return (
        <div className="leaflet-top leaflet-left mt-[80px] ml-[10px] sticky pointer-events-auto z-[400]">
            {/* Use standard leaflet control positioning or custom absolute? 
                 Leaflet controls are usually inside .leaflet-control-container.
                 But React Leaflet allows simple absolute positioning on top of map.
             */}
            <button
                onClick={handleLocateCheck}
                className="bg-white p-2 rounded-lg shadow-md border border-zinc-300 hover:bg-zinc-50 text-zinc-600 transition-colors"
                title="定位到我的位置"
                style={{ position: 'absolute', top: '70px', left: '10px' }}
            >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Locate size={20} />}
            </button>
        </div>
    );
};
