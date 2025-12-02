import { supabase } from '@/config/supabase';
import { useAuth, UserProfile } from '@/context/AuthContext';
import { Activity, CalendarClock, ChevronRight, FileText, LogOut, Pill } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PatientDashboard({ profile }: { profile: UserProfile }) {
  const { signOut } = useAuth();
  const [caseStatus, setCaseStatus] = useState<string>('Cargando...');
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      setLoading(true);

      // 1. Obtener estado del caso clínico activo
      const { data: caseData, error: caseError } = await supabase
        .from('clinical_cases')
        .select('status(case_status)')
        .eq('patient_id', profile.id)
        .eq('is_active', true)
        .single();

      if (caseData) {
        setCaseStatus((caseData.status as any)?.case_status || 'Sin estado');
      } else {
        setCaseStatus('Sin caso activo');
      }

      // 2. Obtener próxima cita
      const today = new Date().toISOString();
      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .select(`
          scheduled_at,
          doctor:profiles!doctor_id(first_name, last_name),
          type:type_appointment(type)
        `)
        .eq('patient_id', profile.id)
        .gte('scheduled_at', today)
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .single();

      if (apptData) {
        setNextAppointment(apptData);
      }

    } catch (error) {
      console.error('Error fetching patient data:', error);
      setCaseStatus('Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header de Bienvenida */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {profile.first_name}</Text>
          <Text style={styles.subtitle}>Tu salud es nuestra prioridad</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={{ padding: 8 }}>
          <LogOut size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 20 }} />
      ) : (
        <>
          {/* Tarjeta de Estado Principal */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Activity color="#fff" size={24} />
              <Text style={styles.statusTitle}>Estado del Caso</Text>
            </View>
            <Text style={styles.statusValue}>{caseStatus}</Text>
            <Text style={styles.statusDesc}>
              {caseStatus === 'Sin caso activo'
                ? 'No tienes un proceso médico en curso.'
                : 'Tu equipo médico está trabajando en tu caso.'}
            </Text>
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
          {nextAppointment ? (
            <View style={styles.appointmentCard}>
              <View>
                <Text style={styles.apptLabel}>Próxima Cita</Text>
                <Text style={styles.apptDate}>
                  {new Date(nextAppointment.scheduled_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.apptDoc}>
                  Dr. {nextAppointment.doctor.first_name} {nextAppointment.doctor.last_name} ({nextAppointment.type.type})
                </Text>
              </View>
              <ChevronRight color="#94a3b8" />
            </View>
          ) : (
            <View style={styles.appointmentCard}>
              <Text style={{ color: '#64748b' }}>No tienes citas próximas.</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  apptDate: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' },
  apptDoc: { fontSize: 14, color: '#64748b' }
});