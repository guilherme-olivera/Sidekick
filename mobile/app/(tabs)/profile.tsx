import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@/src/contexts/AuthContext";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
};

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();

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
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>👤</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
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

        {/* Achievements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conquistas</Text>
          <View style={styles.achievementsContainer}>
            <AchievementBadge icon="🏅" label="Iniciante" desc="5 treinos" />
            <AchievementBadge icon="🔥" label="Sequência 5+" desc="5 dias" />
            <AchievementBadge icon="💪" label="Forte" desc="10km+" />
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          <SettingItem
            icon="🔔"
            label="Notificações"
            value="Ativadas"
          />
          <SettingItem
            icon="🌙"
            label="Tema"
            value="Dark Mode"
          />
          <SettingItem
            icon="📊"
            label="Privacidade"
            value="Configurar"
          />
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

interface AchievementBadgeProps {
  icon: string;
  label: string;
  desc: string;
}

function AchievementBadge({ icon, label, desc }: AchievementBadgeProps) {
  return (
    <View style={styles.achievementBadge}>
      <Text style={styles.achievementIcon}>{icon}</Text>
      <View style={styles.achievementContent}>
        <Text style={styles.achievementLabel}>{label}</Text>
        <Text style={styles.achievementDesc}>{desc}</Text>
      </View>
    </View>
  );
}

interface SettingItemProps {
  icon: string;
  label: string;
  value: string;
}

function SettingItem({ icon, label, value }: SettingItemProps) {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Text style={styles.settingValue}>{value}</Text>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.darkCard,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatar: {
    fontSize: 40,
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
  achievementsContainer: {
    gap: 12,
  },
  achievementBadge: {
    flexDirection: "row",
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  achievementIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  achievementDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  settingValue: {
    color: Colors.textSecondary,
    fontSize: 12,
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
