import { Payment } from '../types';

export const formatCurrency = (amount: number, symbol = '₹'): string => {
  const num = Number(amount || 0);
  return `${symbol}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateStr?: string | Date): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const toInputDate = (dateStr?: string | Date): string => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
};

export const exportTransactionsToCsv = (transactions: Payment[], filename = 'transactions-export.csv'): void => {
  const headers = [
    'Receipt Number',
    'Payment Date',
    'Student ID',
    'Student Name',
    'Student Email',
    'Student Phone',
    'Course Name',
    'Amount Paid',
    'Payment Method',
    'Transaction Reference',
    'Total Course Fee',
    'Total Paid After',
    'Remaining Balance After',
    'Fee Status After',
    'Remarks',
  ];

  const escapeCsvCell = (val: unknown): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = transactions.map((t) => [
    t.receiptNumber,
    formatDate(t.paymentDate),
    t.studentId,
    t.studentName,
    t.studentEmail,
    t.studentPhone,
    t.courseName,
    t.amount,
    t.paymentMethod,
    t.transactionReference || '',
    t.totalCourseFeeSnapshot,
    t.totalAmountPaidAfter,
    t.remainingBalanceAfter,
    t.paymentStatusAfter,
    t.remarks || '',
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.map(escapeCsvCell).join(','))].join(
      '\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

