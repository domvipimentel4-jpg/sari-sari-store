import { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { Brand, Spacing } from "@/constants/theme";

export type ModalField = {
  key: string;
  label: string;
  initial?: string;
  placeholder?: string;
  secure?: boolean;
  digitsOnly?: boolean;
  maxLength?: number;
};

type Props = {
  visible: boolean;
  title: string;
  fields: ModalField[];
  onCancel: () => void;
  // Return an error message to show, or null when saving worked
  onSave: (values: Record<string, string>) => Promise<string | null>;
};

export default function EditModal({
  visible,
  title,
  fields,
  onCancel,
  onSave,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Start fresh every time the popup opens
  useEffect(() => {
    if (visible) {
      const start: Record<string, string> = {};
      fields.forEach((f) => {
        start[f.key] = f.initial ?? "";
      });
      setValues(start);
      setError("");
      setSaving(false);
    }
  }, [visible]);

  async function handleSave() {
    setSaving(true);
    setError("");
    const message = await onSave(values);
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>

          {fields.map((f) => (
            <View key={f.key}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                placeholderTextColor={Brand.textMuted}
                secureTextEntry={f.secure}
                keyboardType={f.digitsOnly ? "number-pad" : "default"}
                maxLength={f.maxLength}
                onChangeText={(t) =>
                  setValues((prev) => ({
                    ...prev,
                    [f.key]: f.digitsOnly ? t.replace(/\D/g, "") : t,
                  }))
                }
              />
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.cancel]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.save]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: Spacing.four,
  },
  box: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: Brand.card,
    borderRadius: 20,
    padding: Spacing.four,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Brand.text,
    marginBottom: Spacing.two,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.text,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  input: {
    backgroundColor: Brand.inputBg,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    color: Brand.text,
  },
  error: {
    color: "#C0392B",
    fontSize: 12,
    marginTop: Spacing.three,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: {
    backgroundColor: Brand.inputBg,
  },
  cancelText: {
    color: Brand.text,
    fontWeight: "600",
  },
  save: {
    backgroundColor: Brand.primary,
  },
  saveText: {
    color: Brand.primaryText,
    fontWeight: "700",
  },
});
