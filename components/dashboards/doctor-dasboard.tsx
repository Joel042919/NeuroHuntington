import { supabase } from '@/config/supabase';
import { useAuth, UserProfile } from '@/context/AuthContext';
import { Appointment } from '@/types/medical';
import { AlertCircle, Calendar, ChevronRight, Clock, LogOut, Stethoscope } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ClinicalCaseDetail from '../doctor/clinicalcasedetail'; // <--- Importamos el detalle

export default function DoctorDashboard({ profile }: { profile: UserProfile }) {
  const { signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para controlar el Modal del Detalle
  const [selectedCase, setSelectedCase] = useState<{ caseId: string, patientId: string } | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener fecha de hoy en formato ISO (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];

      // Consulta a Supabase
      // Asumimos que la tabla se llama 'appointments' y tiene relaciones configuradas
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          case_id,
          type:type_appointment(type),
          status:appointment_status(appointment_status),
          patient:profiles!patient_id(id, first_name, last_name)
        `)
        .eq('doctor_id', profile.id)
        // .gte('scheduled_at', `${today}T00:00:00`) // Si quieres filtrar por hoy
        // .lte('scheduled_at', `${today}T23:59:59`)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      console.log(profile.id)
      console.log(data)
      // Mapeamos los datos para que coincidan con nuestra interfaz si es necesario
      // Supabase devuelve objetos anidados, que ya coinciden con nuestra interfaz actualizada
      setAppointments(data as any); // Type casting temporal si TS se queja

    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError('No se pudo cargar la agenda.');
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas simples
  const totalAppointments = appointments.length;
  // Por ahora no tenemos prioridad en la DB, así que simulamos o dejamos en 0
  const highPriorityCount = 0;

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Doctor */}
        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>Bienvenido Dr.</Text>
            <Text style={styles.greeting}>{profile.first_name} {profile.last_name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.badge}>
              <Stethoscope size={16} color="#fff" />
              <Text style={styles.badgeText}>Neurología</Text>
            </View>
            <TouchableOpacity onPress={signOut} style={{ padding: 8 }}>
              <LogOut size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumen Diario */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
            <Calendar size={24} color="#2563eb" />
            <Text style={[styles.statNumber, { color: '#2563eb' }]}>{totalAppointments}</Text>
            <Text style={styles.statLabel}>Citas Hoy</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
            <AlertCircle size={24} color="#ea580c" />
            <Text style={[styles.statNumber, { color: '#ea580c' }]}>{highPriorityCount}</Text>
            <Text style={styles.statLabel}>Prioridad Alta</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Agenda</Text>

        {/* Estado de Carga y Error */}
        {loading && <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />}

        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle color="#ef4444" size={24} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchAppointments}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && appointments.length === 0 && (
          <View style={styles.emptyContainer}>
            <Calendar color="#94a3b8" size={48} />
            <Text style={styles.emptyText}>No hay citas programadas para hoy.</Text>
          </View>
        )}

        {/* Lista de Citas (Clickable) */}
        <View style={styles.appointmentList}>
          {appointments.map((appt) => {
            // Formatear hora
            const time = new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <TouchableOpacity
                key={appt.id}
                style={styles.apptCard}
                onPress={() => {
                  if (appt.patient?.id) {
                    setSelectedCase({ caseId: appt.case_id, patientId: appt.patient.id });
                  }
                }}
              >
                {/* Columna Hora */}
                <View style={styles.timeColumn}>
                  <Clock size={14} color="#64748b" />
                  <Text style={styles.timeText}>{time}</Text>
                </View>

                {/* Columna Info */}
                <View style={styles.infoColumn}>
                  <Text style={styles.patientName}>
                    {appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'Paciente desconocido'}
                  </Text>
                  <Text style={styles.apptType}>{appt.type?.type || 'Tipo desconocido'}</Text>
                  {/* Etiqueta de estado en lugar de prioridad por ahora */}
                  <View style={[styles.priorityTag, { backgroundColor: '#f1f5f9' }]}>
                    <Text style={[styles.priorityText, { color: '#64748b' }]}>{appt.status?.appointment_status || 'Estado desconocido'}</Text>
                  </View>
                </View>

                <ChevronRight color="#cbd5e1" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Espacio extra al final */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL DE DETALLE COMPLETO */}
      <Modal
        visible={!!selectedCase}
        animationType="slide"
        presentationStyle="pageSheet" // Estilo iOS nativo muy bonito
        onRequestClose={() => setSelectedCase(null)}
      >
        {selectedCase && (
          <ClinicalCaseDetail
            caseId={selectedCase.caseId}
            patientId={selectedCase.patientId}
            onClose={() => setSelectedCase(null)}
          />
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b' },
  badge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, gap: 8, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#64748b' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },

  appointmentList: { gap: 12 },
  apptCard: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8
  },
  timeColumn: { alignItems: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: '#f1f5f9', width: 80 },
  timeText: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginTop: 4, textAlign: 'center' },

  infoColumn: { flex: 1, paddingLeft: 16 },
  patientName: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  apptType: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },

  priorityTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 10, color: '#ef4444', fontWeight: 'bold' },

  errorContainer: { alignItems: 'center', padding: 20, gap: 10 },
  errorText: { color: '#ef4444', textAlign: 'center' },
  retryText: { color: '#2563eb', fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { color: '#94a3b8', textAlign: 'center' }
});