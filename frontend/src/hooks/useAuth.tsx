import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { AdminUser, InstitutionSettings } from "../types";
import { authApi, settingsApi } from "../services/api";

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
  academyName: "ASH ACADEMY",
  academyLogo: "/ash-academy-logo.png",
  address: "2nd Floor, OPS Mall, Vailathur,Tirur",
  phone: "+91 8921365750",
  email: "connect@ashacademy.ai",
  website: "www.ashacademy.ai",
  receiptPrefix: "e",
  receiptFooterMessage:
    "Please note: All payments are final and non-refundable.",
  currencySymbol: "₹",
  selectedBranch: "Tirur",
  branches: {
    Tirur: {
      address: "2nd Floor, OPS Mall, Vailathur,Tirur",
      phone: "+91 8921365750",
      email: "connect@ashacademy.ai",
      website: "www.ashacademy.ai",
      receiptPrefix: "e",
      receiptFooterMessage:
        "Please note: All payments are final and non-refundable.",
    },
    Calicut: {
      address: "Hilite Business Park, Palazhi, Calicut, Pantheeramkav, Kerala",
      phone: "+91 8921365750",
      email: "connect@ashacademy.ai",
      website: "www.ashacademy.ai",
      receiptPrefix: "e",
      receiptFooterMessage:
        "Please note: All payments are final and non-refundable.",
    },
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("sfm_token"),
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<InstitutionSettings>(
    DEFAULT_FRONTEND_SETTINGS,
  );

  const refreshSettings = useCallback(async () => {
    try {
      const data = await settingsApi.get();
      setSettings(data ?? DEFAULT_FRONTEND_SETTINGS);
    } catch {
      // Keep default settings if unauthenticated
    }
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem("sfm_token");
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
        localStorage.removeItem("sfm_token");
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
    localStorage.setItem("sfm_token", result.token);
    setToken(result.token);
    setAdmin(result.admin);
    const inst = await settingsApi.get();
    setSettings(inst ?? DEFAULT_FRONTEND_SETTINGS);
  };

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    localStorage.setItem("sfm_token", result.token);
    setToken(result.token);
    setAdmin(result.admin);
    const inst = await settingsApi.get();
    setSettings(inst ?? DEFAULT_FRONTEND_SETTINGS);
  };

  const logout = () => {
    localStorage.removeItem("sfm_token");
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
