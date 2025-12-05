import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';
import { DoctorDetail } from '@/types/medical';
import { Badge, Clock, Mail, Stethoscope, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const { profile, loading: authLoading } = useAuth();
  const [doctorDetail, setDoctorDetail] = useState<DoctorDetail | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);

  useEffect(() => {
    const fetchDoctorDetails = async () => {
      if (profile?.id_role === 2) { // Doctor
        setLoadingDoctor(true);
        const { data, error } = await supabase
          .from('doctor_details')
          .select('*, specialty:doctor_specialties(specialty)')
          .eq('profile_id', profile.id)
          .single();

        if (data) setDoctorDetail(data);
        setLoadingDoctor(false);
      }
    };

    if (profile) {
      fetchDoctorDetails();
    }
  }, [profile]);

  if (authLoading || loadingDoctor) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>No se encontró el perfil.</Text>
      </View>
    );
  }

  const getRoleLabel = (roleId: number) => {
    switch (roleId) {
      case 1: return 'Administrador';
      case 2: return 'Médico';
      case 3: return 'Paciente';
      case 4: return 'Recepcionista';
      case 5: return 'Enfermera';
      default: return 'Usuario';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <User size={60} color="#fff" />
        </View>
        <Text style={styles.name}>{profile.first_name} {profile.last_name}</Text>
        <Text style={styles.role}>{getRoleLabel(profile.id_role)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>

        <View style={styles.infoRow}>
          <Mail size={20} color="#64748b" />
          <View>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{profile.email}</Text>
          </View>
        </View>
      </View>

      {profile.id_role === 2 && doctorDetail && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Profesional</Text>

          <View style={styles.infoRow}>
            <Stethoscope size={20} color="#2563eb" />
            <View>
              <Text style={styles.label}>Especialidad</Text>
              <Text style={styles.value}>{doctorDetail.specialty?.specialty || 'No especificada'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Badge size={20} color="#2563eb" />
            <View>
              <Text style={styles.label}>Código CMP</Text>
              <Text style={styles.value}>{doctorDetail.cmp_code}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Clock size={20} color="#2563eb" />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Horarios Disponibles</Text>
              {doctorDetail.available_hours && Object.entries(doctorDetail.available_hours).map(([day, hours]: [string, any]) => (
                <View key={day} style={styles.scheduleRow}>
                  <Text style={styles.day}>{day}:</Text>
                  {hours.map((h: any, i: number) => (
                    <Text key={i} style={styles.hour}>{h.start_time} - {h.end_time}</Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#bfdbfe',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  day: {
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'capitalize',
  },
  hour: {
    color: '#64748b',
  }
});
