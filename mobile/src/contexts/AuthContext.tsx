import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserProfile {
  trainingGoal?: string;
  focusArea?: string;
  injuryNote?: string;
  availableTime?: string;
  trainingMood?: string;
  aiGender?: string;
  aiPersonality?: string;
  aiTone?: string;
  birthday?: string;
  goalType?: string;
  goalDistance?: string;
  goalTargetTime?: string;
  experienceLevel?: string;
  weeklyFrequency?: number;
  isConfigured?: boolean;
  companionName?: string;
  companionAvatar?: string;
  phoneNumber?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  planType?: string;
  stravaAthleteName?: string;
  stravaAthleteUsername?: string;
  stravaAthleteProfile?: string;
  profile?: UserProfile;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore token on app startup
  useEffect(() => {
    restoreToken();
  }, []);

  const clearAuthState = async () => {
    try {
      const { setAuthToken } = await import("../services/apiService");
      setAuthToken(null);
    } catch (e) {
      console.warn("Failed to clear auth token cache:", e);
    }
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("@sidekick:chat_history");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { apiService } = await import("../services/apiService");
      const response = await apiService.get("/auth/me");
      if (response && response.success && response.user) {
        setUser(response.user);
        await AsyncStorage.setItem("user", JSON.stringify(response.user));
        return true;
      }
    } catch (err: any) {
      console.error("Failed to refresh user:", err);
      // Apenas desloga se o erro for explicitamente 401 (não autorizado/token inválido ou expirado)
      // Evita deslogar o usuário por falhas de rede temporárias ou servidor dormindo na Render
      if (err && err.status === 401) {
        await clearAuthState();
      }
    }
    return false;
  };

  const restoreToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem("authToken");
      const savedUser = await AsyncStorage.getItem("user");

      if (savedToken) {
        try {
          const { setAuthToken } = await import("../services/apiService");
          setAuthToken(savedToken);
        } catch (e) {
          console.warn("Failed to restore auth token cache:", e);
        }
        setToken(savedToken);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        // Tenta atualizar em segundo plano. Se falhar por token expirado, refreshUser já limpa o estado.
        // Se falhar por conexão/rede, mantemos o token e usuário salvos localmente.
        await refreshUser();
      }
    } catch (err) {
      console.error("Failed to restore token:", err);
      await clearAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { apiLogin } = await import("../services/apiService");
      const response = await apiLogin({ email, password });

      if (!response.success) {
        throw new Error(response.error || "Login failed");
      }

      if (response.token && response.user) {
        try {
          const { setAuthToken } = await import("../services/apiService");
          setAuthToken(response.token);
        } catch (e) {
          console.warn("Failed to set auth token cache:", e);
        }
        setToken(response.token);
        setUser(response.user);
        await AsyncStorage.setItem("authToken", response.token);
        await AsyncStorage.setItem("user", JSON.stringify(response.user));

        const refreshed = await refreshUser();
        if (!refreshed) {
          throw new Error("Falha ao validar credenciais após login");
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao fazer login";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { apiRegister } = await import("../services/apiService");
      const response = await apiRegister({ email, password, name });

      if (!response.success) {
        throw new Error(response.error || "Registration failed");
      }

      // Auto-login after registration
      await login(email, password);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao registrar";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await clearAuthState();
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
