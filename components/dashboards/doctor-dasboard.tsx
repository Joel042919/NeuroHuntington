import { UserProfile } from '@/context/AuthContext';
import { AlertCircle, ChevronRight, ClipboardList, Stethoscope, Users } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DoctorDashboard({ profile }: { profile: UserProfile }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Doctor */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>Bienvenido Dr.</Text>
          <Text style={styles.greeting}>{profile.first_name} {profile.last_name}</Text>
        </View>
        <View style={styles.badge}>
          <Stethoscope size={16} color="#fff" />
          <Text style={styles.badgeText}>Neurología</Text>
        </View>
      </View>

      {/* Resumen de Pacientes */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
          <Users size={24} color="#2563eb" />
          <Text style={[styles.statNumber, { color: '#2563eb' }]}>12</Text>
          <Text style={styles.statLabel}>Pacientes Hoy</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
          <AlertCircle size={24} color="#ea580c" />
          <Text style={[styles.statNumber, { color: '#ea580c' }]}>3</Text>
          <Text style={styles.statLabel}>Triaje Alto</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Pacientes Hoy</Text>
      
      {/* Lista de Pacientes (Simulada para visualización) */}
      <View style={styles.patientList}>
        {[1, 2].map((item) => (
          <TouchableOpacity key={item} style={styles.patientCard}>
            <View style={styles.patientAvatar}>
              <Text style={styles.avatarText}>CR</Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>Carlos Ruiz</Text>
              <Text style={styles.patientCase}>Caso: HD-2024-001</Text>
              <View style={styles.tagContainer}>
                <Text style={styles.tagText}>Síntomas Motores</Text>
              </View>
            </View>
            <ChevronRight color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.actionButton}>
        <ClipboardList color="#fff" size={20} />
        <Text style={styles.actionText}>Iniciar Nueva Evaluación</Text>
      </TouchableOpacity>

    </ScrollView>
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
  statCard: { flex: 1, padding: 16, borderRadius: 16, gap: 8 },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#64748b' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  
  patientList: { gap: 12, marginBottom: 24 },
  patientCard: { 
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 16, 
    borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8
  },
  patientAvatar: { 
    width: 48, height: 48, backgroundColor: '#f1f5f9', borderRadius: 24, 
    alignItems: 'center', justifyContent: 'center', marginRight: 16 
  },
  avatarText: { fontWeight: 'bold', color: '#64748b' },
  patientInfo: { flex: 1 },
  patientName: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  patientCase: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  tagContainer: { backgroundColor: '#fee2e2', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, color: '#ef4444', fontWeight: 'bold' },

  actionButton: { 
    backgroundColor: '#0f172a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    padding: 16, borderRadius: 16, gap: 8 
  },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});