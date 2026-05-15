import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Linking as RNLinking, Platform } from 'react-native';

interface StravaContextType {
  isConnected: boolean;
  isConnecting: boolean;
  athlete: {
    id: string;
    name: string;
    username: string;
    profile: string;
  } | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
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

    const handleUrl = ({ url }: { url: string }) => {
      processStravaRedirect(url);
    };

    const subscription = RNLinking.addEventListener('url', handleUrl);

    RNLinking.getInitialURL().then((url) => {
      if (url) {
        processStravaRedirect(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const processStravaRedirect = async (url: string) => {
    try {
      const parsed = Linking.parse(url);
      if (!parsed.path?.startsWith('strava/callback')) {
        return;
      }

      const code = parsed.queryParams?.code as string | undefined;
      if (!code) {
        return;
      }

      if (isConnected) {
        return;
      }

      setIsConnecting(true);
      const response = await apiService.post('/strava/callback', { code });

      setIsConnected(true);
      setAthlete(response.athlete ?? null);
    } catch (error) {
      console.error('Error processing Strava redirect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await apiService.get('/strava/status');
      setIsConnected(response.isConnected);
      setAthlete(response.athlete ?? null);
    } catch (error) {
      console.error('Error checking Strava status:', error);
      setIsConnected(false);
      setAthlete(null);
    }
  };

  const connect = async () => {
    try {
      setIsConnecting(true);

      const { authUrl } = await apiService.get('/strava/auth-url');

      if (Platform.OS === 'web') {
        window.open(authUrl, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(authUrl);
      }

    } catch (error) {
      console.error('Error connecting to Strava:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await apiService.post('/strava/disconnect');
      setIsConnected(false);
      setAthlete(null);
    } catch (error) {
      console.error('Error disconnecting Strava:', error);
      throw error;
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
    connect,
    disconnect,
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
