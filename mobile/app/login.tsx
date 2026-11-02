import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
} from "react-native";
import { useAuth } from "../src/contexts/AuthContext";
import { API_BASE_URL } from "../src/services/apiService";
import { AuthInput, AuthButton, ErrorMessage, Colors } from "../components/AuthComponents";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slowServerHint, setSlowServerHint] = useState(false);

  const { login, register } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Estados de recuperação de senha
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPasswordForReset, setNewPasswordForReset] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);

  const triggerForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert("Erro", "Por favor, digite o e-mail.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      Alert.alert("Erro", "Formato de e-mail inválido. Ex: nome@provedor.com");
      return;
    }

    setIsForgotPasswordLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setShowResetForm(true);
        if (data.mockCode) {
          Alert.alert(
            "📧 E-mail Enviado com Sucesso!",
            `O e-mail contendo o código de recuperação foi enviado!\n\n⏱️ Validade: 30 minutos (Uso Único)\n\n[CÓDIGO MOCK DE TESTE: ${data.mockCode}]`,
            [{ text: "Inserir Código", onPress: () => setRecoveryCode(data.mockCode) }]
          );
        } else {
          Alert.alert(
            "📧 E-mail Enviado com Sucesso!",
            data.message ||
              "Enviamos um código de 6 dígitos para o seu e-mail. Ele tem validade de 30 minutos e só pode ser usado uma vez."
          );
        }
      } else {
        Alert.alert("Erro", data.error || "Erro ao solicitar recuperação.");
      }
    } catch (err) {
      console.warn("Forgot password error:", err);
      Alert.alert("Erro", "Erro ao se conectar ao servidor.");
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const triggerResetPassword = async () => {
    if (!recoveryCode || !newPasswordForReset || !confirmNewPassword) {
      Alert.alert("Erro", "Código, nova senha e confirmação são obrigatórios.");
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passwordRegex.test(newPasswordForReset)) {
      Alert.alert(
        "Erro",
        "A nova senha deve conter no mínimo 6 caracteres, uma letra maiúscula e um caractere especial."
      );
      return;
    }

    if (newPasswordForReset !== confirmNewPassword) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }

    setIsForgotPasswordLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          code: recoveryCode,
          newPassword: newPasswordForReset,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          "Sucesso",
          "Sua senha foi alterada com sucesso! Um e-mail de confirmação foi enviado para a sua caixa de entrada."
        );
        setForgotPasswordModalVisible(false);
        setForgotEmail("");
        setRecoveryCode("");
        setNewPasswordForReset("");
        setConfirmNewPassword("");
        setShowResetForm(false);
        setPassword(newPasswordForReset);
      } else {
        Alert.alert("Erro", data.error || "Erro ao alterar a senha.");
      }
    } catch (err) {
      console.warn("Reset password error:", err);
      Alert.alert("Erro", "Erro ao se conectar ao servidor.");
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleAuth = async () => {
    if (isSubmitting) return;
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Formato de e-mail inválido. Ex: nome@provedor.com");
      return;
    }

    if (!isLogin) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
      if (!passwordRegex.test(password)) {
        setError(
          "A senha deve conter no mínimo 6 caracteres, uma letra maiúscula e um caractere especial."
        );
        return;
      }
      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }
    }

    setIsSubmitting(true);
    setSlowServerHint(false);
    const slowTimer = setTimeout(() => {
      setSlowServerHint(true);
    }, 3500);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (isLogin) {
        await login(cleanEmail, password);
      } else {
        await register(cleanEmail, password, name.trim());
      }
    } catch (err) {
      console.warn("Auth error:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Erro ao realizar autenticação. Por favor, tente novamente.";
      setError(errMsg);
    } finally {
      clearTimeout(slowTimer);
      setSlowServerHint(false);
      setIsSubmitting(false);
    }
  };

  const isFormValid = isLogin
    ? Boolean(email && password)
    : Boolean(email && password && confirmPassword && name.trim());

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Logo/Header */}
              <View style={styles.header}>
                <Image
                  source={require("../assets/images/sidekick-logo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.title}>Sidekick</Text>
                <Text style={styles.subtitle}>Seu companheiro de jornada</Text>
              </View>

              {/* Form Container */}
              <View style={styles.formContainer}>
                {!isLogin && (
                  <AuthInput
                    placeholder="Seu nome"
                    value={name}
                    onChangeText={setName}
                  />
                )}

                <AuthInput
                  placeholder="E-mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <View style={{ position: "relative", width: "100%" }}>
                  <AuthInput
                    placeholder="Senha"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      right: 16,
                      height: 50,
                      justifyContent: "center",
                      top: 10,
                    }}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: Colors.textSecondary,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {!isLogin && (
                  <View style={{ position: "relative", width: "100%" }}>
                    <AuthInput
                      placeholder="Confirme a senha"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                )}

                {!isLogin && (
                  <Text style={styles.passwordHint}>
                    * A senha deve conter no mínimo 6 caracteres, uma letra
                    maiúscula e um caractere especial (ex: !, @, #, $, %).
                  </Text>
                )}

                {isLogin && (
                  <TouchableOpacity
                    style={{
                      alignSelf: "flex-end",
                      marginTop: 4,
                      marginBottom: 12,
                      marginRight: 4,
                    }}
                    onPress={() => {
                      setForgotEmail(email);
                      setForgotPasswordModalVisible(true);
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.primary,
                        fontSize: 13,
                        textDecorationLine: "underline",
                      }}
                    >
                      Esqueci minha senha
                    </Text>
                  </TouchableOpacity>
                )}

                {slowServerHint && (
                  <View style={styles.slowServerBanner}>
                    <Text style={styles.slowServerText}>
                      ⏳ Conectando ao servidor Sidekick, aguarde alguns
                      segundos...
                    </Text>
                  </View>
                )}

                <ErrorMessage message={error || undefined} />

                <AuthButton
                  title={isLogin ? "Entrar" : "Criar Conta"}
                  onPress={handleAuth}
                  loading={isSubmitting}
                  disabled={!isFormValid || isSubmitting}
                />

                {!isLogin && (
                  <Text style={styles.legalFooterText}>
                    Ao criar sua conta, você concorda com nossos{" "}
                    <Text
                      style={styles.legalLink}
                      onPress={() =>
                        Linking.openURL(`${API_BASE_URL}/terms.html`)
                      }
                    >
                      Termos de Uso
                    </Text>{" "}
                    e{" "}
                    <Text
                      style={styles.legalLink}
                      onPress={() =>
                        Linking.openURL(`${API_BASE_URL}/privacy.html`)
                      }
                    >
                      Política de Privacidade
                    </Text>
                    .
                  </Text>
                )}

                <View style={styles.toggleContainer}>
                  {isLogin ? (
                    <Text style={styles.toggleText}>
                      Não tem conta?{" "}
                      <Text
                        style={styles.linkText}
                        onPress={() => {
                          setIsLogin(false);
                          setError(null);
                          setName("");
                        }}
                      >
                        Criar agora
                      </Text>
                    </Text>
                  ) : (
                    <Text style={styles.toggleText}>
                      Já tem conta?{" "}
                      <Text
                        style={styles.linkText}
                        onPress={() => {
                          setIsLogin(true);
                          setError(null);
                        }}
                      >
                        Entrar na conta
                      </Text>
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotPasswordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setForgotPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Recuperar Senha 🔑</Text>

                {!showResetForm ? (
                  <>
                    <Text style={styles.modalSubtitle}>
                      Digite seu e-mail para receber o código de verificação e
                      redefinir sua senha.
                    </Text>
                    <AuthInput
                      placeholder="E-mail cadastrado"
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnCancel]}
                        onPress={() => setForgotPasswordModalVisible(false)}
                      >
                        <Text style={styles.modalBtnCancelText}>Voltar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnConfirm]}
                        onPress={triggerForgotPassword}
                        disabled={isForgotPasswordLoading}
                      >
                        <Text style={styles.modalBtnConfirmText}>
                          {isForgotPasswordLoading
                            ? "Enviando..."
                            : "Enviar Código"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalSubtitle}>
                      Digite o código de 6 dígitos que você recebeu e crie sua
                      nova senha de acesso.
                    </Text>
                    <AuthInput
                      placeholder="Código de verificação"
                      value={recoveryCode}
                      onChangeText={setRecoveryCode}
                      keyboardType="number-pad"
                    />
                    <AuthInput
                      placeholder="Nova Senha"
                      value={newPasswordForReset}
                      onChangeText={setNewPasswordForReset}
                      secureTextEntry={true}
                    />
                    <AuthInput
                      placeholder="Confirme a Nova Senha"
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry={true}
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnCancel]}
                        onPress={() => {
                          setForgotPasswordModalVisible(false);
                          setShowResetForm(false);
                          setRecoveryCode("");
                          setNewPasswordForReset("");
                          setConfirmNewPassword("");
                        }}
                      >
                        <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnConfirm]}
                        onPress={triggerResetPassword}
                        disabled={isForgotPasswordLoading}
                      >
                        <Text style={styles.modalBtnConfirmText}>
                          {isForgotPasswordLoading ? "Aguarde..." : "Confirmar"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 32,
  },
  logoImage: {
    width: 280,
    height: 95,
    marginBottom: 5,
    alignSelf: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  formContainer: {
    marginBottom: 40,
  },
  slowServerBanner: {
    backgroundColor: "rgba(255, 169, 77, 0.12)",
    borderColor: "rgba(255, 169, 77, 0.35)",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  slowServerText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  legalFooterText: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
  },
  legalLink: {
    color: Colors.primary,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  toggleContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  toggleText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    marginRight: 8,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.primary,
  },
  modalBtnCancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  modalBtnConfirmText: {
    color: "#0B0F17",
    fontSize: 14,
    fontWeight: "700",
  },
  passwordHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
});
