import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Creamos un componente interno para poder usar los hooks de Auth y Router
// Esto es necesario porque RootLayout debe contener el Provider
const AppLayout = () => {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (loading) return;

    // segments[0] nos dice en qué "grupo" de rutas estamos
    const inAuthGroup = segments[0] === '(tabs)';

    // Si cambias el nombre del archivo a index.tsx, la ruta sería "/Login"
    const inLoginRoute = segments[0] === 'login';

    if (!user && !inLoginRoute) {
      // Si no hay usuario y no estás en la pantalla de login, ¡fuera!
      router.replace('/login');
    } else if (user && inLoginRoute) {
      // Si ya hay usuario y estás intentando loguearte, te mando al home
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Tus pantallas principales (protegidas) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Tu pantalla de Login (pública) */}
        {/* OJO: Debe coincidir con el nombre de tu carpeta "login" */}
        <Stack.Screen name="login/index" options={{ headerShown: false }} />

        {/* Modales u otras pantallas */}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
};

export default function RootLayout() {
  return (
    // Envolvemos TODO en el AuthProvider
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}