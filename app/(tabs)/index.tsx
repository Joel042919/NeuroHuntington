
import { ThemedView } from '@/components/themed-view'; // Usando el componente que ya tenías
import { useAuth } from '@/context/AuthContext';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import DoctorDashboard from '../../components/dashboards/doctor-dasboard';
import PatientDashboard from '../../components/dashboards/patiend-dashboard';


// IDs basados en tu descripción (Asegúrate que coincidan con tu tabla user_role)
// 1: Admin, 2: Doctor, 3: Paciente, 4: Recepcionista
const ROLES = {
  ADMIN: 1,
  DOCTOR: 2,
  PATIENT: 3,
  RECEPTIONIST: 4
};

export default function HomeScreen() {
  const { profile, loading } = useAuth();

  // 1. Cargando
  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // 2. Renderizado condicional basado en rol
  const renderDashboard = () => {
    switch (profile.id_role) {
      case ROLES.DOCTOR:
        return <DoctorDashboard profile={profile} />;
      
      case ROLES.PATIENT:
        return <PatientDashboard profile={profile} />;
      
      case ROLES.RECEPTIONIST:
        // Puedes crear un componente similar para recepcionista después
        return <DoctorDashboard profile={profile} />; // Temporalmente usa el de doctor
        
      default:
        // Fallback o Admin
        return <PatientDashboard profile={profile} />;
    }
  };

  return (
    <ThemedView style={styles.container}>
      {renderDashboard()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60, // Espacio para la barra de estado
    backgroundColor: '#f8fafc', // Slate-50 background general
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});