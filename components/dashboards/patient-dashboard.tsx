import { supabase } from '@/config/supabase';
import { useAuth, UserProfile } from '@/context/AuthContext';
import { Activity, LogOut, Pill } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PatientDashboard({ profile }: { profile: UserProfile }) {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data State
  const [clinicalCases, setClinicalCases] = useState<any[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [latestDiagnosis, setLatestDiagnosis] = useState<any>(null);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [triage, setTriage] = useState<any>(null);

  useEffect(() => {
    fetchComprehensiveData();
  }, []);

  const fetchComprehensiveData = async () => {
    try {
      setLoading(true);

      // 1. Clinical Cases (Active & History)
      const { data: casesData } = await supabase
        .from('clinical_cases')
        .select(`
          id, code_case, start_date, is_active,
          status:case_status(case_status)
        `)
        .eq('patient_id', profile.id)
        .order('is_active', { ascending: false }) // Active first
        .order('start_date', { ascending: false });

      setClinicalCases(casesData || []);

      // 2. Medical History
      const { data: historyData } = await supabase
        .from('medical_histories')
        .select('*')
        .eq('patient_id', profile.id)
        .single();

      setMedicalHistory(historyData);

      // 3. Appointments
      const { data: apptData } = await supabase
        .from('appointments')
        .select(`
          id, scheduled_at, 
          type:type_appointment(type),
          status:appointment_status(appointment_status),
          doctor:profiles!doctor_id(first_name, last_name)
        `)
        .eq('patient_id', profile.id)
        .order('scheduled_at', { ascending: false }); // Newest first

      setAppointments(apptData || []);

      // 4. Prescriptions (Active Case Context usually, but getting all for now)
      // Need to join with details
      const { data: prescData } = await supabase
        .from('prescriptions')
        .select(`
          id, created_at,
          doctor:profiles!doctor_id(first_name, last_name),
          details:prescription_detail(*)
        `)
        .eq('case_id', casesData?.[0]?.id) // Improve: Get for all or active case? Let's try active case first if exists
        .order('created_at', { ascending: false });

      setPrescriptions(prescData || []);

      // 5. Latest Diagnosis (Neurology Assessment)
      if (casesData?.[0]?.id) {
        const { data: neuroData } = await supabase
          .from('neurology_assessments')
          .select('*')
          .eq('case_id', casesData[0].id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        setLatestDiagnosis(neuroData);
      }

    } catch (error) {
      console.error('Error fetching patient dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeCases = clinicalCases.filter(c => c.is_active);
  const inactiveCases = clinicalCases.filter(c => !c.is_active);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit>Hola, {profile.first_name}</Text>
          <Text style={styles.subtitle}>Tu expediente médico en tiempo real</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={{ padding: 8, flexShrink: 0 }}>
          <LogOut size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <View style={{ gap: 24, paddingBottom: 40 }}>

          {/* SECCIÓN 1: VISTA GENERAL DEL CASO (Activo o Último) */}
          <View>
            <Text style={styles.sectionTitle}>Estado Actual</Text>
            {activeCases.length > 0 || clinicalCases.length > 0 ? (
              // Use a standard logic to pick the case to show summary for
              (() => {
                const displayCase = activeCases.length > 0 ? activeCases[0] : clinicalCases[0];
                return (
                  <View style={styles.activeCaseCard}>
                    <View style={styles.caseHeader}>
                      <View>
                        <Text style={styles.caseCode}>{displayCase.code_case}</Text>
                        <Text style={styles.caseDate}>Iniciado: {new Date(displayCase.start_date).toLocaleDateString()}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: displayCase.is_active ? '#2563eb' : '#64748b' }]}>
                        <Activity size={14} color="#fff" />
                        <Text style={styles.statusText}>{(displayCase.status_obj as any)?.case_status || (displayCase.is_active ? 'ACTIVO' : 'CERRADO')}</Text>
                      </View>
                    </View>

                    {/* Triage Info */}
                    {triage && (
                      <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#334155' }}>Signos Vitales (Triaje)</Text>
                          <Text style={{ fontWeight: 'bold', fontSize: 12, color: (triage.priority_label as any)?.priority === 'Alta' ? '#ef4444' : '#f59e0b' }}>
                            Prioridad: {(triage.priority_label as any)?.priority}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                          <Text style={{ fontSize: 13, color: '#475569' }}>Presión: <Text style={{ fontWeight: 'bold' }}>{triage.systolic_pressure}/{triage.diastolic_pressure}</Text></Text>
                          <Text style={{ fontSize: 13, color: '#475569' }}>Temp: <Text style={{ fontWeight: 'bold' }}>{triage.temperature}°C</Text></Text>
                          <Text style={{ fontSize: 13, color: '#475569' }}>Sat: <Text style={{ fontWeight: 'bold' }}>{triage.oxygen_saturation}%</Text></Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })()
            ) : (
              <View style={styles.emptyCard}>
                <Text style={{ color: '#64748b' }}>No hay expedientes registrados.</Text>
              </View>
            )}
          </View>

          {/* SECCIÓN 2: EVALUACIÓN NEUROLÓGICA (Detalle) */}
          {latestDiagnosis && (
            <View>
              <Text style={styles.sectionTitle}>Evaluación Neurológica</Text>
              <View style={styles.assessmentCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={styles.cardTitle}>Dr. {latestDiagnosis.doctor?.first_name} {latestDiagnosis.doctor?.last_name}</Text>
                  <Text style={styles.cardDate}>{new Date(latestDiagnosis.created_at).toLocaleDateString()}</Text>
                </View>

                <Text style={styles.diagnosisLabel}>DIAGNÓSTICO PRINCIPAL</Text>
                <Text style={styles.diagnosisText}>{latestDiagnosis.diagnosis || "Sin diagnóstico"}</Text>

                <View style={styles.scoresGrid}>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreValue}>{latestDiagnosis.uhdrs_score || '-'}</Text>
                    <Text style={styles.scoreLabel}>UHDRS</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreValue}>{latestDiagnosis.mmse_score || '-'}</Text>
                    <Text style={styles.scoreLabel}>MMSE</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreValue}>{latestDiagnosis.pba_score || '-'}</Text>
                    <Text style={styles.scoreLabel}>PBA</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreValue}>{latestDiagnosis.functional_capacity || '-'}</Text>
                    <Text style={styles.scoreLabel}>C.FUNC</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* SECCIÓN 3: RESULTADOS DE LABORATORIO */}
          {labResults.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Resultados de Laboratorio</Text>
              {labResults.map(lab => (
                <View key={lab.id} style={styles.labCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.labType}>{(lab.type as any)?.test_name || 'Examen de Laboratorio'}</Text>
                    <Text style={styles.labDate}>{new Date(lab.analyzed_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.labDesc}>{lab.result_summary}</Text>
                  {lab.result_data && (
                    <View style={styles.labResultBox}>
                      <Text style={styles.labResultText}>
                        Resultados detallados disponibles en el expediente completo.
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* SECCIÓN 4: MIS RECETAS (Medicación Actual) */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <Pill color="#16a34a" size={20} />
              <Text style={styles.sectionTitle}>Tratamiento Farmacológico</Text>
            </View>
            {prescriptions.length > 0 ? (
              prescriptions.map(p => (
                <View key={p.id} style={styles.prescriptionCard}>
                  <Text style={styles.prescDoctor}>Dr. {p.doctor?.first_name} {p.doctor?.last_name}</Text>
                  <Text style={styles.prescDate}>{new Date(p.created_at).toLocaleDateString()}</Text>

                  <View style={styles.divider} />

                  {p.details?.map((d: any) => (
                    <View key={d.id} style={styles.medicationRow}>
                      <View style={styles.bullet} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medName}>{d.medication_name} ({d.dosage})</Text>
                        <Text style={styles.medInstructions}>{d.frequency} - {d.duration}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <Text style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: 20 }}>No hay recetas registradas para este caso.</Text>
            )}
          </View>

          {/* SECCIÓN 4: PRÓXIMAS CITAS */}
          <View>
            <Text style={styles.sectionTitle}>Agenda Médica</Text>
            {appointments.slice(0, 3).map(appt => (
              <View key={appt.id} style={styles.apptRow}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{new Date(appt.scheduled_at).getDate()}</Text>
                  <Text style={styles.dateMonth}>{new Date(appt.scheduled_at).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <Text style={styles.apptType}>{(appt.type as any)?.type}</Text>
                  <Text style={styles.apptDoctor}>Dr. {appt.doctor?.first_name} {appt.doctor?.last_name}</Text>
                  <Text style={styles.apptTime}>{new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: appt.status_obj?.appointment_status === 'programada' ? '#dcfce7' : '#f1f5f9' }]}>
                  <Text style={[styles.statusTagText, { color: appt.status_obj?.appointment_status === 'programada' ? '#166534' : '#64748b' }]}>
                    {(appt.status_obj as any)?.appointment_status}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* SECCIÓN 5: HISTORIAL MÉDICO BÁSICO */}
          {medicalHistory && (
            <View style={styles.historyContainer}>
              <Text style={[styles.sectionTitle, { color: '#fff' }]}>Información Médica</Text>
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>Tipo de Sangre:</Text>
                <Text style={styles.historyValue}>{medicalHistory.blood_type || 'N/A'}</Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>Alergias:</Text>
                <Text style={styles.historyValue}>{medicalHistory.allergies?.join(', ') || 'Ninguna'}</Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>Condiciones Crónicas:</Text>
                <Text style={styles.historyValue}>{medicalHistory.chronic_conditions?.join(', ') || 'Ninguna'}</Text>
              </View>
            </View>
          )}

        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },

  // Active Case
  activeCaseCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16
  },
  caseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caseCode: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  caseDate: { fontSize: 12, color: '#94a3b8' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20
  },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },

  diagnosisBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#f59e0b', marginTop: 12 },
  diagnosisLabel: { fontSize: 12, fontWeight: 'bold', color: '#f59e0b', marginBottom: 4 },
  diagnosisText: { fontSize: 14, color: '#334155', lineHeight: 20 },

  // Assessment Card (New)
  assessmentCard: {
    backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardDate: { fontSize: 12, color: '#64748b' },
  scoresGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 },
  scoreItem: { alignItems: 'center' },
  scoreValue: { fontSize: 16, fontWeight: '900', color: '#2563eb' },
  scoreLabel: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  smallText: { fontSize: 13, color: '#64748b', lineHeight: 18 },

  // Labs
  labCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  labType: { fontSize: 12, fontWeight: 'bold', color: '#2563eb' },
  labDate: { fontSize: 12, color: '#94a3b8' },
  labDesc: { fontSize: 14, color: '#334155', marginTop: 4, marginBottom: 8 },
  labResultBox: { backgroundColor: '#f0f9ff', padding: 10, borderRadius: 8 },
  labResultText: { color: '#0369a1', fontSize: 13 },

  emptyCard: { backgroundColor: '#f1f5f9', padding: 20, borderRadius: 12, alignItems: 'center' },

  // Grid Stats
  grid: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  cardLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  iconBg: { padding: 8, borderRadius: 8 },

  // Prescriptions
  prescriptionCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  prescDoctor: { fontWeight: 'bold', color: '#1e293b', fontSize: 14, marginBottom: 12 },
  prescDate: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },
  medicationRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginTop: 6 },
  medName: { fontWeight: '600', color: '#334155', fontSize: 14 },
  medInstructions: { color: '#64748b', fontSize: 12 },

  // Appointments
  apptRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, alignItems: 'center' },
  dateBox: { alignItems: 'center', paddingRight: 12, borderRightWidth: 1, borderRightColor: '#f1f5f9', minWidth: 50 },
  dateDay: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  dateMonth: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  apptType: { fontSize: 12, color: '#2563eb', fontWeight: 'bold', marginBottom: 2 },
  apptDoctor: { fontSize: 14, color: '#334155' },
  apptTime: { fontSize: 12, color: '#64748b' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusTagText: { fontSize: 10, fontWeight: 'bold' },

  // History
  historyContainer: { backgroundColor: '#1e293b', padding: 20, borderRadius: 20 },
  historyText: { color: '#cbd5e1', marginBottom: 4 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 8 },
  historyLabel: { color: '#94a3b8', fontWeight: 'bold' },
  historyValue: { color: '#fff', fontWeight: '600', maxWidth: '60%', textAlign: 'right' }
});