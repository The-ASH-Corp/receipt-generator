import { PaymentStatusType } from '../models/Student';

export const formatReceiptNumber = (
  prefix: string,
  sequence: number,
  branch?: string,
): string => {
  const cleanPrefix = (prefix || 'e')
    .trim()
    .replace(/[^A-Z0-9]/gi, '')
    .toLowerCase() || 'e';
  const startAt = branch?.trim().toLowerCase() === 'tirur' ? 5000 : 1;
  const receiptSequence = sequence + startAt - 1;
  return `${cleanPrefix}${String(receiptSequence).padStart(4, '0')}`;
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
