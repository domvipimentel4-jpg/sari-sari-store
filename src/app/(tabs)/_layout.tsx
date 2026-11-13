import { Tabs } from "expo-router";

import { Brand } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: Brand.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
        tabBarIconStyle: { display: "none" },
        tabBarStyle: {
          backgroundColor: Brand.card,
          borderTopColor: Brand.border,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Sari-sari Store", tabBarLabel: "Dashboard" }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: "Sari-sari Store", tabBarLabel: "Inventory" }}
      />
      <Tabs.Screen
        name="credit"
        options={{ title: "Sari-sari Store", tabBarLabel: "Credit" }}
      />
    </Tabs>
  );
}
