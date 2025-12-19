import { LabResult, NeurologyAssessment } from '@/types/medical';

// --- CONSTANTS ---
const API_GEMINI = process.env.API_GEMINI || process.env.EXPO_PUBLIC_API_GEMINI;
const API_CHATGPT = process.env.API_CHATGPT || process.env.EXPO_PUBLIC_API_CHATGPT;

// --- PROMPT GENERATOR ---
export const generateMedicalPrompt = (
    patientName: string,
    age: number,
    labs: LabResult[],
    neuro: NeurologyAssessment
) => {
    // 1. Genetic Analysis
    const geneticLab = labs.find(l => l.type.includes('GENETICA') || l.type.includes('MOLECULAR'));
    let geneticText = "No hay examen genético disponible.";
    if (geneticLab) {
        geneticText = `
Examen Genético (Biología Molecular):
- Resultado: ${JSON.stringify(geneticLab.results_json || {}) || 'No especificado'}
- Nota del Laboratorio: ${geneticLab.result_text || 'No especificado'}
- Parámetros de Referencia:
  < 27: Normal.
  27-35: 0% probabilidad enfermedad, riesgo para descendencia.
  36-39: Penetrancia reducida (posible desarrollo en vejez).
  40-55: Penetrancia alta (desarrollo certero).
  >= 56: HD Juvenil (severa y progresiva).
`;
    }

    // 2. Neuro Analysis
    const motorScore = neuro.uhdrs_motor_score || 'No realizado';
    const mmseScore = neuro.mmse_score || 'No realizado';
    const pbaScore = neuro.pba_score || 'No realizado';
    const fcScore = neuro.fc_score || 'No realizado';

    return `
Actúa como un neurólogo experto en la Enfermedad de Huntington. Analiza el siguiente caso clínico y genera una sugerencia de diagnóstico detallada.

PACIENTE: ${patientName} (${age} años)

DATOS CLÍNICOS:
${geneticText}

EVALUACIÓN NEUROLÓGICA (UHDRS):
- Motor Score (0-124): ${motorScore}
- Cognitivo (MMSE, 0-35): ${mmseScore}
  * Regla: MMSE <= 20 indica degeneración cognitiva.
  * Detalles: ${JSON.stringify(neuro.mmse_info || {})}
- Conductual (PBA): ${pbaScore} puntos (Severidad acumulada).
  * Detalles: ${JSON.stringify(neuro.pba_info || {})}
- Capacidad Funcional (TFC): ${fcScore} puntos.
  * Escala de Estadios:
    >11: Estadio I (Disminución marginal).
    7-10: Estadio II (Pierde capacidad trabajo, ayuda ligera).
    3-6: Estadio III (Incapacidad laboral, ayuda importante).
    1-2: Estadio IV (Asistencia importante financiera/doméstica).
    0: Estadio V (Cuidado enfermería total).

INSTRUCCIONES:
1. Evalúa el riesgo genético basado en los CAG (si existen).
2. Correlaciona con el estado motor, cognitivo y funcional.
3. Determina el Estadio funcional del paciente.
4. Genera un "Diagnóstico Sugerido" breve y profesional (max 3 lineas), tomando el rol de un medico experto en Huntington.
`;
};

// --- SERVICE METHODS ---

export const getGeminiDiagnosis = async (prompt: string) => {
    console.log("--- INICIANDO LLAMADA GEMINI ---");
    if (!API_GEMINI) {
        console.error("❌ ERROR: API_GEMINI no está definida.");
        throw new Error("API_GEMINI no configurada (Revise .env o EXPO_PUBLIC_API_GEMINI)");
    }
    // Updated to gemini-2.5-flash to avoid 404s
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    try {
        console.log("Enviando request a Gemini:", url);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_GEMINI },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        console.log("Gemini Status:", response.status);
        const data = await response.json();

        if (!response.ok) {
            console.error("❌ Error Respuesta Gemini:", JSON.stringify(data));
            return `Error Gemini (${response.status}): ${data.error?.message || 'Desconocido'}`;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            console.error("⚠️ Respuesta Gemini vacía o estructura inesperada:", JSON.stringify(data));
            return "Error: Respuesta vacía de Gemini.";
        }

        console.log("✅ Respuesta Gemini OK");
        return text;

    } catch (error) {
        console.error("❌ Excepción Gemini:", error);
        throw error;
    }
};

export const getChatGPTDiagnosis = async (prompt: string) => {
    console.log("--- INICIANDO LLAMADA CHATGPT ---");
    if (!API_CHATGPT) {
        console.error("❌ ERROR: API_CHATGPT no está definida.");
        throw new Error("API_CHATGPT no configurada");
    }

    const url = 'https://api.openai.com/v1/chat/completions';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CHATGPT}`
            },
            body: JSON.stringify({
                model: "gpt-4", // Or gpt-3.5-turbo
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        const status = response.status;
        console.log("ChatGPT Status:", status);
        const data = await response.json();

        if (!response.ok) {
            console.error("❌ Error Respuesta ChatGPT:", JSON.stringify(data));
            return `Error ChatGPT (${status}): ${data.error?.message || 'Desconocido'}`;
        }

        const text = data?.choices?.[0]?.message?.content;
        if (!text) {
            console.error("⚠️ Respuesta ChatGPT vacía o estructura inesperada:", JSON.stringify(data));
            return "Error: Respuesta vacía de ChatGPT.";
        }

        console.log("✅ Respuesta ChatGPT OK");
        return text;
    } catch (error) {
        console.error("❌ Excepción ChatGPT:", error);
        throw error;
    }
};
