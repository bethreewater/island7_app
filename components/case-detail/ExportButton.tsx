import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../InputComponents';

export const ExportButton: React.FC<{ onClick: () => Promise<void>; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await onClick();
        } catch (e) {
            toast.error("Export Failed: " + e, { duration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleClick}
            variant="outline"
            className={`h-16 border-zinc-200 ${loading ? 'opacity-50 cursor-wait' : ''}`}
        >
            {loading ? <div className="animate-spin mr-2"><Wand2 size={20} /></div> : <span className="mr-2">{icon}</span>}
            {loading ? 'GENERATING...' : label}
        </Button>
    );
};
