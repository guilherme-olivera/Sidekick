import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

const DarkTheme = {
  dark: true,
  colors: {
    primary: "#ff6b6b",
    background: "#0a0a0a",
    card: "#1a1a1a",
    text: "#ffffff",
    border: "#333333",
    notification: "#ff6b6b",
  },
};

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#ff6b6b",
        tabBarInactiveTintColor: "#b0b0b0",
        tabBarStyle: {
          backgroundColor: DarkTheme.colors.card,
          borderTopColor: DarkTheme.colors.border,
          paddingBottom: Platform.OS === "ios" ? 8 : 0,
        },
        headerStyle: {
          backgroundColor: DarkTheme.colors.card,
          borderBottomColor: DarkTheme.colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: DarkTheme.colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarLabel: "Início",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Histórico",
          tabBarLabel: "Histórico",
          tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: "Perfil",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Configurações",
          tabBarLabel: "Configurações",
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
