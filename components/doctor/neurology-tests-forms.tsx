import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- STYLES REUTILIZABLES ---
const sharedStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    closeBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 16, marginBottom: 8, backgroundColor: '#e2e8f0', padding: 8, borderRadius: 4 },
    itemContainer: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    itemLabel: { fontSize: 14, color: '#475569', fontWeight: '600', marginBottom: 6 },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    optionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    optionBtnSelected: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
    optionText: { fontSize: 12, color: '#64748b' },
    optionTextSelected: { color: '#2563eb', fontWeight: 'bold' },
    totalScore: { fontSize: 18, fontWeight: 'bold', color: '#2563eb', textAlign: 'center', marginVertical: 10 },
    saveBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    descText: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }
});

// --- COMPONENTES AUXILIARES ---
const ScoreOption = ({ value, label, current, onSelect }: any) => (
    <TouchableOpacity
        style={[sharedStyles.optionBtn, current === value && sharedStyles.optionBtnSelected]}
        onPress={() => onSelect(value)}
    >
        <Text style={[sharedStyles.optionText, current === value && sharedStyles.optionTextSelected]}>{value} - {label}</Text>
    </TouchableOpacity>
);

// --- 1. UHDRS MOTOR ASSESSMENT ---
// Items based on standard UHDRS to reach 124 points (31 items * 4)
// Mapped to User's Categories

export const MotorAssessmentForm = ({ visible, onClose, initialData, onSave }: any) => {
    const [scores, setScores] = useState<Record<string, number>>({});

    useEffect(() => {
        if (initialData) setScores(initialData);
    }, [initialData]);

    const updateScore = (key: string, val: number) => {
        setScores(prev => ({ ...prev, [key]: val }));
    };

    const calculateTotal = () => Object.values(scores).reduce((a, b) => a + b, 0);

    const renderItem = (id: string, label: string, options: string[]) => (
        <View style={sharedStyles.itemContainer}>
            <Text style={sharedStyles.itemLabel}>{label}</Text>
            <View style={sharedStyles.optionRow}>
                {options.map((opt, idx) => (
                    <ScoreOption key={idx} value={idx} label={opt} current={scores[id] ?? 0} onSelect={(v: number) => updateScore(id, v)} />
                ))}
            </View>
        </View>
    );

    // Standard UHDRS Scale 0-4
    const scale04 = ["Normal", "Leve/Dudoso", "Leve/Claro", "Moderado", "Severo"];
    const choreaScale = ["Ausente", "Leve/Intermitente", "Leve/Común", "Moderada/Común", "Marcada/Prolongada"];

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={sharedStyles.modalOverlay}>
                <View style={sharedStyles.modalContent}>
                    <View style={sharedStyles.header}>
                        <Text style={sharedStyles.title}>UHDRS - Evaluación Motora</Text>
                        <TouchableOpacity onPress={onClose} style={sharedStyles.closeBtn}><X size={20} color="#64748b" /></TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={sharedStyles.totalScore}>PUNTAJE TOTAL: {calculateTotal()} / 124</Text>

                        <Text style={sharedStyles.sectionTitle}>1. Oculomotor</Text>
                        {renderItem("ocular_pursuit_h", "1a. Persecución Ocular Horizontal", ["Completa", "Sacádico", "Interrumpida", "Rango inc.", "Incapaz"])}
                        {renderItem("ocular_pursuit_v", "1b. Persecución Ocular Vertical", ["Completa", "Sacádico", "Interrumpida", "Rango inc.", "Incapaz"])}
                        {renderItem("saccade_init_h", "2a. Iniciación Sacádicos Horiz.", ["Normal", "Latencia+", "Parpadeo", "Cabeza", "Incapaz"])}
                        {renderItem("saccade_init_v", "2b. Iniciación Sacádicos Vert.", ["Normal", "Latencia+", "Parpadeo", "Cabeza", "Incapaz"])}
                        {renderItem("saccade_vel_h", "3a. Velocidad Sacádicos Horiz.", ["Normal", "Lento Leve", "Lento Mod", "Muy Lento", "Incompleto"])}
                        {renderItem("saccade_vel_v", "3b. Velocidad Sacádicos Vert.", ["Normal", "Lento Leve", "Lento Mod", "Muy Lento", "Incompleto"])}

                        <Text style={sharedStyles.sectionTitle}>2. Habla y Lengua</Text>
                        {renderItem("dysarthria", "4. Disartria", ["Normal", "Poco Claro", "Repetir", "Incomprensible", "Mudo"])}
                        {renderItem("tongue_protrusion", "5. Protrusión Lengua", ["10s", "<10s", "<5s", "Parcial", "No sale"])}

                        <Text style={sharedStyles.sectionTitle}>3. Distonía (0-4)</Text>
                        {renderItem("dystonia_trunk", "6a. Tronco", choreaScale)}
                        {renderItem("dystonia_rue", "6b. Brazo Der.", choreaScale)}
                        {renderItem("dystonia_lue", "6c. Brazo Izq.", choreaScale)}
                        {renderItem("dystonia_rle", "6d. Pierna Der.", choreaScale)}
                        {renderItem("dystonia_lle", "6e. Pierna Izq.", choreaScale)}

                        <Text style={sharedStyles.sectionTitle}>4. Corea (0-4)</Text>
                        {renderItem("chorea_face", "7a. Cara", choreaScale)}
                        {renderItem("chorea_bol", "7b. Boca/Lengua", choreaScale)}
                        {renderItem("chorea_trunk", "7c. Tronco", choreaScale)}
                        {renderItem("chorea_rue", "7d. Brazo Der.", choreaScale)}
                        {renderItem("chorea_lue", "7e. Brazo Izq.", choreaScale)}
                        {renderItem("chorea_rle", "7f. Pierna Der.", choreaScale)}
                        {renderItem("chorea_lle", "7h. Pierna Izq.", choreaScale)}

                        <Text style={sharedStyles.sectionTitle}>5. Movilidad</Text>
                        {renderItem("gait", "14. Marcha", ["Normal", "Base Ancha", "Dificultad", "Asistencia", "No Camina"])}
                        {renderItem("tandem", "15. Tándem (10 pasos)", ["Normal", "1-3 Error", ">3 Error", "No completa", "No Intenta"])}
                        {renderItem("retropulsion", "8. Pull Test", ["Normal", "Recupera", "Caería", "Cae", "No puede"])}

                        <Text style={sharedStyles.sectionTitle}>6. Destreza y Rigidez</Text>
                        {renderItem("finger_taps_r", "9a. Toque Dedos (Der)", [">=15", "11-14", "7-10", "3-6", "0-2"])}
                        {renderItem("finger_taps_l", "9b. Toque Dedos (Izq)", [">=15", "11-14", "7-10", "3-6", "0-2"])}
                        {renderItem("pro_sup_r", "10a. Pron/Sup (Der)", scale04)}
                        {renderItem("pro_sup_l", "10b. Pron/Sup (Izq)", scale04)}
                        {renderItem("luria", "11. Luria (Puño-Canto-Palma)", [">=4/10s", "<4/10s", "Con Pistas", "<4 Con Pistas", "No puede"])}
                        {renderItem("rigidity_r", "12a. Rigidez (Der)", ["Ausente", "Leve/Activ", "Leve/Mod", "Severa", "Limitada"])}
                        {renderItem("rigidity_l", "12b. Rigidez (Izq)", ["Ausente", "Leve/Activ", "Leve/Mod", "Severa", "Limitada"])}
                        {renderItem("bradykinesia", "13. Bradicinesia", ["Normal", "Mínima", "Leve", "Moderada", "Marcada"])}

                    </ScrollView>
                    <TouchableOpacity style={sharedStyles.saveBtn} onPress={() => onSave(scores, calculateTotal())}>
                        <Text style={sharedStyles.saveText}>Guardar Evaluación Motora</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// --- 2. MMSE COGNITIVE ---
export const MMSEForm = ({ visible, onClose, initialData, onSave }: any) => {
    const [scores, setScores] = useState<Record<string, number>>({});

    useEffect(() => { if (initialData) setScores(initialData); }, [initialData]);
    const update = (k: string, v: number) => setScores(p => ({ ...p, [k]: v }));
    const total = Object.values(scores).reduce((a, b) => a + b, 0);

    const renderInput = (id: string, label: string, max: number) => (
        <View style={sharedStyles.itemContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[sharedStyles.itemLabel, { width: '70%' }]}>{label} (Max {max})</Text>
                <TextInput
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, width: 60, textAlign: 'center' }}
                    keyboardType="numeric"
                    placeholder="0"
                    value={String(scores[id] ?? '')}
                    onChangeText={(t) => {
                        let v = parseInt(t) || 0;
                        if (v > max) v = max;
                        update(id, v);
                    }}
                />
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={sharedStyles.modalOverlay}>
                <View style={sharedStyles.modalContent}>
                    <View style={sharedStyles.header}>
                        <Text style={sharedStyles.title}>MMSE - Cognitivo (Max 35)</Text>
                        <TouchableOpacity onPress={onClose} style={sharedStyles.closeBtn}><X size={20} color="#64748b" /></TouchableOpacity>
                    </View>
                    <ScrollView>
                        <Text style={sharedStyles.totalScore}>TOTAL: {total} / 35</Text>
                        <Text style={sharedStyles.sectionTitle}>1. Orientación</Text>
                        {renderInput("ori_time", "Temporal (Día, Mes, Año, etc)", 5)}
                        {renderInput("ori_space", "Espacial (Lugar, Piso, Ciudad...)", 5)}

                        <Text style={sharedStyles.sectionTitle}>2. Fijación y Memoria</Text>
                        {renderInput("registration", "Repetición 3 Palabras", 3)}
                        {renderInput("recall", "Recuerdo Diferido 3 Palabras", 3)}

                        <Text style={sharedStyles.sectionTitle}>3. Concentración</Text>
                        {renderInput("serial7", "Restas sucesivas (30-3...)", 5)}
                        {renderInput("digits_back", "Dígitos Inversos (5-9-2)", 3)}

                        <Text style={sharedStyles.sectionTitle}>4. Lenguaje</Text>
                        {renderInput("naming", "Denominación (Lápiz, Reloj)", 2)}
                        {renderInput("repetition", "Repetición Frase", 1)}
                        {renderInput("abstraction", "Abstracción (Colores, Animales)", 2)}
                        {renderInput("command3", "Orden 3 Comandos", 3)}
                        {renderInput("reading", "Lectura y Ejecución", 1)}
                        {renderInput("writing", "Escritura Frase", 1)}
                        {renderInput("copying", "Copia Dibujo", 1)}
                    </ScrollView>
                    <TouchableOpacity style={sharedStyles.saveBtn} onPress={() => onSave(scores, total)}>
                        <Text style={sharedStyles.saveText}>Guardar MMSE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// --- 3. PBA BEHAVIORAL ---
export const PBAForm = ({ visible, onClose, initialData, onSave }: any) => {
    const [scores, setScores] = useState<Record<string, number>>({});
    useEffect(() => { if (initialData) setScores(initialData); }, [initialData]);
    const update = (k: string, v: number) => setScores(p => ({ ...p, [k]: v }));
    const total = Object.values(scores).reduce((a, b) => a + b, 0);

    const items = [
        ["depressed_mood", "Tristeza / Ánimo"],
        ["anxiety", "Ansiedad"],
        ["irritability", "Irritabilidad"],
        ["aggression", "Agresividad"],
        ["apathy", "Apatía"], // Added standard PBA item if omitted or map to specific
        ["obsessions", "Obsesiones"],
        ["compulsions", "Compulsiones"],
        ["delusions", "Delirios"],
        ["hallucinations", "Alucinaciones"],
        ["suicidal", "Pensam. Suicidas"]
    ];
    // User list: Tristeza, Autoestima/Culpa, Ansiedad, Suicidas, Agresivo, Irritable, Obsesiones, Compulsiones, Delirios, Alucinaciones
    const userItems = [
        ["sad_mood", "Tristeza / Ánimo"],
        ["guilt", "Baja Autoestima / Culpa"],
        ["anxiety", "Ansiedad"],
        ["suicidal", "Pensamientos Suicidas"],
        ["aggressive", "Comp. Agresivo"],
        ["irritable", "Comp. Irritable"],
        ["obsessions", "Obsesiones"],
        ["compulsions", "Compulsiones"],
        ["delusions", "Delirios"],
        ["hallucinations", "Alucinaciones"]
    ];

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={sharedStyles.modalOverlay}>
                <View style={sharedStyles.modalContent}>
                    <View style={sharedStyles.header}>
                        <Text style={sharedStyles.title}>PBA - Conductual</Text>
                        <TouchableOpacity onPress={onClose} style={sharedStyles.closeBtn}><X size={20} color="#64748b" /></TouchableOpacity>
                    </View>
                    <ScrollView>
                        <Text style={sharedStyles.totalScore}>TOTAL: {total}</Text>
                        <Text style={sharedStyles.descText}>0=Ausente, 1=Leve, 2=Ligera, 3=Moderada, 4=Severa</Text>
                        {userItems.map(([key, label]) => (
                            <View key={key} style={sharedStyles.itemContainer}>
                                <Text style={sharedStyles.itemLabel}>{label}</Text>
                                <View style={sharedStyles.optionRow}>
                                    {[0, 1, 2, 3, 4].map(v => (
                                        <ScoreOption key={v} value={v} label={v.toString()} current={scores[key] ?? 0} onSelect={(val: any) => update(key, val)} />
                                    ))}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={sharedStyles.saveBtn} onPress={() => onSave(scores, total)}>
                        <Text style={sharedStyles.saveText}>Guardar PBA</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// --- 4. FUNCTIONAL CAPACITY ---
export const FCForm = ({ visible, onClose, initialData, onSave }: any) => {
    const [scores, setScores] = useState<Record<string, number>>({});
    useEffect(() => { if (initialData) setScores(initialData); }, [initialData]);
    const update = (k: string, v: number) => setScores(p => ({ ...p, [k]: v }));
    const total = Object.values(scores).reduce((a, b) => a + b, 0);

    const renderOptions = (key: string, label: string, opts: string[]) => (
        <View style={sharedStyles.itemContainer}>
            <Text style={sharedStyles.itemLabel}>{label}</Text>
            <View style={sharedStyles.optionRow}>
                {opts.map((txt, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={[sharedStyles.optionBtn, scores[key] === idx && sharedStyles.optionBtnSelected, { width: '48%' }]}
                        onPress={() => update(key, idx)}
                    >
                        <Text style={[sharedStyles.optionText, scores[key] === idx && sharedStyles.optionTextSelected]}>{idx} - {txt}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={sharedStyles.modalOverlay}>
                <View style={sharedStyles.modalContent}>
                    <View style={sharedStyles.header}>
                        <Text style={sharedStyles.title}>Capacidad Funcional (TFC)</Text>
                        <TouchableOpacity onPress={onClose} style={sharedStyles.closeBtn}><X size={20} color="#64748b" /></TouchableOpacity>
                    </View>
                    <ScrollView>
                        <Text style={sharedStyles.totalScore}>TOTAL: {total} / 13</Text>
                        {renderOptions("occupation", "1. Ocupación", ["Incapaz", "Marginal", "Reducida", "Normal"])}
                        {renderOptions("finances", "2. Finanzas", ["Incapaz", "Asist. Mayor", "Asist. Ligera", "Normal"])}
                        {renderOptions("chores", "3. Tareas Domésticas", ["Incapaz", "Deteriorado", "Normal"])}
                        {renderOptions("adl", "4. Actividades Vida Diaria", ["Cuidado Total", "Solo Básicas", "Deterioro Mín", "Normal"])}
                        {renderOptions("care_level", "5. Nivel Cuidado", ["Enfermería Prof.", "Casa/Crónico", "Casa"])}
                    </ScrollView>
                    <TouchableOpacity style={sharedStyles.saveBtn} onPress={() => onSave(scores, total)}>
                        <Text style={sharedStyles.saveText}>Guardar TFC</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};
