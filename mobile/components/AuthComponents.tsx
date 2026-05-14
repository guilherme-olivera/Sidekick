import React from "react";
import {
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";

// Dark Mode Colors
export const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  primaryLight: "#ff8787",
  success: "#51cf66",
  error: "#ff6b6b",
};

const styles = StyleSheet.create({
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginVertical: 10,
    backgroundColor: Colors.darkCard,
    color: Colors.text,
    fontSize: 16,
  },
  inputPlaceholder: {
    color: Colors.textSecondary,
  },
  button: {
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 8,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.darkBorder,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});

interface AuthInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
}

export function AuthInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
}: AuthInputProps) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={Colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
    />
  );
}

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

export function AuthButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: AuthButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";

  return (
    <TouchableOpacity
      style={[
        isPrimary ? styles.button : styles.secondaryButton,
        isDisabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? Colors.text : Colors.primary} />
      ) : (
        <Text style={isPrimary ? styles.buttonText : styles.secondaryButtonText}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

interface ErrorMessageProps {
  message?: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return <Text style={styles.errorText}>{message}</Text>;
}
