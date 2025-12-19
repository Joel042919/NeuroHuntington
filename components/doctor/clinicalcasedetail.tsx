import { supabase } from '@/config/supabase';
import { GeneralConsultation, LabResult, MedicalHistory, NeurologyAssessment, PatientProfile, TriageRecord } from '@/types/medical';
import {
    Activity,
    Brain,
    ChevronDown, ChevronUp,
    FileText,
    FlaskConical,
    Phone,
    Plus,
    Save,
    Sparkles,
    X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Image,
    Modal,
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

// 2. Renderizador de Tablas JSON Recursivo (Lab Results)
const JsonResultsTable = ({ data, level = 0 }: { data: any, level?: number }) => {
    if (!data) return <Text style={{ fontSize: 12, color: '#999' }}>Sin datos.</Text>;
    if (typeof data !== 'object') return <Text style={styles.jsonValue}>{String(data)}</Text>;

    // Manejo de Arrays
    if (Array.isArray(data)) {
        if (data.length === 0) return <Text style={{ fontSize: 12, color: '#999' }}>[ Vacío ]</Text>;
        return (
            <View style={{ gap: 4 }}>
                {data.map((item, idx) => (
                    <View key={idx} style={{ marginLeft: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#cbd5e1' }}>
                        <JsonResultsTable data={item} level={level + 1} />
                    </View>
                ))}
            </View>
        );
    }

    // Manejo de Objetos
    return (
        <View style={styles.jsonTable}>
            {Object.entries(data).map(([key, value], index) => (
                <View key={key} style={[styles.jsonRow, index % 2 === 0 && styles.jsonRowAlt]}>
                    <Text style={[styles.jsonKey, { marginLeft: level * 4 }]}>{key.replace(/_/g, ' ').toUpperCase()}:</Text>
                    <View style={{ flex: 1 }}>
                        <JsonResultsTable data={value} level={level + 1} />
                    </View>
                </View>
            ))}
        </View>
    );
};

// 3. Item de Resultado de Laboratorio Colapsable
const LabResultItem = ({ lab }: { lab: LabResult }) => {
    const [expanded, setExpanded] = useState(false);

    // Formatear Fecha
    const formattedDate = new Date(lab.analyzed_at || new Date()).toLocaleDateString();

    return (
        <View style={styles.labCard}>
            <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.labHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.labType} numberOfLines={1}>{lab.type}</Text>
                    <Text style={styles.labDate}>{formattedDate}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {lab.status ? (
                        <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.statusText, { color: '#166534' }]}>COMPLETADO</Text>
                        </View>
                    ) : (
                        <View style={[styles.statusBadge, { backgroundColor: '#fef9c3' }]}>
                            <Text style={[styles.statusText, { color: '#854d0e' }]}>PENDIENTE</Text>
                        </View>
                    )}
                    {expanded ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <Text style={styles.labDescLabel}>Descripción:</Text>
                    <Text style={styles.labDesc}>"{lab.description}"</Text>

                    {lab.status ? (
                        <>
                            {/* Tabla Dinámica JSON Recursiva */}
                            <View style={styles.tableContainer}>
                                <JsonResultsTable data={lab.results_json} />
                            </View>

                            {lab.result_text && (
                                <View style={styles.labResultBox}>
                                    <Text style={styles.labResultTitle}>CONCLUSIÓN MÉDICA:</Text>
                                    <Text style={styles.labResultText}>{lab.result_text}</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={{ marginTop: 8, padding: 8, backgroundColor: '#fffbeb', borderRadius: 8 }}>
                            <Text style={styles.pendingText}>Esperando resultados del laboratorio...</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};


// --- TIPOS DE EXAMENES ---
const LAB_TYPES = [
    "Bioquímica y Hematología",
    "Inmunología y Serología",
    "Microbiología y Parasitología",
    "Genética y Biología Molecular",
    "Urianálisis y Líquidos Corporales",
    "Endocrinología (Hormonas)"
];

// --- COMPONENTE PRINCIPAL ---

export default function ClinicalCaseDetail({ caseId, patientId, onClose }: any) {
    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState<PatientProfile | null>(null);
    const [history, setHistory] = useState<MedicalHistory | null>(null);
    const [triage, setTriage] = useState<TriageRecord | null>(null);
    const [labResults, setLabResults] = useState<LabResult[]>([]);

    // Estado de Solicitud de Lab
    const [showLabOrder, setShowLabOrder] = useState(false);
    const [newLabType, setNewLabType] = useState(LAB_TYPES[0]);
    const [newLabDesc, setNewLabDesc] = useState('');
    const [orderingLab, setOrderingLab] = useState(false);

    // Estado de Formularios
    const [anamnesis, setAnamnesis] = useState<GeneralConsultation>({
        id: '',
        reason_consultation: '',
        current_illness: '',
        family_history: '',
        pathological_history: '',
        physical_exam_notes: ''
    });
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
            const labsPromise = supabase.from('lab_results').select('*').eq('case_id', caseId).order('created_at', { ascending: false });

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

    useEffect(() => {
        if (caseId && patientId) {
            loadData();
        }
    }, [caseId, patientId]);

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // --- ACCIONES DE GUARDADO ---

    const saveAnamnesis = async () => {
        try {
            const { error } = await supabase
                .from('general_consultations')
                .upsert({
                    id: anamnesis.id || undefined,
                    case_id: caseId,
                    reason_consultation: anamnesis.reason_consultation,
                    current_illness: anamnesis.current_illness,
                    family_history: anamnesis.family_history,
                    pathological_history: anamnesis.pathological_history,
                    physical_exam_notes: anamnesis.physical_exam_notes
                });

            if (error) throw error;
            Alert.alert("Éxito", "Anamnesis guardada correctamente.");
        } catch (error) {
            console.error("Error saving anamnesis:", error);
            Alert.alert("Error", "No se pudo guardar la anamnesis.");
        }
    };

    const saveNeuroAssessment = async () => {
        try {
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

            const { error } = await supabase.from('neurology_assessments').upsert(payload);

            if (error) throw error;
            Alert.alert("Éxito", "Evaluación guardada correctamente.");
        } catch (error) {
            console.error("Error saving neuro assessment:", error);
            Alert.alert("Error", "No se pudo guardar la evaluación.");
        }
    };

    const requestLabTest = async () => {
        if (!newLabDesc) {
            Alert.alert("Error", "Ingrese una descripción para el examen.");
            return;
        }
        setOrderingLab(true);
        try {
            const { error } = await supabase.from('lab_results').insert({
                case_id: caseId,
                type: newLabType,
                description: newLabDesc,
                status: false, // Pendiente
            });

            if (error) throw error;
            Alert.alert("Solicitud Enviada", "El examen ha sido solicitado al laboratorio.");
            setShowLabOrder(false);
            setNewLabDesc('');
            // Recargar labs
            const { data } = await supabase.from('lab_results').select('*').eq('case_id', caseId).order('created_at', { ascending: false });
            if (data) setLabResults(data);

        } catch (error) {
            console.error("Error requesting lab:", error);
            Alert.alert("Error", "No se pudo solicitar el examen.");
        } finally {
            setOrderingLab(false);
        }
    };

    // --- LÓGICA DE IA ---
    const consultAI = () => {
        setAiThinking(true);
        setAiOptions(null);
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
        setAiOptions(null);
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

                {/* 1. Historial Médico */}
                <Accordion title="Historial Médico General" icon={FileText} isOpen={openSections['history']} onToggle={() => toggleSection('history')} color="#64748b">
                    <Text style={styles.readOnlyText}>• Alergias: {history?.allergies?.join(', ') || 'Ninguna'}</Text>
                    <Text style={styles.readOnlyText}>• Tipo de Sangre: {history?.blood_type || 'Desconocido'}</Text>
                    <Text style={styles.readOnlyText}>• Condiciones: {history?.chronic_conditions?.join(', ') || 'Ninguna'}</Text>
                </Accordion>

                {/* 2. Triaje */}
                <Accordion title="Datos de Triaje" icon={Activity} isOpen={openSections['triage']} onToggle={() => toggleSection('triage')} color="#ea580c">
                    {triage ? (
                        <View>
                            <View style={styles.grid}>
                                <View style={styles.statBox}><Text style={styles.statLabel}>Presión</Text><Text style={styles.statValue}>{triage.systolic_pressure}/{triage.diastolic_pressure}</Text></View>
                                <View style={styles.statBox}><Text style={styles.statLabel}>Peso</Text><Text style={styles.statValue}>{triage.weight_kg} kg</Text></View>
                                <View style={styles.statBox}><Text style={styles.statLabel}>Temp</Text><Text style={styles.statValue}>{triage.temperature}°C</Text></View>
                            </View>
                            <View style={[styles.grid, { marginTop: 10 }]}>
                                <View style={styles.statBox}><Text style={styles.statLabel}>Ritmo Card.</Text><Text style={styles.statValue}>{triage.heart_rate} bpm</Text></View>
                                <View style={styles.statBox}><Text style={styles.statLabel}>Sat. O2</Text><Text style={styles.statValue}>{triage.oxygen_saturation}%</Text></View>
                                <View style={styles.statBox}><Text style={styles.statLabel}>Talla</Text><Text style={styles.statValue}>-</Text></View>
                            </View>
                            {triage.notes && (
                                <View style={{ marginTop: 10, padding: 10, backgroundColor: '#fff7ed', borderRadius: 8 }}>
                                    <Text style={styles.statLabel}>NOTAS DE TRIAJE:</Text>
                                    <Text style={{ fontSize: 13, color: '#c2410c', marginTop: 4 }}>{triage.notes}</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <Text style={{ color: '#94a3b8' }}>No hay datos de triaje recientes.</Text>
                    )}
                </Accordion>

                {/* 3. Anamnesis */}
                <Accordion title="Anamnesis" icon={FileText} isOpen={openSections['anamnesis']} onToggle={() => toggleSection('anamnesis')} color="#2563eb">
                    <Text style={styles.label}>Motivo de Consulta</Text>
                    <TextInput style={styles.textArea} multiline value={anamnesis.reason_consultation || ''} onChangeText={t => setAnamnesis({ ...anamnesis, reason_consultation: t })} placeholder="Motivo principal..." />

                    <Text style={styles.label}>Enfermedad Actual</Text>
                    <TextInput style={styles.textArea} multiline value={anamnesis.current_illness || ''} onChangeText={t => setAnamnesis({ ...anamnesis, current_illness: t })} placeholder="Describa la enfermedad actual..." />

                    <Text style={styles.label}>Antecedentes Familiares</Text>
                    <TextInput style={styles.textArea} multiline value={anamnesis.family_history || ''} onChangeText={t => setAnamnesis({ ...anamnesis, family_history: t })} placeholder="Describa antecedentes familiares..." />

                    <Text style={styles.label}>Antecedentes Patológicos</Text>
                    <TextInput style={styles.textArea} multiline value={anamnesis.pathological_history || ''} onChangeText={t => setAnamnesis({ ...anamnesis, pathological_history: t })} placeholder="Enfermedades previas, cirugías..." />

                    <Text style={styles.label}>Notas Examen Físico</Text>
                    <TextInput style={styles.textArea} multiline value={anamnesis.physical_exam_notes || ''} onChangeText={t => setAnamnesis({ ...anamnesis, physical_exam_notes: t })} placeholder="Hallazgos físicos relevantes..." />

                    <TouchableOpacity style={styles.saveMiniBtn} onPress={saveAnamnesis}>
                        <Text style={styles.saveMiniText}>Guardar Anamnesis</Text>
                    </TouchableOpacity>
                </Accordion>

                {/* 4. Resultados de Laboratorio */}
                <Accordion title="Resultados de Laboratorio" icon={FlaskConical} isOpen={openSections['labs']} onToggle={() => toggleSection('labs')} color="#7c3aed">

                    {/* Botón Solicitar Examen */}
                    <TouchableOpacity style={styles.addLabBtn} onPress={() => setShowLabOrder(true)}>
                        <Plus size={16} color="#fff" />
                        <Text style={styles.addLabBtnText}>Solicitar Nuevo Examen</Text>
                    </TouchableOpacity>

                    {/* LISTA DE RESULTADOS COLAPSABLES */}
                    {labResults.length > 0 ? (
                        <View style={{ gap: 10 }}>
                            {labResults.map((lab) => (
                                <LabResultItem key={lab.id} lab={lab} />
                            ))}
                        </View>
                    ) : (
                        <Text style={{ color: '#94a3b8', marginTop: 10 }}>No hay resultados de laboratorio.</Text>
                    )}
                </Accordion>

                {/* 5. Evaluación Neurológica */}
                <Accordion title="Evaluación Neurológica" icon={Brain} isOpen={openSections['neuro']} onToggle={() => toggleSection('neuro')} color="#0d9488">
                    {/* ... (Contenido Igual, simplificado para overview) ... */}
                    <View style={styles.formRow}>
                        <Text style={styles.label}>Presencia de Corea</Text>
                        <Switch value={neuroAssessment.has_chorea} onValueChange={v => setNeuroAssessment({ ...neuroAssessment, has_chorea: v })} />
                    </View>
                    <View style={styles.grid}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>UHDRS Motor (0-124)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={String(neuroAssessment.uhdrs_motor_score || '')} onChangeText={t => setNeuroAssessment({ ...neuroAssessment, uhdrs_motor_score: t })} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>MMSE Cognitivo (0-30)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={String(neuroAssessment.mmse_score || '')} onChangeText={t => setNeuroAssessment({ ...neuroAssessment, mmse_score: t })} />
                        </View>
                    </View>

                    {/* AI Section */}
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
                        {aiThinking && <ActivityIndicator color="#fbbf24" />}
                        {aiOptions && (
                            <View style={styles.aiComparison}>
                                <TouchableOpacity style={styles.aiOptionCard} onPress={() => selectAiOption(aiOptions.gpt)}>
                                    <Text style={styles.modelName}>GPT-4o</Text>
                                    <Text style={styles.modelText}>{aiOptions.gpt}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.aiOptionCard} onPress={() => selectAiOption(aiOptions.copilot)}>
                                    <Text style={styles.modelName}>Copilot</Text>
                                    <Text style={styles.modelText}>{aiOptions.copilot}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <Text style={styles.label}>Diagnóstico Final</Text>
                    <TextInput style={[styles.textArea, { height: 100, borderColor: '#0d9488' }]} multiline value={neuroAssessment.diagnosis || ''} onChangeText={t => setNeuroAssessment({ ...neuroAssessment, diagnosis: t })} />

                    <TouchableOpacity style={styles.saveBigBtn} onPress={saveNeuroAssessment}>
                        <Save size={24} color="#fff" />
                        <Text style={styles.saveBigText}>Guardar Evaluación</Text>
                    </TouchableOpacity>
                </Accordion>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* MODAL SOLICITUD LAB */}
            <Modal visible={showLabOrder} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Solicitar Examen de Laboratorio</Text>

                        <Text style={styles.label}>Tipo de Examen</Text>
                        <View style={styles.typeSelector}>
                            {LAB_TYPES.map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeChip, newLabType === type && styles.typeChipActive]}
                                    onPress={() => setNewLabType(type)}
                                >
                                    <Text style={[styles.typeChipText, newLabType === type && styles.typeChipTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Descripción / Indicaciones</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Ej: Hemograma completo, descartar anemia..."
                            value={newLabDesc}
                            onChangeText={setNewLabDesc}
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLabOrder(false)}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={requestLabTest} disabled={orderingLab}>
                                {orderingLab ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Confirmar Solicitud</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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

    // JSON Table Styles
    tableContainer: { marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
    jsonTable: { width: '100%' },
    jsonRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    jsonRowAlt: { backgroundColor: '#f8fafc' },
    jsonKey: { fontWeight: 'bold', color: '#475569', fontSize: 11, width: '40%', paddingRight: 8 },
    jsonValue: { color: '#334155', fontSize: 12, flexWrap: 'wrap' },

    // Labs Status and Item
    addLabBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed', padding: 10, borderRadius: 8, marginBottom: 16, gap: 5 },
    addLabBtnText: { color: '#fff', fontWeight: 'bold' },

    // Nueva clase para el Item Colapsable
    labCard: { marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
    labHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc' },
    labType: { fontWeight: 'bold', color: '#7c3aed', fontSize: 14, marginBottom: 2 },
    labDate: { fontSize: 12, color: '#94a3b8' },

    labDescLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold', marginTop: 4 },
    labDesc: { fontSize: 13, color: '#334155', fontStyle: 'italic', marginBottom: 8 },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    statusText: { fontSize: 10, fontWeight: 'bold' },

    labResultBox: { backgroundColor: '#f5f3ff', padding: 10, borderRadius: 8, marginTop: 10 },
    labResultTitle: { fontSize: 10, color: '#7c3aed', fontWeight: 'bold' },
    labResultText: { color: '#5b21b6', fontSize: 13, fontWeight: '600', marginTop: 2 },
    pendingText: { color: '#d97706', fontStyle: 'italic', fontSize: 12 },

    // AI
    aiSection: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginTop: 20, marginBottom: 20 },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    aiTitle: { color: '#fbbf24', fontWeight: 'bold', fontSize: 14 },
    aiDesc: { color: '#94a3b8', fontSize: 12, marginBottom: 12 },
    aiButton: { backgroundColor: '#fbbf24', padding: 12, borderRadius: 8, alignItems: 'center' },
    aiButtonText: { color: '#451a03', fontWeight: 'bold' },
    aiComparison: { marginTop: 16, gap: 10 },
    aiOptionCard: { backgroundColor: '#334155', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#475569' },
    modelName: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    modelText: { color: '#e2e8f0', marginVertical: 6, fontSize: 13 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 450 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
    typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    typeChipActive: { backgroundColor: '#ede9fe', borderColor: '#7c3aed' },
    typeChipText: { fontSize: 12, color: '#64748b' },
    typeChipTextActive: { color: '#7c3aed', fontWeight: 'bold' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 12, backgroundColor: '#f1f5f9' },
    confirmBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 12, backgroundColor: '#7c3aed' },
    cancelText: { color: '#64748b', fontWeight: 'bold' },
    confirmText: { color: '#fff', fontWeight: 'bold' },

    // Buttons
    saveMiniBtn: { marginTop: 8, alignSelf: 'flex-end' },
    saveMiniText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold' },
    saveBigBtn: { backgroundColor: '#0f766e', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8, marginTop: 20 },
    saveBigText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});