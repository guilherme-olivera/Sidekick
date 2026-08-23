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
        headerShown: false,
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
        name="achievements"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendário",
          tabBarLabel: "Calendário",
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
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
    </Tabs>
  );
}
