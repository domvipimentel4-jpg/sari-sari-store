import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Brand, Spacing } from "@/constants/theme";
import { login, registerStore } from "@/lib/auth";

type Tab = "login" | "register";

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("login");

  // Login fields
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Register fields
  const [storeName, setStoreName] = useState("");
  const [regOwner, setRegOwner] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setError("");
    setSuccess("");
  }

  async function handleLogin() {
    setError("");
    setSuccess("");

    if (mobile.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (pin.length !== 4) {
      setError("PIN must be 4 digits.");
      return;
    }

    const ok = await login(mobile, pin);
    if (!ok) {
      setError("Wrong mobile number or PIN.");
      return;
    }

    router.replace("/inventory");
  }

  async function handleRegister() {
    setError("");
    setSuccess("");

    if (storeName.trim().length === 0) {
      setError("Enter your store name.");
      return;
    }
    if (regOwner.trim().length === 0) {
      setError("Enter the owner's full name.");
      return;
    }
    if (regAddress.trim().length === 0) {
      setError("Enter your store address.");
      return;
    }
    if (regMobile.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (regPin.length !== 4) {
      setError("PIN must be 4 digits.");
      return;
    }
    if (regPin !== regConfirm) {
      setError("PINs do not match.");
      return;
    }

    const result = await registerStore({
      storeName: storeName.trim(),
      ownerName: regOwner.trim(),
      address: regAddress.trim(),
      mobile: regMobile,
      pin: regPin,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Go back to Log In with the new number filled in
    setMobile(regMobile);
    setPin("");
    setStoreName("");
    setRegOwner("");
    setRegAddress("");
    setRegMobile("");
    setRegPin("");
    setRegConfirm("");
    setActiveTab("login");
    setSuccess("Store registered! You can now log in.");
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      <Text style={styles.title}>Sari-sari Store</Text>
      <Text style={styles.subtitle}>
        Simple Store Inventory & Customer Credit Ledger
      </Text>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: Brand.accentGreen }]}>
          <Text style={[styles.pillText, { color: Brand.accentGreenText }]}>
            Track Credit & Sales
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: Brand.inputBg }]}>
          <Text style={[styles.pillText, { color: Brand.primary }]}>
            Works Offline
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.pill,
          { backgroundColor: Brand.accentOrange, marginTop: Spacing.two },
        ]}
      >
        <Text style={[styles.pillText, { color: Brand.accentOrangeText }]}>
          For Your Store
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.tabRow}>
          <Pressable
            style={[
              styles.tabButton,
              activeTab === "login" && styles.tabButtonActive,
            ]}
            onPress={() => switchTab("login")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "login" && styles.tabTextActive,
              ]}
            >
              Log In
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tabButton,
              activeTab === "register" && styles.tabButtonActive,
            ]}
            onPress={() => switchTab("register")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "register" && styles.tabTextActive,
              ]}
            >
              Register Store
            </Text>
          </Pressable>
        </View>

        {activeTab === "login" ? (
          <>
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <View style={styles.labelRow}>
              <Text style={styles.label}>Mobile Number</Text>
              <Text style={styles.hintText}>Gcash / Sim</Text>
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>PH +63</Text>
              <TextInput
                style={styles.input}
                placeholder="917 123 4567"
                placeholderTextColor={Brand.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                value={mobile}
                onChangeText={(t) => setMobile(t.replace(/\D/g, ""))}
              />
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.label}>4-Digit Store PIN</Text>
              <Pressable>
                <Text style={styles.linkText}>Forgot PIN?</Text>
              </Pressable>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="••••"
                placeholderTextColor={Brand.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry={!showPin}
                value={pin}
                onChangeText={(t) => setPin(t.replace(/\D/g, ""))}
              />
              <Pressable onPress={() => setShowPin(!showPin)}>
                <Text style={styles.eyeIcon}>{showPin ? "🙈" : "👁"}</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={styles.checkboxRow}
              onPress={() => setRememberDevice(!rememberDevice)}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberDevice && styles.checkboxChecked,
                ]}
              >
                {rememberDevice && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Remember this device</Text>
              <Text style={styles.linkText}>🛡 Secure</Text>
            </Pressable>

            <Pressable style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Log In →</Text>
            </Pressable>

            <Text style={styles.orText}>or</Text>

            <Pressable
              style={styles.registerButton}
              onPress={() => switchTab("register")}
            >
              <Text style={styles.registerButtonText}>Register Store</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.otpButton}>
              <Text style={styles.otpButtonText}>Log in with SMS OTP</Text>
            </Pressable>

            <Pressable style={styles.googleButton}>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Store Name</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Aling Nena's Store"
                placeholderTextColor={Brand.textMuted}
                value={storeName}
                onChangeText={setStoreName}
              />
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.label}>Owner Full Name</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maria Santos"
                placeholderTextColor={Brand.textMuted}
                value={regOwner}
                onChangeText={setRegOwner}
              />
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.label}>Store Address</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Brgy. San Antonio, Pasig City"
                placeholderTextColor={Brand.textMuted}
                value={regAddress}
                onChangeText={setRegAddress}
              />
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.label}>Mobile Number</Text>
              <Text style={styles.hintText}>Gcash / Sim</Text>
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>PH +63</Text>
              <TextInput
                style={styles.input}
                placeholder="917 123 4567"
                placeholderTextColor={Brand.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                value={regMobile}
                onChangeText={(t) => setRegMobile(t.replace(/\D/g, ""))}
              />
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.label}>Create 4-Digit Store PIN</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="••••"
                placeholderTextColor={Brand.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={regPin}
                onChangeText={(t) => setRegPin(t.replace(/\D/g, ""))}
              />
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.label}>Confirm PIN</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="••••"
                placeholderTextColor={Brand.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={regConfirm}
                onChangeText={(t) => setRegConfirm(t.replace(/\D/g, ""))}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={styles.loginButton} onPress={handleRegister}>
              <Text style={styles.loginButtonText}>Register Store →</Text>
            </Pressable>

            <Text style={styles.orText}>or</Text>

            <Pressable
              style={styles.registerButton}
              onPress={() => switchTab("login")}
            >
              <Text style={styles.registerButtonText}>Back to Log In</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.backupText}>100% Secure • Daily Cloud Backup</Text>

      <View style={styles.langRow}>
        <Text style={styles.langActive}>English</Text>
        <Text style={styles.langDot}>•</Text>
        <Text style={styles.langInactive}>Filipino</Text>
      </View>

      <Text style={styles.termsText}>
        By continuing, you agree to Sari-sari Store's Terms of Service and
        Privacy Policy.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.five,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Brand.text,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 13,
    color: Brand.textMuted,
    textAlign: "center",
    marginBottom: Spacing.three,
  },
  pillRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: Brand.card,
    borderRadius: 20,
    padding: Spacing.four,
    marginTop: Spacing.five,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: Brand.inputBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.four,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: "center",
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: Brand.card,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.textMuted,
  },
  tabTextActive: {
    color: Brand.text,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.text,
    marginBottom: Spacing.one,
  },
  hintText: {
    fontSize: 11,
    color: Brand.textMuted,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.inputBg,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    height: 48,
  },
  prefix: {
    fontSize: 14,
    color: Brand.textMuted,
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Brand.text,
  },
  eyeIcon: {
    fontSize: 16,
  },
  errorText: {
    color: "#C0392B",
    fontSize: 12,
    marginTop: Spacing.two,
  },
  successText: {
    color: Brand.success,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.one,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: Brand.text,
  },
  linkText: {
    fontSize: 12,
    color: Brand.link,
  },
  loginButton: {
    backgroundColor: Brand.primary,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.four,
  },
  loginButtonText: {
    color: Brand.primaryText,
    fontWeight: "700",
    fontSize: 15,
  },
  orText: {
    textAlign: "center",
    color: Brand.textMuted,
    fontSize: 12,
    marginVertical: Spacing.two,
  },
  registerButton: {
    backgroundColor: Brand.inputBg,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonText: {
    color: Brand.text,
    fontWeight: "600",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.border,
    marginVertical: Spacing.four,
  },
  otpButton: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two,
  },
  otpButtonText: {
    color: Brand.text,
    fontSize: 13,
    fontWeight: "600",
  },
  googleButton: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    color: Brand.text,
    fontSize: 13,
    fontWeight: "600",
  },
  backupText: {
    fontSize: 11,
    color: Brand.textMuted,
    marginTop: Spacing.four,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  langActive: {
    fontSize: 12,
    color: Brand.primary,
    fontWeight: "600",
  },
  langDot: {
    color: Brand.textMuted,
  },
  langInactive: {
    fontSize: 12,
    color: Brand.textMuted,
  },
  termsText: {
    fontSize: 10,
    color: Brand.textMuted,
    textAlign: "center",
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
