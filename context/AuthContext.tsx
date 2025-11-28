import { supabase } from "@/config/supabase";
import { User, Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AuthProviderProps = {
    children:ReactNode;
}

interface AuthContextType{
    user: User|null;
    loading: boolean;
    signIn: (email:string, password:string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}:AuthProviderProps)=>{
    const [user,setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{

        //Verificar si ya hay sesion guardada al abrir la app
        const checkUser = async () =>{
            try{
                const {data: {session}} = await supabase.auth.getSession();
                if(session){
                    setUser(session.user);
                }
            }catch(error){
                console.log('Error de sesión:',error);
            }finally{
                setLoading(false);
            }
        };

        checkUser();

        //Escuchar cambios (Login/logout)
        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session)=>{
            setUser(session?.user ?? null);
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
    };

    /*const signUp = async (email, password) => {
        const {error} = await supabase.auth.signUp({email,password});
        if(error) throw error;
    };*/
    
    const value = {
        user,
        loading,
        signIn,
        signOut
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
