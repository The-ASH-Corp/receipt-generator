import axios from 'axios';
import {
  AdminUser,
  Course,
  DashboardData,
  InstitutionSettings,
  Payment,
  PaymentMethod,
  Student,
  StudentStatus,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sfm_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (name: string, email: string, password: string) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { token: string; admin: AdminUser };
    }>('/auth/register', { name, email, password });
    return res.data.data;
  },
  login: async (email: string, password: string) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { token: string; admin: AdminUser };
    }>('/auth/login', { email, password });
    return res.data.data;
  },
  getMe: async () => {
    const res = await apiClient.get<{ success: boolean; data: AdminUser }>('/auth/me');
    return res.data.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getSummary: async () => {
    const res = await apiClient.get<{ success: boolean; data: DashboardData }>('/dashboard');
    return res.data.data;
  },
};

// Students API
export interface StudentPayload {
  fullName: string;
  email?: string;
  studentId: string;
  phone: string;
  courseName: string;
  courseDuration: string;
  classMode?: 'Offline' | 'Online' | 'Hybrid' | 'Recorded';
  branch?: 'Calicut' | 'Tirur' | string;
  paymentMethod?: string;
  receivedAmount?: number;
  courseStartDate?: string;
  totalCourseFee: number;
  registrationDate?: string;
  status?: StudentStatus;
}

export const studentApi = {
  list: async (params?: {
    search?: string;
    course?: string;
    status?: string;
    paymentStatus?: string;
  }) => {
    const res = await apiClient.get<{
      success: boolean;
      data: { students: Student[]; courses: string[]; totalCount: number };
    }>('/students', { params });
    return res.data.data;
  },
  getProfile: async (id: string) => {
    const res = await apiClient.get<{
      success: boolean;
      data: { student: Student; paymentHistory: Payment[] };
    }>(`/students/${id}`);
    return res.data.data;
  },
  create: async (payload: StudentPayload) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: Student;
    }>('/students', payload);
    return res.data;
  },
  update: async (id: string, payload: Partial<StudentPayload>) => {
    const res = await apiClient.put<{
      success: boolean;
      message: string;
      data: Student;
    }>(`/students/${id}`, payload);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/students/${id}`);
    return res.data;
  },
};

// Payments API
export interface RecordPaymentPayload {
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  remarks?: string;
  allowAdvance?: boolean;
}

export const paymentApi = {
  list: async (params?: {
    studentId?: string;
    search?: string;
    course?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        transactions: Payment[];
        courses: string[];
        totalAmount: number;
        count: number;
      };
    }>('/payments', { params });
    return res.data.data;
  },
  record: async (payload: RecordPaymentPayload) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { payment: Payment; student: Student };
    }>('/payments', payload);
    return res.data;
  },
  getDetails: async (idOrReceipt: string) => {
    const res = await apiClient.get<{
      success: boolean;
      data: { payment: Payment; settings: InstitutionSettings };
    }>(`/payments/${idOrReceipt}`);
    return res.data.data;
  },
  downloadReceiptPdf: async (paymentIdOrReceipt: string, receiptNumber?: string) => {
    const response = await apiClient.get(`/payments/${paymentIdOrReceipt}/receipt?download=true`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receiptNumber || paymentIdOrReceipt}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
  openReceiptPdfInNewTab: async (paymentIdOrReceipt: string) => {
    const response = await apiClient.get(`/payments/${paymentIdOrReceipt}/receipt`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  },
};

// Courses API
export const courseApi = {
  list: async () => {
    const res = await apiClient.get<{ success: boolean; data: Course[] }>('/courses');
    return res.data.data;
  },
  create: async (name: string) => {
    const res = await apiClient.post<{ success: boolean; message: string; data: Course }>(
      '/courses',
      { name }
    );
    return res.data;
  },
  update: async (id: string, name: string) => {
    const res = await apiClient.put<{ success: boolean; message: string; data: Course }>(
      `/courses/${id}`,
      { name }
    );
    return res.data;
  },
  remove: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/courses/${id}`
    );
    return res.data;
  },
};

// Settings API
export const settingsApi = {
  get: async () => {
    const res = await apiClient.get<{
      success: boolean;
      data: InstitutionSettings | null;
    }>('/settings');
    return res.data.data;
  },
  update: async (payload: Partial<InstitutionSettings>) => {
    const res = await apiClient.put<{
      success: boolean;
      message: string;
      data: InstitutionSettings;
    }>('/settings', payload);
    return res.data;
  },
};
