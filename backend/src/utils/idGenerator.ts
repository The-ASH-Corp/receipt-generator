import { PaymentStatusType } from '../models/Student';

export const formatSequentialCode = (prefix: string, seq: number, date?: Date): string => {
  const year = (date || new Date()).getFullYear();
  const cleanPrefix = (prefix || 'e').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const paddedSeq = String(seq).padStart(4, '0');
  return `${cleanPrefix}-${year}-${paddedSeq}`;
};

export const calculateFeeBreakdown = (
  totalCourseFee: number,
  totalAmountPaid: number
): {
  totalCourseFee: number;
  totalAmountPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatusType;
} => {
  const fee = Math.max(0, Number(totalCourseFee) || 0);
  const paid = Math.max(0, Math.round((Number(totalAmountPaid) || 0) * 100) / 100);
  const remaining = Math.max(0, Math.round((fee - paid) * 100) / 100);

  let paymentStatus: PaymentStatusType = 'Pending';
  if (paid <= 0) {
    paymentStatus = 'Pending';
  } else if (paid >= fee) {
    paymentStatus = 'Paid';
  } else {
    paymentStatus = 'Partially Paid';
  }

  return {
    totalCourseFee: fee,
    totalAmountPaid: paid,
    remainingBalance: remaining,
    paymentStatus,
  };
};

