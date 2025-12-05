import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import React from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import DoctorDashboard from '../../components/dashboards/doctor-dashboard';
import NurseDashboard from '../../components/dashboards/nurse-dashboard';
import PatientDashboard from '../../components/dashboards/patient-dashboard';
import ReceptionistDashboard from '../../components/dashboards/receptionist-dashboard';

// IDs basados en tu descripción (Asegúrate que coincidan con tu tabla user_role)
// 1: Admin, 2: Doctor, 3: Paciente, 4: Recepcionista, 5:Enfermera
const ROLES = {
  ADMIN: 1,
  DOCTOR: 2,
  PATIENT: 3,
  RECEPTIONIST: 4,
  NURSE: 5
};

export default function HomeScreen() {
  const { profile, loading, signOut } = useAuth();

  // 1. Cargando
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // 1.1. Sin perfil (Error de datos)
  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 20, fontSize: 16, color: '#ef4444' }}>
          No se encontró perfil para este usuario.
        </Text>
        <Button title="Cerrar Sesión" onPress={signOut} />
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
        return <ReceptionistDashboard profile={profile} />;

      case ROLES.NURSE:
        return <NurseDashboard profile={profile} />;

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