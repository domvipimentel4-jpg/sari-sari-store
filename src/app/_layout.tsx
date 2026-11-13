import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";

const APP_TITLE = "Sari-sari Store";

// Web only: when the page is loaded or refreshed on any screen,
// go back to the start ("/") so the splash screen plays again
if (typeof window !== "undefined" && Platform.OS === "web") {
  if (window.location.pathname !== "/") {
    window.location.replace("/");
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Web only: keep the browser tab title as "Sari-sari Store"
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const g = globalThis as any;
    if (!g.document) return;

    const applyTitle = () => {
      if (g.document.title !== APP_TITLE) g.document.title = APP_TITLE;
    };

    applyTitle();

    // If the navigation library changes the title, put ours back
    const observer = g.MutationObserver
      ? new g.MutationObserver(applyTitle)
      : null;
    observer?.observe(g.document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer?.disconnect();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: APP_TITLE }} />
        <Stack.Screen name="login" options={{ title: APP_TITLE }} />
        <Stack.Screen name="(tabs)" options={{ title: APP_TITLE }} />
        <Stack.Screen name="profile" options={{ title: APP_TITLE }} />
      </Stack>
    </ThemeProvider>
  );
}
