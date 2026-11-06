import { useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { Brand, Spacing } from "@/constants/theme";

export type Field = {
  key: string;
  label: string;
  placeholder?: string;
  numeric?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  fields: Field[];
  onClose: () => void;
  // Return an error message to show, or null if saved OK
  onSubmit: (values: Record<string, string>) => Promise<string | null>;
};

export default function AddModal({
  visible,
  title,
  fields,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  function close() {
    setValues({});
    setError("");
    onClose();
  }

  async function save() {
    const err = await onSubmit(values);
    if (err) {
      setError(err);
      return;
    }
    close();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>

          {fields.map((f) => (
            <View key={f.key}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor={Brand.textMuted}
                keyboardType={f.numeric ? "numeric" : "default"}
                value={values[f.key] ?? ""}
                onChangeText={(t) => setValues({ ...values, [f.key]: t })}
              />
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.row}>
            <Pressable style={styles.cancel} onPress={close}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.save} onPress={save}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: Spacing.four,
  },
  sheet: {
    backgroundColor: Brand.card,
    borderRadius: 20,
    padding: Spacing.four,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
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
    paddingHorizontal: Spacing.three,
    height: 46,
    fontSize: 14,
    color: Brand.text,
  },
  error: { color: "#C0392B", fontSize: 12, marginTop: Spacing.two },
  row: { flexDirection: "row", gap: Spacing.two, marginTop: Spacing.four },
  cancel: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: Brand.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: Brand.text, fontWeight: "600" },
  save: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: Brand.primaryText, fontWeight: "700" },
});
