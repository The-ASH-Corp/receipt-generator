import React from 'react';
import { PaymentStatus, StudentStatus } from '../types';

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const styles: Record<PaymentStatus, string> = {
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
    'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10',
    Pending: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
  };

  const dotStyles: Record<PaymentStatus, string> = {
    Paid: 'bg-emerald-500',
    'Partially Paid': 'bg-amber-500',
    Pending: 'bg-rose-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        styles[status] || styles.Pending
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[status] || dotStyles.Pending}`} />
      {status}
    </span>
  );
};

export const StudentStatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
  const isActive = status === 'Active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        isActive
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? 'bg-indigo-600' : 'bg-slate-400'
        }`}
      />
      {status}
    </span>
  );
};

