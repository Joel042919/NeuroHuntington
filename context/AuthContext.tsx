import { supabase } from "@/config/supabase";
import { User } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export interface UserProfile {
    id: string;
    email: string;
    id_role: number;
    first_name: string;
    last_name: string;
    avatar_url?: string;
}

type AuthProviderProps = {
    children: ReactNode;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            console.log("Intentando obtener perfil para ID:", userId);
            const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

            if (error) throw error;

            if (!data) {
                console.warn('⚠️ Perfil no encontrado en DB para este usuario. Posible bloqueo RLS o datos faltantes.');
            } else {
                console.log("✅ Perfil encontrado:", data);
            }
            setProfile(data as UserProfile);
        } catch (error) {
            console.error('❌ Error al obtener el perfil:', error);
        }
    }

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id)
                }
            } catch (error) {
                console.log('Error de sesión:', error);
            } finally {
                setLoading(false);
            }
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe()
        }
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    const value = {
        user,
        profile,
        loading,
        signIn,
        signOut,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
