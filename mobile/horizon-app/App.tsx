import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";

import HomeScreen from "./src/screens/HomeScreen";
import TwinScreen from "./src/screens/TwinScreen";
import ScanScreen from "./src/screens/ScanScreen";
import ActionsScreen from "./src/screens/ActionsScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          paddingBottom: 4,
          height: 56,
        },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="H" color={color} />,
        }}
      />
      <Tab.Screen
        name="Twin"
        component={TwinScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="T" color={color} />,
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="S" color={color} />,
        }}
      />
      <Tab.Screen
        name="Actions"
        component={ActionsScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="A" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return (
    <Text style={{ fontSize: 16, fontWeight: "700", color }}>{label}</Text>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#ffffff" },
          headerTintColor: "#1e293b",
          headerTitleStyle: { fontWeight: "600", fontSize: 17 },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Main"
          component={HomeTabs}
          options={{ headerTitle: "Horizon", headerLargeTitle: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
