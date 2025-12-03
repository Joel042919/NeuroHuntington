import { supabase } from '@/config/supabase';
import { GeneralConsultation, LabResult, MedicalHistory, NeurologyAssessment, PatientProfile, TriageRecord } from '@/types/medical';
import {
    Activity,
    Brain,
    ChevronDown, ChevronUp,
    FileText,
    FlaskConical,
    Phone,
    Save,
    Sparkles,
    X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// --- SUB-COMPONENTES UI ---

// 1. Acordeón Reutilizable
const Accordion = ({ title, icon: Icon, isOpen, onToggle, children, color = "#2563eb" }: any) => (
    <View style={styles.accordionContainer}>
        <TouchableOpacity onPress={onToggle} style={[styles.accordionHeader, { borderLeftColor: color }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon size={20} color={color} />
                <Text style={styles.accordionTitle}>{title}</Text>
            </View>
            {isOpen ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
        </TouchableOpacity>
        {isOpen && <View style={styles.accordionContent}>{children}</View>}
    </View>
);

// 2. Renderizador de Tablas JSON (Lab Results)
const JsonResultsTable = ({ data }: { data: Record<string, any> }) => {
    if (!data) return <Text style={{ fontSize: 12, color: '#999' }}>Sin datos detallados.</Text>;

    return (
        <View style={styles.table}>
            {Object.entries(data).map(([key, value], index) => (
                <View key={key} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                    <Text style={styles.tableKey}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={styles.tableValue}>{String(value)}</Text>
                </View>
            ))}
        </View>
    );
};

// --- COMPONENTE PRINCIPAL ---

export default function ClinicalCaseDetail({ caseId, patientId, onClose }: any) {
    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState<PatientProfile | null>(null);
    const [history, setHistory] = useState<MedicalHistory | null>(null);
    const [triage, setTriage] = useState<TriageRecord | null>(null);
    const [labResults, setLabResults] = useState<LabResult[]>([]);

    // Estado de Formularios
    const [anamnesis, setAnamnesis] = useState<GeneralConsultation>({ id: '', current_illness: '', family_history: '' });
    const [neuroAssessment, setNeuroAssessment] = useState<NeurologyAssessment>({
        has_chorea: false,
        uhdrs_motor_score: '',
        mmse_score: '',
        clinical_notes: '',
        diagnosis: ''
    });

    // Estado de UI
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        'history': false, 'triage': false, 'anamnesis': false, 'labs': true, 'neuro': true
    });

    // Estado de IA
    const [aiThinking, setAiThinking] = useState(false);
    const [aiOptions, setAiOptions] = useState<{ gpt: string, copilot: string } | null>(null);

    // Cargar datos
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                // 1. Perfil del Paciente
                const patientPromise = supabase.from('profiles').select('*').eq('id', patientId).single();

                // 2. Historial Médico
                const historyPromise = supabase.from('medical_histories').select('*').eq('patient_id', patientId).single();

                // 3. Triaje (Asociado al caso)
                const triagePromise = supabase.from('triage_records').select('*').eq('case_id', caseId).order('created_at', { ascending: false }).limit(1).single();

                // 4. Anamnesis (General Consultation asociada al caso)
                const anamnesisPromise = supabase.from('general_consultations').select('*').eq('case_id', caseId).single();

                // 5. Resultados de Laboratorio
                const labsPromise = supabase.from('lab_results').select('*').eq('case_id', caseId);

                // 6. Evaluación Neurológica
                const neuroPromise = supabase.from('neurology_assessments').select('*').eq('case_id', caseId).single();

                const [patientRes, historyRes, triageRes, anamnesisRes, labsRes, neuroRes] = await Promise.all([
                    patientPromise, historyPromise, triagePromise, anamnesisPromise, labsPromise, neuroPromise
                ]);

                if (patientRes.data) setPatient(patientRes.data);
                if (historyRes.data) setHistory(historyRes.data);
                if (triageRes.data) setTriage(triageRes.data);
                if (anamnesisRes.data) setAnamnesis(anamnesisRes.data);
                if (labsRes.data) setLabResults(labsRes.data);
                if (neuroRes.data) setNeuroAssessment(neuroRes.data);

            } catch (error) {
                console.error("Error loading clinical case data:", error);
                Alert.alert("Error", "No se pudieron cargar todos los datos del caso.");
            } finally {
                setLoading(false);
            }
        };

        if (caseId && patientId) {
            loadData();
        }
    }, [caseId, patientId]);

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Guardar Anamnesis
    const saveAnamnesis = async () => {
        try {
            const { error } = await supabase
                .from('general_consultations')
                .upsert({
                    id: anamnesis.id || undefined, // Si tiene ID actualiza, si no crea (aunque debería existir por lógica de negocio, o crearse al inicio)
                    case_id: caseId,
                    // doctor_id: deberíamos obtenerlo del contexto, pero por ahora asumimos que ya existe o se maneja en backend
                    current_illness: anamnesis.current_illness,
                    family_history: anamnesis.family_history
                });

            if (error) throw error;
            Alert.alert("Éxito", "Anamnesis guardada correctamente.");
        } catch (error) {
            console.error("Error saving anamnesis:", error);
            Alert.alert("Error", "No se pudo guardar la anamnesis.");
        }
    };

    // Guardar Evaluación Neurológica
    const saveNeuroAssessment = async () => {
        try {
            // Necesitamos el doctor_id, idealmente vendría de props o context, 
            // pero para este ejemplo asumiremos que el registro ya existe o se hace update.
            // Si es insert, necesitaríamos el doctor_id.

            const payload: any = {
                case_id: caseId,
                has_chorea: neuroAssessment.has_chorea,
                uhdrs_motor_score: neuroAssessment.uhdrs_motor_score,
                mmse_score: neuroAssessment.mmse_score,
                clinical_notes: neuroAssessment.clinical_notes,
                diagnosis: neuroAssessment.diagnosis
            };

            if (neuroAssessment.id) {
                payload.id = neuroAssessment.id;
            }

            // Nota: Para un insert real necesitaríamos 'doctor_id'. 
            // Aquí asumimos que actualizamos uno existente o que la RLS/Trigger lo maneja (o fallará si es nuevo sin doctor_id).
            // Para simplificar, asumimos update de uno existente creado al iniciar el caso.

            const { error } = await supabase
                .from('neurology_assessments')
                .upsert(payload);

            if (error) throw error;
            Alert.alert("Éxito", "Evaluación guardada correctamente.");
        } catch (error) {
            console.error("Error saving neuro assessment:", error);
            Alert.alert("Error", "No se pudo guardar la evaluación.");
        }
    };

    // Lógica de IA (Simulada por ahora, preparada para integración real)
    const consultAI = () => {
        setAiThinking(true);
        setAiOptions(null);

        // Aquí iría la llamada real a tu API de IA pasando:
        // - labResults
        // - neuroAssessment (scores)
        // - anamnesis

        setTimeout(() => {
            setAiOptions({
                gpt: `Basado en los resultados genéticos (si los hubiera) y el puntaje UHDRS de ${neuroAssessment.uhdrs_motor_score || 'N/A'}, el paciente podría presentar signos compatibles con Enfermedad de Huntington. Se sugiere correlacionar con antecedentes familiares.`,
                copilot: `Evaluación clínica sugiere compromiso motor. Si el test genético confirma repeticiones CAG elevadas, el diagnóstico es consistente. Recomiendo seguimiento psiquiátrico.`
            });
            setAiThinking(false);
        }, 2500);
    };

    const selectAiOption = (text: string) => {
        setNeuroAssessment(prev => ({ ...prev, diagnosis: text }));
        setAiOptions(null); // Limpiar opciones tras seleccionar
        Alert.alert("Diagnóstico Importado", "Puedes editar el texto antes de guardar.");
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            {/* Header Fijo */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={24} color="#fff" /></TouchableOpacity>
                <View style={styles.patientHeader}>
                    <Image source={{ uri: patient?.avatar_url || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                    <View>
                        <Text style={styles.patientName}>{patient?.first_name} {patient?.last_name}</Text>
                        <View style={styles.phoneRow}>
                            <Phone size={14} color="#cbd5e1" />
                            <Text style={styles.patientPhone}>{patient?.phone || 'Sin teléfono'}</Text>
                        </View>
                        <Text style={styles.patientDni}>DNI: {patient?.dni || '---'}</Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* 1. Historial Médico (Read Only) */}
                <Accordion title="Historial Médico General" icon={FileText} isOpen={openSections['history']} onToggle={() => toggleSection('history')} color="#64748b">
                    <Text style={styles.readOnlyText}>• Alergias: {history?.allergies?.join(', ') || 'Ninguna'}</Text>
                    <Text style={styles.readOnlyText}>• Tipo de Sangre: {history?.blood_type || 'Desconocido'}</Text>
                    <Text style={styles.readOnlyText}>• Condiciones: {history?.chronic_conditions?.join(', ') || 'Ninguna'}</Text>
                </Accordion>

                {/* 2. Triaje (Read Only) */}
                <Accordion title="Datos de Triaje" icon={Activity} isOpen={openSections['triage']} onToggle={() => toggleSection('triage')} color="#ea580c">
                    {triage ? (
                        <View style={styles.grid}>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Presión</Text><Text style={styles.statValue}>{triage.systolic_pressure}/{triage.diastolic_pressure}</Text></View>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Peso</Text><Text style={styles.statValue}>{triage.weight_kg}kg</Text></View>
                            <View style={styles.statBox}><Text style={styles.statLabel}>Temp</Text><Text style={styles.statValue}>{triage.temperature}°</Text></View>
                        </View>
                    ) : (
                        <Text style={{ color: '#94a3b8' }}>No hay datos de triaje recientes.</Text>
                    )}
                </Accordion>

                {/* 3. Anamnesis (Editable) */}
                <Accordion title="Anamnesis" icon={FileText} isOpen={openSections['anamnesis']} onToggle={() => toggleSection('anamnesis')} color="#2563eb">
                    <Text style={styles.label}>Enfermedad Actual</Text>
                    <TextInput
                        style={styles.textArea} multiline
                        value={anamnesis.current_illness || ''}
                        onChangeText={t => setAnamnesis({ ...anamnesis, current_illness: t })}
                        placeholder="Describa la enfermedad actual..."
                    />
                    <Text style={styles.label}>Antecedentes Familiares</Text>
                    <TextInput
                        style={styles.textArea} multiline
                        value={anamnesis.family_history || ''}
                        onChangeText={t => setAnamnesis({ ...anamnesis, family_history: t })}
                        placeholder="Describa antecedentes familiares..."
                    />
                    <TouchableOpacity style={styles.saveMiniBtn} onPress={saveAnamnesis}>
                        <Text style={styles.saveMiniText}>Guardar Anamnesis</Text>
                    </TouchableOpacity>
                </Accordion>

                {/* 4. Resultados de Laboratorio (Con Tabla JSON) */}
                <Accordion title="Resultados de Laboratorio" icon={FlaskConical} isOpen={openSections['labs']} onToggle={() => toggleSection('labs')} color="#7c3aed">
                    {labResults.length > 0 ? labResults.map((lab) => (
                        <View key={lab.id} style={styles.labCard}>
                            <View style={styles.labHeader}>
                                <Text style={styles.labType}>{lab.type}</Text>
                                <Text style={styles.labDate}>{new Date(lab.analyzed_at).toLocaleDateString()}</Text>
                            </View>
                            <Text style={styles.labDesc}>{lab.description}</Text>

                            {/* Tabla Dinámica JSON */}
                            <JsonResultsTable data={lab.results_json} />

                            <View style={styles.labResultBox}>
                                <Text style={styles.labResultTitle}>CONCLUSIÓN:</Text>
                                <Text style={styles.labResultText}>{lab.result_text}</Text>
                            </View>
                        </View>
                    )) : (
                        <Text style={{ color: '#94a3b8' }}>No hay resultados de laboratorio.</Text>
                    )}
                </Accordion>

                {/* 5. Evaluación Neurológica (Assessment + AI) */}
                <Accordion title="Evaluación Neurológica" icon={Brain} isOpen={openSections['neuro']} onToggle={() => toggleSection('neuro')} color="#0d9488">

                    <View style={styles.formRow}>
                        <Text style={styles.label}>Presencia de Corea</Text>
                        <Switch
                            value={neuroAssessment.has_chorea}
                            onValueChange={v => setNeuroAssessment({ ...neuroAssessment, has_chorea: v })}
                        />
                    </View>

                    <View style={styles.grid}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>UHDRS Motor (0-124)</Text>
                            <TextInput
                                style={styles.input} keyboardType="numeric" placeholder="Ej: 35"
                                value={String(neuroAssessment.uhdrs_motor_score || '')}
                                onChangeText={t => setNeuroAssessment({ ...neuroAssessment, uhdrs_motor_score: t })}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>MMSE Cognitivo (0-30)</Text>
                            <TextInput
                                style={styles.input} keyboardType="numeric" placeholder="Ej: 28"
                                value={String(neuroAssessment.mmse_score || '')}
                                onChangeText={t => setNeuroAssessment({ ...neuroAssessment, mmse_score: t })}
                            />
                        </View>
                    </View>

                    {/* SECCIÓN IA */}
                    <View style={styles.aiSection}>
                        <View style={styles.aiHeader}>
                            <Sparkles size={20} color="#fbbf24" />
                            <Text style={styles.aiTitle}>Consultar Inteligencia Artificial</Text>
                        </View>
                        <Text style={styles.aiDesc}>Enviar datos (Lab + Motor + Cognitivo) a analizar.</Text>

                        {!aiThinking && !aiOptions && (
                            <TouchableOpacity style={styles.aiButton} onPress={consultAI}>
                                <Text style={styles.aiButtonText}>Consultar a GPT-4 & Copilot</Text>
                            </TouchableOpacity>
                        )}

                        {aiThinking && (
                            <View style={{ padding: 20 }}>
                                <ActivityIndicator color="#fbbf24" />
                                <Text style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginTop: 10 }}>Analizando patrones clínicos...</Text>
                            </View>
                        )}

                        {aiOptions && (
                            <View style={styles.aiComparison}>
                                <Text style={styles.aiSubTitle}>Comparativa de Modelos:</Text>

                                <TouchableOpacity style={styles.aiOptionCard} onPress={() => selectAiOption(aiOptions.gpt)}>
                                    <Text style={styles.modelName}>Opción A (GPT-4o)</Text>
                                    <Text style={styles.modelText}>{aiOptions.gpt}</Text>
                                    <Text style={styles.selectText}>Click para usar este diagnóstico</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.aiOptionCard} onPress={() => selectAiOption(aiOptions.copilot)}>
                                    <Text style={styles.modelName}>Opción B (Copilot Medical)</Text>
                                    <Text style={styles.modelText}>{aiOptions.copilot}</Text>
                                    <Text style={styles.selectText}>Click para usar este diagnóstico</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <Text style={styles.label}>Diagnóstico Final (Editable)</Text>
                    <TextInput
                        style={[styles.textArea, { height: 100, borderColor: '#0d9488' }]} multiline
                        value={neuroAssessment.diagnosis || ''}
                        onChangeText={t => setNeuroAssessment({ ...neuroAssessment, diagnosis: t })}
                        placeholder="Escriba o seleccione una sugerencia de la IA..."
                    />

                    <TouchableOpacity style={styles.saveBigBtn} onPress={saveNeuroAssessment}>
                        <Save size={24} color="#fff" />
                        <Text style={styles.saveBigText}>Guardar Evaluación Completa</Text>
                    </TouchableOpacity>

                </Accordion>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#1e293b', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    closeBtn: { alignSelf: 'flex-end', padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    patientHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15, borderWidth: 2, borderColor: '#fff' },
    patientName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    patientPhone: { color: '#cbd5e1', fontSize: 14 },
    patientDni: { color: '#94a3b8', fontSize: 12, marginTop: 2 },

    content: { padding: 16 },

    // Accordion
    accordionContainer: { marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
    accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderLeftWidth: 4, backgroundColor: '#fff' },
    accordionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
    accordionContent: { padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },

    // Text Styles
    readOnlyText: { color: '#64748b', marginBottom: 6 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginTop: 12, marginBottom: 4, textTransform: 'uppercase' },

    // Inputs
    textArea: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, height: 80, textAlignVertical: 'top' },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12 },
    formRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

    // Grids
    grid: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, alignItems: 'center', backgroundColor: '#fff7ed', padding: 10, borderRadius: 8 },
    statLabel: { fontSize: 10, color: '#ea580c', fontWeight: 'bold' },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#c2410c' },

    // Tables
    table: { marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 },
    tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    tableRowAlt: { backgroundColor: '#f8fafc' },
    tableKey: { flex: 1, fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    tableValue: { flex: 2, fontSize: 12, color: '#334155' },

    // Labs
    labCard: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    labHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    labType: { fontWeight: 'bold', color: '#7c3aed' },
    labDate: { fontSize: 12, color: '#94a3b8' },
    labDesc: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 8 },
    labResultBox: { backgroundColor: '#f5f3ff', padding: 10, borderRadius: 8, marginTop: 4 },
    labResultTitle: { fontSize: 10, color: '#7c3aed', fontWeight: 'bold' },
    labResultText: { color: '#5b21b6', fontSize: 13, fontWeight: '600' },

    // AI Section
    aiSection: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginTop: 20, marginBottom: 20 },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    aiTitle: { color: '#fbbf24', fontWeight: 'bold', fontSize: 14 },
    aiDesc: { color: '#94a3b8', fontSize: 12, marginBottom: 12 },
    aiButton: { backgroundColor: '#fbbf24', padding: 12, borderRadius: 8, alignItems: 'center' },
    aiButtonText: { color: '#451a03', fontWeight: 'bold' },

    aiComparison: { marginTop: 16, gap: 10 },
    aiSubTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 4 },
    aiOptionCard: { backgroundColor: '#334155', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#475569' },
    modelName: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    modelText: { color: '#e2e8f0', marginVertical: 6, fontSize: 13, lineHeight: 18 },
    selectText: { color: '#fbbf24', fontSize: 10, textAlign: 'right', fontWeight: 'bold' },

    // Buttons
    saveMiniBtn: { marginTop: 8, alignSelf: 'flex-end' },
    saveMiniText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold' },
    saveBigBtn: { backgroundColor: '#0f766e', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8, marginTop: 20 },
    saveBigText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});