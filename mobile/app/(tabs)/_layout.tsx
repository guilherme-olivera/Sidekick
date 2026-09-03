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
          bottom: Platform.OS === "ios" ? 22 : 14,
          left: 65,
          right: 65,
          height: 54,
          borderRadius: 27,
          backgroundColor: "rgba(18, 18, 22, 0.95)",
          borderWidth: 1.5,
          borderColor: "rgba(255, 107, 107, 0.3)",
          borderTopWidth: 1.5,
          borderTopColor: "rgba(255, 107, 107, 0.3)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
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
              <FontAwesome name="home" size={20} color={color} />
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
              <FontAwesome name="calendar" size={18} color={color} />
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
              <FontAwesome name="user" size={18} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Platform.OS === "ios" ? 10 : 0,
  },
  iconWrapperActive: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
  },
});
