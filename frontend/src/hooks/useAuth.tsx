import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdminUser, InstitutionSettings } from '../types';
import { authApi, settingsApi } from '../services/api';

interface AuthContextValue {
  admin: AdminUser | null;
  token: string | null;
  loading: boolean;
  settings: InstitutionSettings;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_FRONTEND_SETTINGS: InstitutionSettings = {
  academyName: 'Apex Global Academy of Technology',
  academyLogo: '',
  address: '4th Floor, Innovation Tower, Residency Road, Bengaluru - 560025',
  phone: '+91 80 4567 8900',
  email: 'admissions@apexacademy.edu',
  website: 'www.apexacademy.edu',
  receiptPrefix: 'REC',
  receiptFooterMessage: 'Thank you for your payment! Looking forward to empowering your learning journey.',
  currencySymbol: '₹',
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sfm_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<InstitutionSettings>(DEFAULT_FRONTEND_SETTINGS);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await settingsApi.get();
      setSettings(data);
    } catch {
      // Keep default settings if unauthenticated
    }
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem('sfm_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const user = await authApi.getMe();
        setAdmin(user);
        setToken(savedToken);
        await refreshSettings();
      } catch {
        localStorage.removeItem('sfm_token');
        setAdmin(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, [refreshSettings]);

  const register = async (name: string, email: string, password: string) => {
    const result = await authApi.register(name, email, password);
    localStorage.setItem('sfm_token', result.token);
    setToken(result.token);
    setAdmin(result.admin);
    const inst = await settingsApi.get();
    setSettings(inst);
  };

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    localStorage.setItem('sfm_token', result.token);
    setToken(result.token);
    setAdmin(result.admin);
    const inst = await settingsApi.get();
    setSettings(inst);
  };

  const logout = () => {
    localStorage.removeItem('sfm_token');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        loading,
        settings,
        register,
        login,
        logout,
        refreshSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
