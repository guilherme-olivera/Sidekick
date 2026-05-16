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
    console.log('[StravaContext] processStravaRedirect', url);
    try {
      const parsed = Linking.parse(url);
      console.log('[StravaContext] parsed redirect', parsed);
      if (!parsed.path?.startsWith('strava/callback')) {
        console.log('[StravaContext] redirect path not matching strava/callback');
        return;
      }

      const success = parsed.queryParams?.success === 'true';
      const code = parsed.queryParams?.code as string | undefined;
      const state = parsed.queryParams?.state as string | undefined;
      console.log('[StravaContext] redirect params', { success, code, state });

      if (success) {
        setIsConnecting(true);
        await checkConnectionStatus();
        return;
      }

      if (!code) {
        console.log('[StravaContext] no code found in redirect');
        return;
      }

      if (isConnected) {
        console.log('[StravaContext] already connected, skipping callback');
        return;
      }

      setIsConnecting(true);
      const response = await apiService.post('/strava/callback', { code, state });

      console.log('[StravaContext] callback response', response);
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
      console.log('[StravaContext] connect start');

      const { authUrl } = await apiService.get('/strava/auth-url');
      console.log('[StravaContext] authUrl received', authUrl);

      if (Platform.OS === 'web') {
        window.open(authUrl, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(authUrl);
      }

      console.log('[StravaContext] browser opened for Strava auth');
      await checkConnectionStatus();
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
