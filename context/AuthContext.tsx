import { supabase } from "@/config/supabase";
import { User } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export interface UserProfile{
    id:string;
    email:string;
    id_role:number;
    first_name:string;
    last_name:string;
    avatar_url?:string;
}

type AuthProviderProps = {
    children:ReactNode;
}

interface AuthContextType{
    user: User|null;
    profile: UserProfile | null;
    loading: boolean;
    signIn: (email:string, password:string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>; // Útil para recargar datos sin reloguear
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}:AuthProviderProps)=>{
    const [user,setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);


    //Traer el perfil
    const fetchProfile = async (userId: string)=>{
        try{
            const {data,error} = await supabase.from('profiles').select('*').eq('id',userId).single();
            if(error) throw error;
            setProfile(data as UserProfile);
        }catch(error){
            console.log('Error al obtener el perfil:',error);
        }
    }

    useEffect(()=>{
        //Verificar si ya hay sesion guardada al abrir la app
        const checkUser = async () =>{
            try{
                const {data: {session}} = await supabase.auth.getSession();
                if(session?.user){
                    setUser(session.user);
                    await fetchProfile(session.user.id)
                }
            }catch(error){
                console.log('Error de sesión:',error);
            }finally{
                setLoading(false);
            }
        };

        checkUser();

        //Escuchar cambios (Login/logout)
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
    },[]);

    const signIn = async (email:string, password:string) => {
        const {error} = await supabase.auth.signInWithPassword({email,password});
        if(error) throw error;
    };

    const signOut = async ()=>{
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    /*const signUp = async (email, password) => {
        const {error} = await supabase.auth.signUp({email,password});
        if(error) throw error;
    };*/
    
    const value = {
        user,
        profile,
        loading,
        signIn,
        signOut,
        refreshProfile
    };

    return(
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if(!context){
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
