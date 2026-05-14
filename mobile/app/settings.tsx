import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useStrava } from '@/src/contexts/StravaContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { isConnected, isConnecting, connectStrava, disconnectStrava, syncActivities } = useStrava();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleStravaConnect = async () => {
    try {
      await connectStrava();
      Alert.alert('Sucesso', 'Conectado ao Strava! Agora você pode sincronizar suas atividades.');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível conectar ao Strava. Tente novamente.');
    }
  };

  const handleStravaDisconnect = async () => {
    Alert.alert(
      'Desconectar Strava',
      'Tem certeza que deseja desconectar do Strava?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectStrava();
              Alert.alert('Sucesso', 'Desconectado do Strava.');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível desconectar.');
            }
          },
        },
      ]
    );
  };

  const handleSyncActivities = async () => {
    try {
      const result = await syncActivities();
      if (result) {
        Alert.alert(
          'Sincronização Completa',
          `Sincronizadas ${result.syncedActivities} de ${result.totalActivities} atividades.`
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível sincronizar atividades.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Integrações</Text>

          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Strava</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: isConnected ? '#4CAF50' : '#FF9800' }
              ]}>
                <Text style={styles.statusText}>
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </Text>
              </View>
            </View>

            <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
              {isConnected
                ? 'Suas atividades do Strava são sincronizadas automaticamente.'
                : 'Conecte sua conta Strava para sincronizar treinos automaticamente.'
              }
            </Text>

            <View style={styles.cardActions}>
              {!isConnected ? (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleStravaConnect}
                  disabled={isConnecting}
                >
                  <Text style={styles.primaryButtonText}>
                    {isConnecting ? 'Conectando...' : 'Conectar Strava'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleSyncActivities}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                      Sincronizar Agora
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.dangerButton]}
                    onPress={handleStravaDisconnect}
                  >
                    <Text style={styles.dangerButtonText}>
                      Desconectar
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Conta</Text>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.cardBackground }]}
            onPress={handleLogout}
          >
            <Text style={[styles.menuItemText, { color: '#FF4444' }]}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sobre</Text>

          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
              Sidekick v1.0.0{'\n'}
              Seu companheiro de jornada fitness.{'\n\n'}
              Desenvolvido com ❤️ para atletas que buscam motivação e análise inteligente de treinos.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FC4C02',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FC4C02',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FF4444',
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  menuItem: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
