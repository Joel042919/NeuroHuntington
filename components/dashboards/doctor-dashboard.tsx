import { supabase } from '@/config/supabase';
import { useAuth, UserProfile } from '@/context/AuthContext';
import { Appointment } from '@/types/medical';
import { AlertCircle, Calendar, Clock, LogOut, MoreVertical, Stethoscope } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ClinicalCaseDetail from '../doctor/clinicalcasedetail';

export default function DoctorDashboard({ profile }: { profile: UserProfile }) {
  const { signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para controlar el Modal del Detalle
  const [selectedCase, setSelectedCase] = useState<{ caseId: string, patientId: string } | null>(null);

  // Estado para Modal de Acciones (Web Compatibility)
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<{ id: string, status: string } | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          case_id,
          status,
          type:type_appointment(type),
          status_obj:appointment_status(appointment_status),
          patient:profiles!patient_id(id, first_name, last_name)
        `)
        .eq('doctor_id', profile.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setAppointments(data as any);

    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError('No se pudo cargar la agenda.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (apptId: string, currentStatus: string) => {
    setSelectedAppt({ id: apptId, status: currentStatus });
    setActionModalVisible(true);
  };

  const updateStatus = async (id: string, newStatusId: number) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatusId }) // Corregido: status_id -> status
        .eq('id', id);

      if (error) throw error;

      if (error) throw error;

      // Alert funciona bien para mensajes simples, pero para menús es mejor Modal en Web
      Alert.alert("Éxito", "Estado actualizado correctamente.");
      setActionModalVisible(false); // Cerrar modal
      fetchAppointments(); // Recargar lista
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo actualizar el estado.");
    }
  };

  const totalAppointments = appointments.length;
  // Filtrar citas pendientes/programadas para prioridad
  // Usamos status_obj porque en el select lo renombramos o accedemos al objeto anidado
  const pendingCount = appointments.filter(a => (a as any).status_obj?.appointment_status === 'programada').length;

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Doctor */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.subtitle}>Bienvenido Dr.</Text>
            <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit>{profile.first_name} {profile.last_name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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
            <Text style={styles.statLabel}>Total Citas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
            <AlertCircle size={24} color="#ea580c" />
            <Text style={[styles.statNumber, { color: '#ea580c' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Agenda</Text>

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
            <Text style={styles.emptyText}>No hay citas programadas.</Text>
          </View>
        )}

        <View style={styles.appointmentList}>
          {appointments.map((appt) => {
            const time = new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Accedemos a status_obj, el alias que dimos en el select
            const statusStr = (appt as any).status_obj?.appointment_status || 'Desconocido';

            const isCompleted = statusStr === 'completado';
            const isCancelled = statusStr === 'cancelado';

            return (
              <TouchableOpacity
                key={appt.id}
                style={[styles.apptCard, isCancelled && { opacity: 0.6 }]}
                onPress={() => {
                  if (appt.patient?.id) {
                    setSelectedCase({ caseId: appt.case_id, patientId: appt.patient.id });
                  }
                }}
              >
                <View style={styles.timeColumn}>
                  <Clock size={14} color="#64748b" />
                  <Text style={styles.timeText}>{time}</Text>
                </View>

                <View style={styles.infoColumn}>
                  <Text style={styles.patientName}>
                    {appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'Paciente desconocido'}
                  </Text>
                  <Text style={styles.apptType}>{appt.type?.type || 'Tipo desconocido'}</Text>

                  <View style={[
                    styles.priorityTag,
                    { backgroundColor: isCompleted ? '#dcfce7' : isCancelled ? '#fee2e2' : '#eff6ff' }
                  ]}>
                    <Text style={[
                      styles.priorityText,
                      { color: isCompleted ? '#166534' : isCancelled ? '#ef4444' : '#2563eb' }
                    ]}>
                      {statusStr.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Botón de Acción */}
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => handleUpdateStatus(appt.id, statusStr)}
                >
                  <MoreVertical color="#94a3b8" size={20} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL DE DETALLE COMPLETO */}
      <Modal
        visible={!!selectedCase}
        animationType="slide"
        presentationStyle="pageSheet"
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

      {/* MODAL DE ACCIONES (STATUS) */}
      <Modal
        visible={actionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gestionar Cita</Text>
            <Text style={styles.modalSubtitle}>Estado actual: {selectedAppt?.status}</Text>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#16a34a' }]}
              onPress={() => updateStatus(selectedAppt!.id, 1)}
            >
              <Text style={styles.modalButtonText}>Marcar Completado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#ef4444' }]}
              onPress={() => updateStatus(selectedAppt!.id, 3)}
            >
              <Text style={styles.modalButtonText}>Marcar Cancelado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#f1f5f9', marginTop: 8 }]}
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: '#64748b' }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
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

  priorityTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 10, fontWeight: 'bold' },

  errorContainer: { alignItems: 'center', padding: 20, gap: 10 },
  errorText: { color: '#ef4444', textAlign: 'center' },
  retryText: { color: '#2563eb', fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { color: '#94a3b8', textAlign: 'center' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 12 },
  modalButton: { padding: 14, borderRadius: 12, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});