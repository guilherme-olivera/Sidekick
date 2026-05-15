import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserProfile {
  trainingGoal?: string;
  focusArea?: string;
  injuryNote?: string;
  availableTime?: string;
  trainingMood?: string;
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
  refreshUser: () => Promise<void>;
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

  const refreshUser = async () => {
    try {
      const { apiService } = await import("../services/apiService");
      const response = await apiService.get("/auth/me");
      if (response.success && response.user) {
        setUser(response.user);
        await AsyncStorage.setItem("user", JSON.stringify(response.user));
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  const restoreToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem("authToken");
      const savedUser = await AsyncStorage.getItem("user");

      if (savedToken) {
        setToken(savedToken);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        await refreshUser();
      }
    } catch (err) {
      console.error("Failed to restore token:", err);
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
        setToken(response.token);
        await AsyncStorage.setItem("authToken", response.token);
        await AsyncStorage.setItem("user", JSON.stringify(response.user));
        await refreshUser();
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
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("user");

      setToken(null);
      setUser(null);
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
