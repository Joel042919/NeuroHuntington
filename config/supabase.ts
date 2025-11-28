import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';


const supabaseURL ='https://lgdkhhrxtjbuijcnqvyr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZGtoaHJ4dGpidWlqY25xdnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzNzQsImV4cCI6MjA3OTg1OTM3NH0.0CLlx1GPRwR48yNOCcVfyUJpsWY2MmVdk7JrvDvWbaI';

export const supabase = createClient(supabaseURL,supabaseAnonKey,{
    auth:{
        ...(Platform.OS !== "web" ? {storage: AsyncStorage}:{}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
    },
});

if(Platform.OS !== "web"){
    AppState.addEventListener('change',(state)=>{
        if(state==='active'){
            supabase.auth.startAutoRefresh()
        }else{
            supabase.auth.stopAutoRefresh()
        }
    })
}
