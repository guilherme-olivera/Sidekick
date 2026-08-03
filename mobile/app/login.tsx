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
} from "react-native";
import { useAuth } from "../src/contexts/AuthContext";
// O certo é subir um nível (..) e entrar em components
import { AuthInput, AuthButton, ErrorMessage, Colors } from "../components/AuthComponents";
// import { AuthInput, AuthButton, ErrorMessage, Colors } from "./AuthComponents";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("adm@adm.com");
  const [password, setPassword] = useState("adm123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");

  const { login, register, isLoading} = useAuth();
  
  const [error, setError] = useState<string | null>(null);

  // Estados de recuperação de senha
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPasswordForReset, setNewPasswordForReset] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);

  const triggerForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert("Erro", "Por favor, digite o e-mail.");
      return;
    }
    
    setIsForgotPasswordLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.15.11:3000'}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setShowResetForm(true);
        if (data.mockCode) {
          Alert.alert(
            "Código Enviado",
            `Enviamos um código de 6 dígitos.\n\n[CÓDIGO MOCK PARA TESTES: ${data.mockCode}]`,
            [{ text: "Copiar Código", onPress: () => setRecoveryCode(data.mockCode) }]
          );
        } else {
          Alert.alert("Sucesso", "Se o e-mail estiver cadastrado, você receberá o código.");
        }
      } else {
        Alert.alert("Erro", data.error || "Erro ao solicitar recuperação.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Erro ao se conectar ao servidor.");
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const triggerResetPassword = async () => {
    if (!recoveryCode || !newPasswordForReset) {
      Alert.alert("Erro", "Código e nova senha são obrigatórios.");
      return;
    }
    
    setIsForgotPasswordLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.15.11:3000'}/api/auth/reset-password`, {
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
        Alert.alert("Sucesso", "Senha alterada com sucesso! Entre com sua nova senha.");
        setForgotPasswordModalVisible(false);
        setForgotEmail("");
        setRecoveryCode("");
        setNewPasswordForReset("");
        setShowResetForm(false);
        setPassword(newPasswordForReset); // auto-fill password
      } else {
        Alert.alert("Erro", data.error || "Erro ao alterar a senha.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Erro ao se conectar ao servidor.");
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleAuth = async () => {
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      // Navigation será feito automaticamente pelo App.tsx quando token existir
    } catch (err) {
      // Erro já está no contexto
      console.error("Auth error:", err);
      setError("Erro ao realizar autenticação. Por favor, tente novamente.");
    }
  };

  const isFormValid = isLogin
    ? email && password
    : email && password && name;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Logo/Header */}
            <View style={styles.header}>            
              <Image
                  source={require('../assets/images/sidekick-logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
              />
              <Text style={styles.title}>Sidekick</Text>
              <Text style={styles.subtitle}>Seu companheiro de jornada</Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <AuthInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
              />

              {/* Password Input */}
              <View style={{ position: 'relative', width: '100%' }}>
                <AuthInput
                  placeholder="Senha"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 16,
                    height: 50,
                    justifyContent: 'center',
                    top: 10,
                  }}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: Colors.textSecondary, fontSize: 18 }}>
                    {showPassword ? "👁️" : "🙈"}
                  </Text>
                </TouchableOpacity>
              </View>

              {isLogin && (
                <TouchableOpacity
                  style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 12, marginRight: 4 }}
                  onPress={() => {
                    setForgotEmail(email); // pre-fill with email typed so far
                    setForgotPasswordModalVisible(true);
                  }}
                >
                  <Text style={{ color: Colors.primary, fontSize: 13, textDecorationLine: 'underline' }}>
                    Esqueci minha senha
                  </Text>
                </TouchableOpacity>
              )}

              {/* Name Input (only for register) */}
              {!isLogin && (
                <AuthInput
                  placeholder="Seu nome"
                  value={name}
                  onChangeText={setName}
                />
              )}

              {/* Error Message */}
              <ErrorMessage message={error || undefined} />

              {/* Submit Button */}
              <AuthButton
                title={isLogin ? "Entrar" : "Criar Conta"}
                onPress={handleAuth}
                loading={isLoading}
                disabled={!isFormValid}
              />

              {/* Toggle Auth Mode with inline link */}
              <View style={styles.toggleContainer}>
                {isLogin ? (
                  <Text style={styles.toggleText}>
                    Não tem conta?{' '}
                    <Text
                      style={styles.linkText}
                      onPress={() => {
                        setIsLogin(false);
                        setError(null);
                        setName("");
                      }}
                    >
                      clique aqui
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.toggleText}>
                    Já tem conta?{' '}
                    <Text
                      style={styles.linkText}
                      onPress={() => {
                        setIsLogin(true);
                        setError(null);
                      }}
                    >
                      clique aqui
                    </Text>
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

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
                      Digite seu e-mail para receber o código de verificação e redefinir sua senha.
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
                          {isForgotPasswordLoading ? "Enviando..." : "Enviar Código"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalSubtitle}>
                      Digite o código de 6 dígitos que você recebeu e crie sua nova senha de acesso.
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
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnCancel]}
                        onPress={() => setShowResetForm(false)}
                      >
                        <Text style={styles.modalBtnCancelText}>Alterar E-mail</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnConfirm]}
                        onPress={triggerResetPassword}
                        disabled={isForgotPasswordLoading}
                      >
                        <Text style={styles.modalBtnConfirmText}>
                          {isForgotPasswordLoading ? "Aguarde..." : "Confirmar Nova Senha"}
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
    </TouchableWithoutFeedback>
  );
}

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: Colors.dark,
//   },
//   scrollContent: {
//     flexGrow: 1,
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     paddingVertical: 20,
//   },
//   header: {
//     alignItems: "center",
//     marginTop: 40,
//     marginBottom: 60,
//   },
//   logo: {
//     fontSize: 64,
//     marginBottom: 16,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: "700",
//     color: Colors.text,
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: Colors.textSecondary,
//   },
//   formContainer: {
//     marginBottom: 40,
//   },
//   toggleContainer: {
//     marginTop: 30,
//     alignItems: "center",
//   },
//   toggleText: {
//     color: Colors.textSecondary,
//     fontSize: 14,
//     marginBottom: 12,
//   },
//   demoContainer: {
//     marginTop: 30,
//     padding: 16,
//     backgroundColor: Colors.darkCard,
//     borderRadius: 12,
//     borderLeftWidth: 4,
//     borderLeftColor: Colors.primary,
//   },
//   demoTitle: {
//     color: Colors.primary,
//     fontSize: 14,
//     fontWeight: "600",
//     marginBottom: 8,
//   },
//   demoText: {
//     color: Colors.textSecondary,
//     fontSize: 12,
//     marginBottom: 4,
//   },
// });
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
    alignItems: 'center',
    marginTop: 80,       // Aumentei para o logo não ficar colado no topo do iPhone
    marginBottom: 40,
  },
  // Mudamos de 'logo' para 'logoImage'
    logoImage: {
    width: 300,          // Quase o triplo do tamanho atual na imagem
    height: 100,
    marginBottom: 5,    // Mais espaço para o título respirar
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  formContainer: {
    marginBottom: 40,
  },
  toggleContainer: {
    marginTop: 30,
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
    textDecorationLine: 'underline',
  },
  demoContainer: {
    marginTop: 30,
    padding: 16,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  demoTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  demoText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
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
    color: "#0a0a0c",
    fontSize: 14,
    fontWeight: "700",
  },
});