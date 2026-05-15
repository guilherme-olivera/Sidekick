import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStrava } from "@/src/contexts/StravaContext";
import { apiUpload } from "@/src/services/apiService";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
  warning: "#ffa94d",
};

export default function ProfileScreen() {
  const { user, logout, isLoading, refreshUser } = useAuth();
  const { isConnected, athlete, connect, disconnect, syncActivities } = useStrava();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadAvatar(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao selecionar imagem");
    }
  };

  const uploadAvatar = async (asset: any) => {
    try {
      setUploadingAvatar(true);

      const formData = new FormData();
      formData.append("avatar", {
        uri: asset.uri,
        type: "image/jpeg",
        name: `avatar_${Date.now()}.jpg`,
      } as any);

      const response = await apiUpload("/user/avatar", formData);
      if (response.success) {
        await refreshUser();
        Alert.alert("Sucesso", "Avatar atualizado com sucesso!");
      } else {
        Alert.alert("Erro", response.error || "Falha ao fazer upload do avatar");
      }
    } catch (error) {
      Alert.alert("Erro", "Erro ao fazer upload do avatar");
      console.error("Avatar upload error:", error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleStravaConnect = async () => {
    try {
      await connect();
    } catch (error) {
      Alert.alert("Erro", "Falha ao conectar Strava");
    }
  };

  const handleStravaSync = async () => {
    try {
      const result = await syncActivities();
      Alert.alert(
        "Sincronização concluída",
        `Atividades sincronizadas: ${result?.syncedActivities || 0}`
      );
    } catch (error) {
      Alert.alert("Erro", "Falha ao sincronizar com Strava");
    }
  };

  const handleStravaDisconnect = () => {
    Alert.alert(
      "Desconectar Strava",
      "Tem certeza que deseja desconectar do Strava?",
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Desconectar",
          onPress: async () => {
            try {
              await disconnect();
              Alert.alert("Sucesso", "Desconectado do Strava");
            } catch (error) {
              Alert.alert("Erro", "Falha ao desconectar");
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator color={Colors.primary} size="large" />
            ) : user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatar}>👤</Text>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Strava Integration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integrações</Text>
          <View
            style={[
              styles.integrationCard,
              isConnected && styles.integrationConnected,
            ]}
          >
            <View style={styles.integrationHeader}>
              <Text style={styles.integrationIcon}>⛹️</Text>
              <View style={styles.integrationInfo}>
                <Text style={styles.integrationName}>Strava</Text>
                <Text style={styles.integrationStatus}>
                  {isConnected
                    ? `Conectado como ${athlete?.name ?? "Strava"}`
                    : "Não conectado"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  isConnected && styles.statusBadgeConnected,
                ]}
              >
                <Text style={styles.statusDot}>●</Text>
              </View>
            </View>

            <View style={styles.integrationActions}>
              {isConnected ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={handleStravaSync}
                  >
                    <Text style={styles.actionButtonText}>🔄 Sincronizar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    onPress={handleStravaDisconnect}
                  >
                    <Text style={styles.actionButtonText}>❌ Desconectar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={handleStravaConnect}
                >
                  <Text style={styles.actionButtonText}>🔗 Conectar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsGrid}>
            <StatItem label="Treinos" value="12" icon="🏋️" />
            <StatItem label="Total de Km" value="45.3" icon="📏" />
            <StatItem label="Calorias" value="2,840" icon="🔥" />
            <StatItem label="Semana Atual" value="5" icon="📅" />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoading}
        >
          <Text style={styles.logoutButtonText}>
            {isLoading ? "Saindo..." : "Sair da Conta"}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Sidekick v1.0.0</Text>
          <Text style={styles.footerText}>© 2026 - Seu Companheiro</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  icon: string;
}

function StatItem({ label, value, icon }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.darkCard,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    position: "relative",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.dark,
  },
  editBadgeIcon: {
    fontSize: 16,
  },
  avatar: {
    fontSize: 48,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  integrationCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  integrationConnected: {
    borderColor: Colors.success,
  },
  integrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  integrationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  integrationStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.darkBorder,
  },
  statusBadgeConnected: {
    backgroundColor: Colors.success,
  },
  statusDot: {
    fontSize: 12,
    color: Colors.darkCard,
  },
  integrationActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.darkBorder,
    alignItems: "center",
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  actionButtonDanger: {
    backgroundColor: "#8b0000",
  },
  actionButtonText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    width: "48%",
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 20,
  },
  logoutButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
    paddingVertical: 16,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
});

