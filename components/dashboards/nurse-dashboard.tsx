import { supabase } from '@/config/supabase';
import { useAuth, UserProfile } from '@/context/AuthContext';
import { PatientProfile } from '@/types/medical';
import { Activity, ClipboardList, LogOut, Search, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NurseDashboard({ profile }: { profile: UserProfile }) {
    const { signOut } = useAuth();
    const [view, setView] = useState<'home' | 'triage' | 'history'>('home');

    // --- ESTADOS DE BÚSQUEDA ---
    const [patientSearch, setPatientSearch] = useState('');
    const [patients, setPatients] = useState<PatientProfile[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
    const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
    const [triageId, setTriageId] = useState<string | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);

    // --- ESTADOS DE FORMULARIOS ---
    const [triageData, setTriageData] = useState({
        weight: '', height: '', temp: '', sys: '', dia: '', heart: '', oxy: '', notes: ''
    });
    const [historyData, setHistoryData] = useState({
        blood_type: '', allergies: '', chronic: ''
    });
    const [saving, setSaving] = useState(false);

    // --- LÓGICA DE BÚSQUEDA ---
    const searchPatients = async (text: string) => {
        setPatientSearch(text);
        if (text.length < 3) {
            setPatients([]);
            return;
        }
        setLoadingSearch(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id_role', 3) // Paciente
            .or(`first_name.ilike.%${text}%,last_name.ilike.%${text}%,dni.ilike.%${text}%`)
            .limit(5);

        if (data) setPatients(data);
        setLoadingSearch(false);
    };

    const selectPatient = async (patient: PatientProfile) => {
        setSelectedPatient(patient);
        setPatients([]);
        setPatientSearch('');

        // 1. Buscar caso activo
        const { data: caseData } = await supabase
            .from('clinical_cases')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('is_active', true)
            .single();

        const cId = caseData?.id || null;
        setActiveCaseId(cId);

        // 2. Buscar Historial Médico existente
        const { data: histData } = await supabase
            .from('medical_histories')
            .select('*')
            .eq('patient_id', patient.id)
            .maybeSingle();

        if (histData) {
            setHistoryData({
                blood_type: histData.blood_type || '',
                allergies: histData.allergies ? histData.allergies.join(', ') : '',
                chronic: histData.chronic_conditions ? histData.chronic_conditions.join(', ') : ''
            });
        } else {
            setHistoryData({ blood_type: '', allergies: '', chronic: '' });
        }

        // 3. Buscar Triaje existente para el caso activo
        if (cId) {
            const { data: triData } = await supabase
                .from('triage_records')
                .select('*')
                .eq('case_id', cId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (triData) {
                setTriageId(triData.id);
                setTriageData({
                    weight: triData.weight_kg?.toString() || '',
                    height: triData.height_cm?.toString() || '',
                    temp: triData.temperature?.toString() || '',
                    sys: triData.systolic_pressure?.toString() || '',
                    dia: triData.diastolic_pressure?.toString() || '',
                    heart: triData.heart_rate?.toString() || '',
                    oxy: triData.oxygen_saturation?.toString() || '',
                    notes: triData.notes || ''
                });
            } else {
                setTriageId(null);
                setTriageData({ weight: '', height: '', temp: '', sys: '', dia: '', heart: '', oxy: '', notes: '' });
            }
        } else {
            setTriageId(null);
            setTriageData({ weight: '', height: '', temp: '', sys: '', dia: '', heart: '', oxy: '', notes: '' });
        }
    };

    // --- ACCIONES DE GUARDADO ---
    const saveTriage = async () => {
        if (!activeCaseId) {
            Alert.alert("Error", "El paciente no tiene un caso clínico activo.");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                case_id: activeCaseId,
                weight_kg: parseFloat(triageData.weight) || 0,
                height_cm: parseFloat(triageData.height) || 0,
                temperature: parseFloat(triageData.temp) || 0,
                systolic_pressure: parseInt(triageData.sys) || 0,
                diastolic_pressure: parseInt(triageData.dia) || 0,
                heart_rate: parseInt(triageData.heart) || 0,
                oxygen_saturation: parseInt(triageData.oxy) || 0,
                notes: triageData.notes,
                priority: 2 // Media por defecto
            };

            let error;
            if (triageId) {
                // Update
                const { error: err } = await supabase
                    .from('triage_records')
                    .update(payload)
                    .eq('id', triageId);
                error = err;
            } else {
                // Insert
                const { error: err } = await supabase
                    .from('triage_records')
                    .insert(payload);
                error = err;
            }

            if (error) throw error;
            Alert.alert("Éxito", triageId ? "Triaje actualizado." : "Triaje guardado.");
            setView('home');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudo guardar el triaje.");
        } finally {
            setSaving(false);
        }
    };

    const saveHistory = async () => {
        if (!selectedPatient) return;
        setSaving(true);
        try {
            // Upsert (Insertar o Actualizar)
            const { error } = await supabase.from('medical_histories').upsert({
                patient_id: selectedPatient.id,
                blood_type: historyData.blood_type,
                allergies: historyData.allergies.split(',').map(s => s.trim()),
                chronic_conditions: historyData.chronic.split(',').map(s => s.trim())
            }, { onConflict: 'patient_id' });

            if (error) throw error;
            Alert.alert("Éxito", "Historial actualizado.");
            setHistoryData({ blood_type: '', allergies: '', chronic: '' });
            setView('home');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudo guardar el historial.");
        } finally {
            setSaving(false);
        }
    };

    // --- RENDERS ---
    const renderHome = () => (
        <View style={{ padding: 20 }}>
            <Text style={styles.sectionTitle}>Seleccionar Paciente</Text>

            {selectedPatient ? (
                <View style={styles.selectedCard}>
                    <View>
                        <Text style={styles.selectedName}>{selectedPatient.first_name} {selectedPatient.last_name}</Text>
                        <Text style={styles.selectedInfo}>DNI: {selectedPatient.dni}</Text>
                        <Text style={[styles.caseStatus, { color: activeCaseId ? '#16a34a' : '#ef4444' }]}>
                            {activeCaseId ? 'Caso Activo: #' + activeCaseId.slice(0, 8) : 'Sin Caso Activo'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                        <Text style={styles.changeLink}>Cambiar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <View style={styles.searchBox}>
                        <Search size={20} color="#94a3b8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por nombre o DNI..."
                            value={patientSearch}
                            onChangeText={searchPatients}
                        />
                    </View>
                    {loadingSearch && <ActivityIndicator style={{ marginTop: 10 }} />}
                    {patients.map(p => (
                        <TouchableOpacity key={p.id} style={styles.resultItem} onPress={() => selectPatient(p)}>
                            <User size={20} color="#64748b" />
                            <Text style={styles.resultText}>{p.first_name} {p.last_name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {selectedPatient && (
                <View style={styles.menuGrid}>
                    <TouchableOpacity
                        style={[styles.menuCard, !activeCaseId && styles.disabledCard]}
                        onPress={() => activeCaseId ? setView('triage') : Alert.alert("Aviso", "Se requiere un caso activo para triaje.")}
                    >
                        <View style={[styles.iconBg, { backgroundColor: '#dbeafe' }]}>
                            <Activity size={32} color="#2563eb" />
                        </View>
                        <Text style={styles.menuTitle}>Registrar Triaje</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuCard} onPress={() => setView('history')}>
                        <View style={[styles.iconBg, { backgroundColor: '#f3e8ff' }]}>
                            <ClipboardList size={32} color="#9333ea" />
                        </View>
                        <Text style={styles.menuTitle}>Antecedentes</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderTriage = () => (
        <ScrollView style={{ padding: 20 }}>
            <Text style={styles.pageTitle}>Registro de Triaje</Text>
            <Text style={styles.subtitle}>Paciente: {selectedPatient?.first_name} {selectedPatient?.last_name}</Text>

            <View style={styles.formRow}>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Peso (kg)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={triageData.weight} onChangeText={t => setTriageData({ ...triageData, weight: t })} />
                </View>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Talla (cm)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={triageData.height} onChangeText={t => setTriageData({ ...triageData, height: t })} />
                </View>
            </View>

            <View style={styles.formRow}>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Temp (°C)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={triageData.temp} onChangeText={t => setTriageData({ ...triageData, temp: t })} />
                </View>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Sat. O2 (%)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={triageData.oxy} onChangeText={t => setTriageData({ ...triageData, oxy: t })} />
                </View>
            </View>

            <Text style={styles.label}>Presión Arterial (Sys/Dia)</Text>
            <View style={styles.formRow}>
                <TextInput style={[styles.input, styles.halfInput]} placeholder="120" keyboardType="numeric" value={triageData.sys} onChangeText={t => setTriageData({ ...triageData, sys: t })} />
                <TextInput style={[styles.input, styles.halfInput]} placeholder="80" keyboardType="numeric" value={triageData.dia} onChangeText={t => setTriageData({ ...triageData, dia: t })} />
            </View>

            <Text style={styles.label}>Frecuencia Cardíaca (lpm)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={triageData.heart} onChangeText={t => setTriageData({ ...triageData, heart: t })} />

            <Text style={styles.label}>Notas de Observación</Text>
            <TextInput style={[styles.input, { height: 80 }]} multiline value={triageData.notes} onChangeText={t => setTriageData({ ...triageData, notes: t })} />

            <View style={styles.actions}>
                <TouchableOpacity onPress={() => setView('home')} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={saveTriage} style={styles.saveBtn}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar Triaje</Text>}
                </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );

    const renderHistory = () => (
        <ScrollView style={{ padding: 20 }}>
            <Text style={styles.pageTitle}>Antecedentes Médicos</Text>
            <Text style={styles.subtitle}>Paciente: {selectedPatient?.first_name} {selectedPatient?.last_name}</Text>

            <Text style={styles.label}>Grupo Sanguíneo</Text>
            <TextInput style={styles.input} placeholder="Ej: O+" value={historyData.blood_type} onChangeText={t => setHistoryData({ ...historyData, blood_type: t })} />

            <Text style={styles.label}>Alergias (separar por comas)</Text>
            <TextInput style={styles.input} placeholder="Ej: Penicilina, Polvo" value={historyData.allergies} onChangeText={t => setHistoryData({ ...historyData, allergies: t })} />

            <Text style={styles.label}>Condiciones Crónicas</Text>
            <TextInput style={styles.input} placeholder="Ej: Diabetes, Hipertensión" value={historyData.chronic} onChangeText={t => setHistoryData({ ...historyData, chronic: t })} />

            <View style={styles.actions}>
                <TouchableOpacity onPress={() => setView('home')} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={saveHistory} style={styles.saveBtn}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar Historial</Text>}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Panel de Enfermería</Text>
                    <Text style={styles.headerSubtitle}>{profile.first_name} {profile.last_name}</Text>
                </View>
                <TouchableOpacity onPress={signOut}><LogOut color="#ef4444" /></TouchableOpacity>
            </View>

            {view === 'home' && renderHome()}
            {view === 'triage' && renderTriage()}
            {view === 'history' && renderHistory()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    headerSubtitle: { color: '#64748b' },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12 },
    searchInput: { flex: 1, padding: 12, fontSize: 16 },
    resultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9', gap: 10 },
    resultText: { fontSize: 16, color: '#334155' },

    selectedCard: { padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectedName: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' },
    selectedInfo: { color: '#64748b' },
    caseStatus: { fontWeight: 'bold', marginTop: 4, fontSize: 12 },
    changeLink: { color: '#2563eb', fontWeight: 'bold' },

    menuGrid: { flexDirection: 'row', gap: 16, marginTop: 24 },
    menuCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    disabledCard: { opacity: 0.5, backgroundColor: '#f1f5f9' },
    iconBg: { padding: 16, borderRadius: 50, marginBottom: 12 },
    menuTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },

    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16 },
    formRow: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },

    actions: { flexDirection: 'row', gap: 12, marginTop: 32 },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8 },
    cancelText: { color: '#64748b', fontWeight: 'bold' },
    saveBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 8 },
    saveText: { color: '#fff', fontWeight: 'bold' }
});
