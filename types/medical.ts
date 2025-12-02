// types/medical.ts

export interface ClinicalCase {
    id: string;
    patient_id: string;
    code_case: string;
    status: number;
}

export interface PatientProfile {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    phone?: string;
    dni?: string;
}

export interface LabResult {
    id: string;
    type: string; // 'sangre', 'genetico', etc.
    description: string;
    results_json: Record<string, any>; // Tu JSON dinámico
    result_text: string; // La síntesis
    analyzed_at: string;
}

export interface NeurologyAssessment {
    id?: string; // Opcional porque puede no existir aún
    has_chorea: boolean;
    uhdrs_motor_score: string | number; // String en input, number en DB
    mmse_score: string | number;
    clinical_notes: string;
    diagnosis: string; // Nuevo campo
}

export interface Appointment {
    id: string;
    scheduled_at: string;
    case_id: string;
    type: {
        type: string;
    } | null;
    status: {
        appointment_status: string;
    } | null;
    patient: {
        id: string;
        first_name: string;
        last_name: string;
    } | null;
}