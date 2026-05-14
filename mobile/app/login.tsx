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
} from "react-native";
import { useAuth } from "../src/contexts/AuthContext";
// O certo é subir um nível (..) e entrar em components
import { AuthInput, AuthButton, ErrorMessage, Colors } from "../components/AuthComponents";
// import { AuthInput, AuthButton, ErrorMessage, Colors } from "./AuthComponents";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");

  const { login, register, isLoading} = useAuth();
  
  const [error, setError] = useState<string | null>(null);

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
            <AuthInput
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

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

            {/* Toggle Auth Mode */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isLogin ? "Não tem conta?" : "Já tem conta?"}
              </Text>
              <AuthButton
                title={isLogin ? "Criar Conta" : "Entrar"}
                onPress={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setName("");
                }}
                variant="secondary"
              />
            </View>

            {/* Demo Credentials */}
            <View style={styles.demoContainer}>
              <Text style={styles.demoTitle}>Demo:</Text>
              <Text style={styles.demoText}>Email: athlete@sidekick.com</Text>
              <Text style={styles.demoText}>Senha: password123</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
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
});