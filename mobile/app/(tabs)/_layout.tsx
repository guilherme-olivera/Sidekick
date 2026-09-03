import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { Platform, View, StyleSheet } from "react-native";

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

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#ff6b6b",
        tabBarInactiveTintColor: "#888888",
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 28 : 16,
          left: 45,
          right: 45,
          height: 62,
          borderRadius: 31,
          backgroundColor: "rgba(18, 18, 22, 0.95)",
          borderWidth: 1.5,
          borderColor: "rgba(255, 107, 107, 0.3)",
          borderTopWidth: 1.5,
          borderTopColor: "rgba(255, 107, 107, 0.3)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
          elevation: 12,
          paddingBottom: 0,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <FontAwesome name="home" size={22} color={color} />
            </View>
          ),
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
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <FontAwesome name="calendar" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <FontAwesome name="user" size={20} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Platform.OS === "ios" ? 14 : 0,
  },
  iconWrapperActive: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
  },
});
