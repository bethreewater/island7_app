import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Card, Button, Input } from '../components/InputComponents';
import { Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
        } catch (error: any) {
            alert(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <div className="text-4xl font-black text-zinc-950 tracking-tighter mb-2">ISLAND 7</div>
                    <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Engineering Management System</div>
                </div>

                <Card title="系統登入 / SYSTEM LOGIN">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute top-9 left-3 text-zinc-300 pointer-events-none" size={16} />
                                <Input
                                    label="電子郵件 / EMAIL"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    className="pl-10"
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute top-9 left-3 text-zinc-300 pointer-events-none" size={16} />
                                <Input
                                    label="密碼 / PASSWORD"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    type="password"
                                />
                            </div>
                        </div>

                        <Button className="w-full py-4 text-[11px]" disabled={loading}>
                            {loading ? '登入中 / LOGGING IN...' : '登入系統 / LOGIN'}
                        </Button>

                        <div className="text-center text-[10px] text-zinc-300">
                            Protected by Supabase Auth
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};
