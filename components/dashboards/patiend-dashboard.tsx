import { UserProfile } from '@/context/AuthContext';
import { Activity, CalendarClock, ChevronRight, FileText, Pill } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PatientDashboard({ profile }: { profile: UserProfile }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header de Bienvenida */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {profile.first_name}</Text>
        <Text style={styles.subtitle}>Tu salud es nuestra prioridad</Text>
      </View>

      {/* Tarjeta de Estado Principal */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Activity color="#fff" size={24} />
          <Text style={styles.statusTitle}>Estado del Caso</Text>
        </View>
        <Text style={styles.statusValue}>En Evaluación Neurológica</Text>
        <Text style={styles.statusDesc}>Dr. Strange está revisando tus resultados genéticos.</Text>
      </View>

      {/* Accesos Rápidos (Grid) */}
      <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={styles.card}>
          <View style={[styles.iconBg, { backgroundColor: '#e0f2fe' }]}>
            <CalendarClock color="#0284c7" size={24} />
          </View>
          <Text style={styles.cardTitle}>Mis Citas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <View style={[styles.iconBg, { backgroundColor: '#dcfce7' }]}>
            <Pill color="#16a34a" size={24} />
          </View>
          <Text style={styles.cardTitle}>Recetas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <View style={[styles.iconBg, { backgroundColor: '#f3e8ff' }]}>
            <FileText color="#9333ea" size={24} />
          </View>
          <Text style={styles.cardTitle}>Historial</Text>
        </TouchableOpacity>
      </View>

      {/* Próxima Cita (Preview) */}
      <View style={styles.appointmentCard}>
        <View>
          <Text style={styles.apptLabel}>Próxima Cita</Text>
          <Text style={styles.apptDate}>Jueves, 28 Nov - 10:00 AM</Text>
          <Text style={styles.apptDoc}>Dr. Strange (Neurología)</Text>
        </View>
        <ChevronRight color="#94a3b8" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 16, color: '#64748b' },
  
  statusCard: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  statusTitle: { color: '#bfdbfe', fontWeight: '600', fontSize: 14 },
  statusValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  statusDesc: { color: '#e0f2fe', fontSize: 12, opacity: 0.9 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: { 
    flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, 
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#f1f5f9'
  },
  iconBg: { padding: 10, borderRadius: 12, marginBottom: 8 },
  cardTitle: { fontSize: 12, fontWeight: '600', color: '#475569' },

  appointmentCard: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0'
  },
  apptLabel: { fontSize: 10, color: '#2563eb', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  apptDate: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  apptDoc: { fontSize: 14, color: '#64748b' }
});