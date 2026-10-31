export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending';
export type StudentStatus = 'Active' | 'Inactive';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Other';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export interface Student {
  _id: string;
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  courseName: string;
  courseDuration: string;
  courseStartDate: string;
  totalCourseFee: number;
  totalAmountPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatus;
  registrationDate: string;
  status: StudentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  _id: string;
  receiptNumber: string;
  student: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  courseName: string;
  amount: number;
  totalCourseFeeSnapshot: number;
  previousAmountPaid: number;
  totalAmountPaidAfter: number;
  remainingBalanceAfter: number;
  paymentStatusAfter: PaymentStatus;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  remarks?: string;
  allowAdvance?: boolean;
  createdAt?: string;
}

export interface InstitutionSettings {
  _id?: string;
  academyName: string;
  academyLogo: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  receiptPrefix: string;
  receiptFooterMessage: string;
  currencySymbol: string;
  updatedAt?: string;
}

export interface DashboardData {
  summary: {
    totalStudents: number;
    activeStudents: number;
    totalFeesCollected: number;
    pendingFees: number;
    totalCourseFeeExpected: number;
    totalTransactions: number;
    statusBreakdown: {
      paid: number;
      partiallyPaid: number;
      pending: number;
    };
    currencySymbol: string;
  };
  recentPayments: Payment[];
  recentStudents: Student[];
}

