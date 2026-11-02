import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { Platform, View, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TAB_BAR_WIDTH = 180;
const TAB_BAR_LEFT = (SCREEN_WIDTH - TAB_BAR_WIDTH) / 2;

const DarkTheme = {
  dark: true,
  colors: {
    primary: "#FF5A36",
    background: "#0B0F17",
    card: "#131924",
    text: "#F8FAFC",
    border: "#222B3B",
    notification: "#FF5A36",
  },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomMargin = insets.bottom > 0 ? insets.bottom + 10 : (Platform.OS === "ios" ? 24 : 20);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FF5A36",
        tabBarInactiveTintColor: "#64748B",
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: bottomMargin,
          left: 44,
          right: 44,
          height: 56,
          borderRadius: 28,
          backgroundColor: "rgba(19, 25, 36, 0.96)",
          borderWidth: 1.5,
          borderColor: "rgba(255, 90, 54, 0.32)",
          borderTopWidth: 1.5,
          borderTopColor: "rgba(255, 90, 54, 0.32)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 12,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          height: 53,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 0,
          margin: 0,
        },
        tabBarIconStyle: {
          width: 40,
          height: 40,
          justifyContent: "center",
          alignItems: "center",
          margin: 0,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapperActive: {
    backgroundColor: "rgba(255, 90, 54, 0.18)",
  },
});
