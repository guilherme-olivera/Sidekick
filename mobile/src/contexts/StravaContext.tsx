import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';

interface StravaContextType {
  isConnected: boolean;
  isConnecting: boolean;
  athlete: {
    id: number;
    name: string;
    username: string;
    profile: string;
  } | null;
  connectStrava: () => Promise<void>;
  disconnectStrava: () => Promise<void>;
  syncActivities: () => Promise<{ syncedActivities: number; totalActivities: number } | null>;
  checkConnectionStatus: () => Promise<void>;
}

const StravaContext = createContext<StravaContextType | undefined>(undefined);

interface StravaProviderProps {
  children: ReactNode;
}

export const StravaProvider: React.FC<StravaProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [athlete, setAthlete] = useState<StravaContextType['athlete']>(null);

  // Verifica status da conexão ao iniciar
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await apiService.get('/strava/status');
      setIsConnected(response.isConnected);
      if (response.isConnected) {
        // Se conectado, buscar dados do atleta (pode ser implementado depois)
        setAthlete(null); // Temporário
      }
    } catch (error) {
      console.error('Error checking Strava status:', error);
      setIsConnected(false);
    }
  };

  const connectStrava = async () => {
    try {
      setIsConnecting(true);

      // Busca URL de autorização
      const { authUrl } = await apiService.get('/strava/auth-url');

      // Aqui seria implementada a abertura do navegador ou deep linking
      // Por enquanto, apenas log da URL
      console.log('Strava Auth URL:', authUrl);

      // Em produção, isso abriria o navegador ou app Strava
      // Após autorização, o callback seria processado

    } catch (error) {
      console.error('Error connecting to Strava:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectStrava = async () => {
    try {
      // Por enquanto, apenas limpa o estado local
      // Em produção, pode ser necessário chamar uma API para limpar tokens
      setIsConnected(false);
      setAthlete(null);
      await AsyncStorage.removeItem('strava_connected');
    } catch (error) {
      console.error('Error disconnecting Strava:', error);
    }
  };

  const syncActivities = async () => {
    try {
      if (!isConnected) {
        throw new Error('Not connected to Strava');
      }

      const response = await apiService.post('/strava/sync', {});
      return response;
    } catch (error) {
      console.error('Error syncing Strava activities:', error);
      throw error;
    }
  };

  const value: StravaContextType = {
    isConnected,
    isConnecting,
    athlete,
    connectStrava,
    disconnectStrava,
    syncActivities,
    checkConnectionStatus,
  };

  return (
    <StravaContext.Provider value={value}>
      {children}
    </StravaContext.Provider>
  );
};

export const useStrava = () => {
  const context = useContext(StravaContext);
  if (context === undefined) {
    throw new Error('useStrava must be used within a StravaProvider');
  }
  return context;
};
