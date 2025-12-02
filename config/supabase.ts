import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';


const supabaseURL = 'https://lgdkhhrxtjbuijcnqvyr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZGtoaHJ4dGpidWlqY25xdnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzNzQsImV4cCI6MjA3OTg1OTM3NH0.0CLlx1GPRwR48yNOCcVfyUJpsWY2MmVdk7JrvDvWbaI';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZGtoaHJ4dGpidWlqY25xdnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzM3NCwiZXhwIjoyMDc5ODU5Mzc0fQ.mDhjbcRMHwfXRi9_D0Z-1IPnsBT8BC3bNucsAniSsyM';

export const supabase = createClient(supabaseURL, supabaseServiceKey, {
    auth: {
        ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
    },
});

if (Platform.OS !== "web") {
    AppState.addEventListener('change', (state) => {
        if (state === 'active') {
            supabase.auth.startAutoRefresh()
        } else {
            supabase.auth.stopAutoRefresh()
        }
    })
}
