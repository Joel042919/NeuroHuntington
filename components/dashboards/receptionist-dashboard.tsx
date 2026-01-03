import { supabase } from '@/config/supabase';
import { useAuth, UserProfile } from '@/context/AuthContext';
import { ClinicalCase, DoctorDetail, DoctorSpecialty, PatientProfile } from '@/types/medical';
import { Calendar, ChevronLeft, ChevronRight, FilePlus, FileText, LogOut, PlusCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ReceptionistDashboard({ profile }: { profile: UserProfile }) {
    const { signOut } = useAuth();
    const [view, setView] = useState<'home' | 'new_appointment' | 'new_case' | 'new_patient'>('home');

    // --- ESTADOS PARA NUEVA CITA ---
    const [specialties, setSpecialties] = useState<DoctorSpecialty[]>([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState<DoctorSpecialty | null>(null);
    const [doctors, setDoctors] = useState<DoctorDetail[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorDetail | null>(null);
    const [doctorSearch, setDoctorSearch] = useState('');
    const [loadingDoctors, setLoadingDoctors] = useState(false);

    // Calendario y Horarios
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState<{ date: Date, time: string }[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<{ date: Date, time: string } | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Paciente para la cita
    const [patientSearch, setPatientSearch] = useState('');
    const [patients, setPatients] = useState<PatientProfile[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);

    // Caso Clínico para la cita
    const [patientCases, setPatientCases] = useState<ClinicalCase[]>([]);
    const [selectedCase, setSelectedCase] = useState<ClinicalCase | null>(null);
    const [isCreatingNewCaseForAppt, setIsCreatingNewCaseForAppt] = useState(false);
    const [newCaseCodeForAppt, setNewCaseCodeForAppt] = useState('');
    const [loadingCases, setLoadingCases] = useState(false);

    // --- ESTADOS PARA NUEVO CASO ---
    const [newCaseCode, setNewCaseCode] = useState('');
    const [creatingCase, setCreatingCase] = useState(false);

    // --- ESTADOS PARA NUEVO PACIENTE ---
    const [regFirstName, setRegFirstName] = useState('');
    const [regLastName, setRegLastName] = useState('');
    const [regDni, setRegDni] = useState('');
    const [regBirthday, setRegBirthday] = useState(''); // YYYY-MM-DD
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [creatingPatient, setCreatingPatient] = useState(false);


    // Cargar Especialidades al inicio
    useEffect(() => {
        fetchSpecialties();
    }, []);

    const fetchSpecialties = async () => {
        const { data } = await supabase.from('doctor_specialty').select('*').eq('status', true);
        if (data) setSpecialties(data);
    };

    // Buscar Doctores cuando cambia especialidad o búsqueda
    useEffect(() => {
        if (view === 'new_appointment' && selectedSpecialty) {
            fetchDoctors();
        }
    }, [selectedSpecialty, doctorSearch]);

    const fetchDoctors = async () => {
        setLoadingDoctors(true);
        try {
            let query = supabase
                .from('doctors_details')
                .select(`
                    *,
                    profile:profiles!profile_id(id, first_name, last_name, avatar_url),
                    specialty:doctor_specialty(specialty)
                `)
                .eq('specialty_id', selectedSpecialty?.id);

            const { data, error } = await query;
            if (error) throw error;

            let filtered = data as unknown as DoctorDetail[];
            if (doctorSearch) {
                const search = doctorSearch.toLowerCase();
                filtered = filtered.filter(d =>
                    d.profile?.first_name.toLowerCase().includes(search) ||
                    d.profile?.last_name.toLowerCase().includes(search)
                );
            }
            setDoctors(filtered);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudieron cargar los doctores');
        } finally {
            setLoadingDoctors(false);
        }
    };

    // Buscar Pacientes
    const searchPatients = async (text: string) => {
        setPatientSearch(text);
        if (text.length < 3) {
            setPatients([]);
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id_role', 3) // Rol Paciente
            .or(`first_name.ilike.%${text}%,last_name.ilike.%${text}%,dni.ilike.%${text}%`)
            .limit(5);

        if (error) {
            console.log("Search error:", error);
        }
        if (data) setPatients(data);
    };

    // Cargar Casos del Paciente Seleccionado
    useEffect(() => {
        if (selectedPatient) {
            fetchPatientCases();
        } else {
            setPatientCases([]);
            setSelectedCase(null);
        }
    }, [selectedPatient]);

    const fetchPatientCases = async () => {
        if (!selectedPatient) return;
        setLoadingCases(true);
        const { data, error } = await supabase
            .from('clinical_cases')
            .select('*')
            .eq('patient_id', selectedPatient.id)
            .eq('is_active', true);

        if (error) console.error("Error fetching cases:", error);
        if (data) setPatientCases(data);
        setLoadingCases(false);
    };

    // --- LÓGICA DE CALENDARIO INTELIGENTE ---
    useEffect(() => {
        if (selectedDoctor) {
            calculateAvailableSlots();
        }
    }, [selectedDoctor, currentWeekStart]);

    const calculateAvailableSlots = async () => {
        if (!selectedDoctor || !selectedDoctor.available_hours) return;
        setLoadingSlots(true);
        setAvailableSlots([]);
        setSelectedSlot(null);

        try {
            // 1. Obtener citas existentes del doctor para la semana seleccionada
            const startStr = currentWeekStart.toISOString();
            const endOfWeek = new Date(currentWeekStart);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            const endStr = endOfWeek.toISOString();

            const { data: existingAppts } = await supabase
                .from('appointments')
                .select('scheduled_at')
                .eq('doctor_id', selectedDoctor.profile_id)
                .gte('scheduled_at', startStr)
                .lte('scheduled_at', endStr);

            const busyTimes = new Set(existingAppts?.map(a => new Date(a.scheduled_at).toISOString()) || []);

            // 2. Generar slots basados en available_hours (JSON)
            const daysMap: Record<string, number> = { "Domingo": 0, "Lunes": 1, "Martes": 2, "Miercoles": 3, "Jueves": 4, "Viernes": 5, "Sabado": 6 };
            const generatedSlots: { date: Date, time: string }[] = [];

            Object.entries(selectedDoctor.available_hours).forEach(([dayName, ranges]) => {
                const dayIndex = daysMap[dayName]; // 0-6
                if (dayIndex === undefined) return;

                // Calcular fecha para este día en la semana actual
                const slotDate = new Date(currentWeekStart);
                const currentDayIndex = slotDate.getDay(); // 0-6
                const diff = dayIndex - currentDayIndex;
                slotDate.setDate(slotDate.getDate() + diff);

                // Si la fecha es pasada (ayer u hoy antes de hora actual), ignorar
                if (slotDate < new Date(new Date().setHours(0, 0, 0, 0))) return;

                ranges.forEach(range => {
                    let startHour = parseInt(range.start_time.split(':')[0]);
                    const endHour = parseInt(range.end_time.split(':')[0]);

                    // Generar slots de 1 hora
                    while (startHour < endHour) {
                        const timeStr = `${startHour.toString().padStart(2, '0')}:00`;
                        const slotFullDate = new Date(slotDate);
                        slotFullDate.setHours(startHour, 0, 0, 0);
                        const isoSlot = slotFullDate.toISOString();

                        // Verificar conflicto
                        if (!busyTimes.has(isoSlot)) {
                            generatedSlots.push({ date: slotFullDate, time: timeStr });
                        }
                        startHour++;
                    }
                });
            });

            // Ordenar por fecha
            generatedSlots.sort((a, b) => a.date.getTime() - b.date.getTime());
            setAvailableSlots(generatedSlots);

        } catch (error) {
            console.error("Error calculating slots:", error);
        } finally {
            setLoadingSlots(false);
        }
    };

    const changeWeek = (direction: number) => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + (direction * 7));
        setCurrentWeekStart(newDate);
    };

    // --- ACCIONES ---

    const handleCreateAppointment = async () => {
        if (!selectedDoctor || !selectedPatient || !selectedSlot) {
            Alert.alert("Faltan datos", "Seleccione doctor, paciente y horario.");
            return;
        }

        if (!selectedCase && (!isCreatingNewCaseForAppt || !newCaseCodeForAppt)) {
            Alert.alert("Faltan datos", "Debe seleccionar un caso clínico existente o crear uno nuevo.");
            return;
        }

        try {
            let finalCaseId = selectedCase?.id;

            // 1. Si está creando caso nuevo, crearlo primero
            if (isCreatingNewCaseForAppt) {
                const { data: newCase, error: caseError } = await supabase
                    .from('clinical_cases')
                    .insert({
                        patient_id: selectedPatient.id,
                        code_case: newCaseCodeForAppt,
                        status: 1,
                        is_active: true
                    })
                    .select()
                    .single();

                if (caseError) throw caseError;
                finalCaseId = newCase.id;
            }

            if (!finalCaseId) throw new Error("No se pudo determinar el ID del caso clínico");

            // 2. Crear Cita
            const { data: appt, error: apptError } = await supabase
                .from('appointments')
                .insert({
                    doctor_id: selectedDoctor.profile_id,
                    patient_id: selectedPatient.id,
                    case_id: finalCaseId, // Linkeamos el caso
                    scheduled_at: selectedSlot.date.toISOString(),
                    status: 1, // Pendiente
                    type: 1, // Primera vez
                })
                .select()
                .single();

            if (apptError) throw apptError;

            // 3. Crear Notificación
            await supabase.from('notifications').insert({
                user_id: selectedPatient.id,
                title: 'Recordatorio de Cita',
                message: `Tienes una cita con el Dr. ${selectedDoctor.profile?.last_name} mañana a las ${selectedSlot.time}`,
                created_at: new Date().toISOString()
            });

            Alert.alert("Éxito", "Cita agendada correctamente.");
            setView('home');

            // Reset States
            setSelectedDoctor(null);
            setSelectedPatient(null);
            setSelectedSlot(null);
            setSelectedCase(null);
            setIsCreatingNewCaseForAppt(false);
            setNewCaseCodeForAppt('');

        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "No se pudo agendar la cita.");
        }
    };

    const handleCreateCase = async () => {
        if (!selectedPatient || !newCaseCode) {
            Alert.alert("Error", "Seleccione paciente e ingrese código.");
            return;
        }
        setCreatingCase(true);
        try {
            const { error } = await supabase.from('clinical_cases').insert({
                patient_id: selectedPatient.id,
                code_case: newCaseCode,
                status: 1,
                is_active: true
            });

            if (error) throw error;
            Alert.alert("Éxito", "Caso clínico creado.");
            setView('home');
            setSelectedPatient(null);
            setNewCaseCode('');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudo crear el caso. Verifique permisos.");
        } finally {
            setCreatingCase(false);
        }
    };


    const handleCreatePatient = async () => {
        if (!regEmail || !regPassword || !regFirstName || !regLastName || !regDni || !regBirthday) {
            Alert.alert("Error", "Complete todos los campos, incluyendo fecha de nacimiento.");
            return;
        }
        setCreatingPatient(true);
        try {
            const { createClient } = require('@supabase/supabase-js');
            const tempClient = createClient(
                process.env.EXPO_PUBLIC_SUPABASE_URL as string,
                process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                }
            );

            // Use Admin API to create user
            const { data: userData, error: authError } = await tempClient.auth.admin.createUser({
                email: regEmail,
                password: regPassword,
                email_confirm: true,
                user_metadata: {
                    first_name: regFirstName,
                    last_name: regLastName,
                    dni: regDni,
                    birthday: regBirthday, // Metadata
                    role: 'patient'
                }
            });

            if (authError) throw authError;

            if (userData.user) {
                const { error: profileError } = await tempClient
                    .from('profiles')
                    .upsert({
                        id: userData.user.id,
                        first_name: regFirstName,
                        last_name: regLastName,
                        dni: regDni,
                        birthday: regBirthday, // Insert into profile
                        email: regEmail,
                        id_role: 3,
                        role: 'patient'
                    });

                if (profileError) {
                    console.log("Profile creation warning:", profileError);
                }
            }

            Alert.alert("Éxito", "Paciente registrado correctamente.");
            setView('home');
            setRegEmail(''); setRegPassword(''); setRegFirstName(''); setRegLastName(''); setRegDni(''); setRegBirthday('');

        } catch (error: any) {
            console.error("Create Patient Error:", error);
            Alert.alert("Error", error.message || "No se pudo registrar al paciente.");
        } finally {
            setCreatingPatient(false);
        }
    };

    // ...


    // --- RENDERS ---

    const renderHome = () => (
        <View style={styles.menuGrid}>
            <TouchableOpacity style={styles.menuCard} onPress={() => setView('new_appointment')}>
                <View style={[styles.iconBg, { backgroundColor: '#dbeafe' }]}>
                    <Calendar size={32} color="#2563eb" />
                </View>
                <Text style={styles.menuTitle}>Nueva Cita</Text>
                <Text style={styles.menuDesc}>Agendar cita verificando disponibilidad.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} onPress={() => setView('new_case')}>
                <View style={[styles.iconBg, { backgroundColor: '#dcfce7' }]}>
                    <FilePlus size={32} color="#16a34a" />
                </View>
                <Text style={styles.menuTitle}>Nuevo Caso</Text>
                <Text style={styles.menuDesc}>Abrir expediente para nuevo paciente.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} onPress={() => setView('new_patient')}>
                <View style={[styles.iconBg, { backgroundColor: '#fef3c7' }]}>
                    <FilePlus size={32} color="#d97706" />
                </View>
                <Text style={styles.menuTitle}>Registrar Paciente</Text>
                <Text style={styles.menuDesc}>Crear cuenta para un nuevo paciente.</Text>
            </TouchableOpacity>
        </View>
    );

    const renderNewPatient = () => (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            <TouchableOpacity onPress={() => setView('home')} style={styles.backBtn}>
                <ChevronLeft size={20} color="#64748b" />
                <Text style={styles.backText}>Volver</Text>
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Registrar Nuevo Paciente</Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} value={regFirstName} onChangeText={setRegFirstName} placeholder="Nombres" />

            <Text style={styles.label}>Apellido</Text>
            <TextInput style={styles.input} value={regLastName} onChangeText={setRegLastName} placeholder="Apellidos" />

            <Text style={styles.label}>DNI</Text>
            <TextInput style={styles.input} value={regDni} onChangeText={setRegDni} placeholder="Documento de Identidad" keyboardType="numeric" />

            <Text style={styles.label}>Fecha de Nacimiento (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={regBirthday} onChangeText={setRegBirthday} placeholder="Ej: 1990-05-15" />

            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput style={styles.input} value={regEmail} onChangeText={setRegEmail} placeholder="correo@ejemplo.com" autoCapitalize="none" keyboardType="email-address" />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput style={styles.input} value={regPassword} onChangeText={setRegPassword} placeholder="Contraseña segura" secureTextEntry />

            <TouchableOpacity
                style={[styles.mainButton, creatingPatient && styles.disabledButton]}
                onPress={handleCreatePatient}
                disabled={creatingPatient}
            >
                {creatingPatient ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainButtonText}>Registrar Paciente</Text>}
            </TouchableOpacity>
        </ScrollView>
    );

    const renderNewAppointment = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={() => setView('home')} style={styles.backBtn}>
                <ChevronLeft size={20} color="#64748b" />
                <Text style={styles.backText}>Volver</Text>
            </TouchableOpacity>
            {/* ... Rest of New Appt Render (unchanged but standardizing header) ... */}
            <Text style={styles.pageTitle}>Agendar Nueva Cita</Text>

            {/* 1. Seleccionar Paciente */}
            <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>1. Seleccionar Paciente</Text>
                {selectedPatient ? (
                    <View style={styles.selectedItem}>
                        <Text style={styles.selectedText}>{selectedPatient.first_name} {selectedPatient.last_name}</Text>
                        <TouchableOpacity onPress={() => setSelectedPatient(null)}><Text style={styles.changeLink}>Cambiar</Text></TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        <TextInput
                            style={styles.input}
                            placeholder="Buscar por nombre o DNI..."
                            value={patientSearch}
                            onChangeText={searchPatients}
                        />
                        {patients.length > 0 && (
                            <View style={styles.dropdown}>
                                {patients.map(p => (
                                    <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => { setSelectedPatient(p); setPatients([]); setPatientSearch(''); }}>
                                        <Text>{p.first_name} {p.last_name} ({p.dni})</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* 2. Seleccionar Caso Clínico */}
            {selectedPatient && (
                <View style={styles.stepContainer}>
                    <Text style={styles.stepTitle}>2. Seleccionar Caso Clínico</Text>

                    {loadingCases ? <ActivityIndicator size="small" color="#2563eb" /> : (
                        <View>
                            {!isCreatingNewCaseForAppt ? (
                                <View>
                                    {patientCases.length > 0 ? (
                                        <View style={styles.caseList}>
                                            {patientCases.map(c => (
                                                <TouchableOpacity
                                                    key={c.id}
                                                    style={[styles.caseCard, selectedCase?.id === c.id && styles.caseCardActive]}
                                                    onPress={() => setSelectedCase(c)}
                                                >
                                                    <FileText size={20} color={selectedCase?.id === c.id ? "#2563eb" : "#64748b"} />
                                                    <Text style={[styles.caseCode, selectedCase?.id === c.id && styles.caseCodeActive]}>
                                                        {c.code_case}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text style={styles.noCasesText}>El paciente no tiene casos activos.</Text>
                                    )}

                                    <TouchableOpacity
                                        style={styles.newCaseBtn}
                                        onPress={() => { setIsCreatingNewCaseForAppt(true); setSelectedCase(null); }}
                                    >
                                        <PlusCircle size={18} color="#2563eb" />
                                        <Text style={styles.newCaseBtnText}>Crear Nuevo Caso</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.newCaseForm}>
                                    <Text style={styles.label}>Nuevo Código de Caso:</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej: HD-2024-New"
                                        value={newCaseCodeForAppt}
                                        onChangeText={setNewCaseCodeForAppt}
                                    />
                                    <TouchableOpacity onPress={() => setIsCreatingNewCaseForAppt(false)}>
                                        <Text style={styles.cancelLink}>Cancelar y seleccionar existente</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}

            {/* 3. Seleccionar Especialidad */}
            {(selectedCase || (isCreatingNewCaseForAppt && newCaseCodeForAppt)) && (
                <View style={styles.stepContainer}>
                    <Text style={styles.stepTitle}>3. Especialidad</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                        {specialties.map(spec => (
                            <TouchableOpacity
                                key={spec.id}
                                style={[styles.chip, selectedSpecialty?.id === spec.id && styles.chipActive]}
                                onPress={() => { setSelectedSpecialty(spec); setSelectedDoctor(null); }}
                            >
                                <Text style={[styles.chipText, selectedSpecialty?.id === spec.id && styles.chipTextActive]}>{spec.specialty}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* 4. Seleccionar Doctor */}
            {selectedSpecialty && (
                <View style={styles.stepContainer}>
                    <Text style={styles.stepTitle}>4. Seleccionar Doctor</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Filtrar doctores..."
                        value={doctorSearch}
                        onChangeText={setDoctorSearch}
                    />
                    {loadingDoctors ? <ActivityIndicator color="#2563eb" /> : (
                        <View style={styles.doctorList}>
                            {doctors.map(doc => (
                                <TouchableOpacity
                                    key={doc.profile_id}
                                    style={[styles.doctorCard, selectedDoctor?.profile_id === doc.profile_id && styles.doctorCardActive]}
                                    onPress={() => setSelectedDoctor(doc)}
                                >
                                    <Image source={{ uri: doc.profile?.avatar_url || 'https://i.pravatar.cc/150' }} style={styles.docAvatar} />
                                    <View>
                                        <Text style={styles.docName}>Dr. {doc.profile?.last_name}</Text>
                                        <Text style={styles.docCmp}>CMP: {doc.cmp_code}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* 5. Seleccionar Horario */}
            {selectedDoctor && (
                <View style={styles.stepContainer}>
                    <Text style={styles.stepTitle}>5. Disponibilidad</Text>
                    <View style={styles.weekControl}>
                        <TouchableOpacity onPress={() => changeWeek(-1)}><ChevronLeft color="#64748b" /></TouchableOpacity>
                        <Text style={styles.weekText}>Semana del {currentWeekStart.toLocaleDateString()}</Text>
                        <TouchableOpacity onPress={() => changeWeek(1)}><ChevronRight color="#64748b" /></TouchableOpacity>
                    </View>
                    {loadingSlots ? <ActivityIndicator color="#2563eb" /> : (
                        <View style={styles.slotsGrid}>
                            {availableSlots.length > 0 ? availableSlots.map((slot, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.slot, selectedSlot === slot && styles.slotActive]}
                                    onPress={() => setSelectedSlot(slot)}
                                >
                                    <Text style={[styles.slotDay, selectedSlot === slot && styles.slotTextActive]}>
                                        {slot.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                                    </Text>
                                    <Text style={[styles.slotTime, selectedSlot === slot && styles.slotTextActive]}>{slot.time}</Text>
                                </TouchableOpacity>
                            )) : (
                                <Text style={styles.noSlots}>No hay horarios disponibles esta semana. Intente la siguiente.</Text>
                            )}
                        </View>
                    )}
                </View>
            )}

            <TouchableOpacity
                style={[styles.mainButton, (!selectedSlot || !selectedPatient || (!selectedCase && !isCreatingNewCaseForAppt)) && styles.disabledButton]}
                onPress={handleCreateAppointment}
                disabled={!selectedSlot || !selectedPatient || (!selectedCase && !isCreatingNewCaseForAppt)}
            >
                <Text style={styles.mainButtonText}>Confirmar Cita</Text>
            </TouchableOpacity>

            <View style={{ height: 50 }} />
        </ScrollView>
    );


    const renderNewCase = () => (
        <View style={{ padding: 20 }}>
            <TouchableOpacity onPress={() => setView('home')} style={styles.backBtn}>
                <ChevronLeft size={20} color="#64748b" />
                <Text style={styles.backText}>Volver</Text>
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Nuevo Caso Clínico</Text>

            <Text style={styles.label}>Paciente</Text>
            {selectedPatient ? (
                <View style={styles.selectedItem}>
                    <Text style={styles.selectedText}>{selectedPatient.first_name} {selectedPatient.last_name}</Text>
                    <TouchableOpacity onPress={() => setSelectedPatient(null)}><Text style={styles.changeLink}>Cambiar</Text></TouchableOpacity>
                </View>
            ) : (
                <View>
                    <TextInput
                        style={styles.input}
                        placeholder="Buscar paciente..."
                        value={patientSearch}
                        onChangeText={searchPatients}
                    />
                    {patients.length > 0 && (
                        <View style={styles.dropdown}>
                            {patients.map(p => (
                                <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => { setSelectedPatient(p); setPatients([]); setPatientSearch(''); }}>
                                    <Text>{p.first_name} {p.last_name} ({p.dni})</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

            <Text style={styles.label}>Código del Caso</Text>
            <TextInput
                style={styles.input}
                placeholder="Ej: HD-2024-005"
                value={newCaseCode}
                onChangeText={setNewCaseCode}
            />

            <TouchableOpacity
                style={[styles.mainButton, (!selectedPatient || !newCaseCode || creatingCase) && styles.disabledButton]}
                onPress={handleCreateCase}
                disabled={!selectedPatient || !newCaseCode || creatingCase}
            >
                {creatingCase ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainButtonText}>Crear Caso</Text>}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.subtitle}>Panel de Recepción</Text>
                    <Text style={styles.greeting}>{profile.first_name} {profile.last_name}</Text>
                </View>
                <TouchableOpacity onPress={signOut} style={{ padding: 8 }}>
                    <LogOut size={24} color="#ef4444" />
                </TouchableOpacity>
            </View>

            {view === 'home' && renderHome()}
            {view === 'new_appointment' && renderNewAppointment()}
            {view === 'new_case' && renderNewCase()}
            {view === 'new_patient' && renderNewPatient()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    greeting: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' },

    menuGrid: { flexDirection: 'row', gap: 16 },
    menuCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    iconBg: { padding: 16, borderRadius: 50, marginBottom: 12 },
    menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
    menuDesc: { fontSize: 12, color: '#64748b', textAlign: 'center' },

    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    backText: { color: '#64748b', fontWeight: '600' },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 24 },

    stepContainer: { marginBottom: 24 },
    stepTitle: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 12, textTransform: 'uppercase' },

    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16 },
    dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, marginTop: 4, maxHeight: 150 },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },

    selectedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
    selectedText: { fontWeight: 'bold', color: '#1e40af' },
    changeLink: { color: '#2563eb', fontSize: 12, fontWeight: 'bold' },

    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    chipText: { color: '#64748b', fontWeight: '600' },
    chipTextActive: { color: '#fff' },

    doctorList: { gap: 10, marginTop: 10 },
    doctorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    doctorCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
    docAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    docName: { fontWeight: 'bold', color: '#1e293b' },
    docCmp: { fontSize: 12, color: '#64748b' },

    weekControl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: '#fff', padding: 8, borderRadius: 8 },
    weekText: { fontWeight: 'bold', color: '#334155' },

    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    slot: { width: '30%', backgroundColor: '#fff', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    slotActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    slotDay: { fontSize: 10, color: '#64748b', marginBottom: 2, textTransform: 'capitalize' },
    slotTime: { fontWeight: 'bold', color: '#1e293b' },
    slotTextActive: { color: '#fff' },
    noSlots: { color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', width: '100%', padding: 20 },

    mainButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    disabledButton: { backgroundColor: '#94a3b8', opacity: 0.7 },
    mainButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8, marginTop: 16 },

    // Case Selection Styles
    caseList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    caseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    caseCardActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
    caseCode: { marginLeft: 8, fontWeight: '600', color: '#64748b' },
    caseCodeActive: { color: '#1e40af' },
    noCasesText: { color: '#94a3b8', fontStyle: 'italic', marginBottom: 10 },
    newCaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd', borderStyle: 'dashed' },
    newCaseBtnText: { color: '#0369a1', fontWeight: 'bold' },
    newCaseForm: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    cancelLink: { color: '#ef4444', fontSize: 12, marginTop: 8, textDecorationLine: 'underline' }
});
