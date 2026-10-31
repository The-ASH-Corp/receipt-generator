import React, { useState } from 'react';
import { X, Download, Printer, ShieldCheck, Building2 } from 'lucide-react';
import { Payment } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { paymentApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { PaymentStatusBadge } from './StatusBadge';

interface ReceiptPreviewModalProps {
  payment: Payment | null;
  onClose: () => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  payment,
  onClose,
}) => {
  const { settings } = useAuth();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!payment) return null;

  const currency = settings.currencySymbol || '₹';

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await paymentApi.downloadReceiptPdf(payment._id, payment.receiptNumber);
      showToast(`Receipt ${payment.receiptNumber}.pdf downloaded!`, 'success');
    } catch {
      showToast('Failed to download receipt PDF.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenPrintablePdf = async () => {
    try {
      await paymentApi.openReceiptPdfInNewTab(payment._id);
    } catch {
      showToast('Failed to open printable PDF.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-semibold">
              Official Fee Receipt — {payment.receiptNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPrintablePdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Open PDF
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice-Style Receipt Body */}
        <div className="p-6 sm:p-8 space-y-6 bg-white">
          {/* Institution Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-start gap-4">
              {settings.academyLogo ? (
                <img
                  src={settings.academyLogo}
                  alt={settings.academyName}
                  className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-white p-1 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-indigo-950 text-white flex flex-col items-center justify-center shrink-0 border-2 border-indigo-400/40">
                  <Building2 className="w-6 h-6 text-indigo-300" />
                  <span className="text-[9px] font-bold tracking-wider uppercase text-indigo-200 mt-0.5">
                    LOGO
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight uppercase">
                  {settings.academyName}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 max-w-md">{settings.address}</p>
                <p className="text-xs font-medium text-slate-700 mt-1">
                  Tel: {settings.phone} &nbsp;|&nbsp; Email: {settings.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end justify-between shrink-0">
              <span className="inline-block px-3 py-1 rounded-md bg-indigo-950 text-white text-xs font-bold tracking-wider uppercase">
                FEE RECEIPT
              </span>
              <div className="mt-2">
                <PaymentStatusBadge status={payment.paymentStatusAfter} />
              </div>
            </div>
          </div>

          {/* Receipt Meta Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-5 py-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
                Receipt Number
              </span>
              <span className="font-mono text-sm font-bold text-indigo-950">
                {payment.receiptNumber}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
                Receipt Date
              </span>
              <span className="text-sm font-bold text-indigo-950">
                {formatDate(payment.paymentDate)}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
                Payment Method
              </span>
              <span className="text-sm font-bold text-indigo-950">
                {payment.paymentMethod}
              </span>
            </div>
          </div>

          {/* Student & Transaction Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100">
                Student Information
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{payment.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student ID:</span>
                <span className="font-mono font-semibold text-indigo-900">
                  {payment.studentId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Course Name:</span>
                <span className="font-medium text-slate-800 text-right">
                  {payment.courseName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="text-slate-700">{payment.studentPhone}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100">
                Transaction Details
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Received:</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(payment.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-medium text-slate-800">{payment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref:</span>
                <span className="font-mono text-slate-700">
                  {payment.transactionReference || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remarks:</span>
                <span className="text-slate-700 truncate max-w-[180px]">
                  {payment.remarks || 'Course Fee Installment'}
                </span>
              </div>
            </div>
          </div>

          {/* Fee Summary Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-indigo-950 text-white px-4 py-2.5 flex justify-between text-xs font-bold uppercase tracking-wider">
              <span>Fee Summary Description</span>
              <span>Amount</span>
            </div>
            <div className="divide-y divide-slate-200 text-sm">
              <div className="px-4 py-3 flex justify-between items-center bg-white">
                <span className="text-slate-600">Total Course Fee</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(payment.totalCourseFeeSnapshot, currency)}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center bg-slate-50/60">
                <span className="text-slate-600">Previous Amount Paid</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(payment.previousAmountPaid, currency)}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center bg-indigo-50/70">
                <span className="font-bold text-indigo-950">Current Payment Received</span>
                <span className="font-bold text-indigo-700 text-base">
                  {formatCurrency(payment.amount, currency)}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center bg-white">
                <span className="font-bold text-slate-800">Total Amount Paid</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(payment.totalAmountPaidAfter, currency)}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center bg-slate-50">
                <span className="font-bold text-slate-800">Remaining Balance</span>
                <span
                  className={`font-bold ${
                    payment.remainingBalanceAfter === 0
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {formatCurrency(payment.remainingBalanceAfter, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer: Acknowledgement, Stamp Placeholder & Signature */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center text-center p-2 shrink-0 bg-indigo-50/30">
                <span className="text-[8px] font-bold uppercase text-indigo-600">
                  Official Seal
                </span>
                <span className="text-[10px] font-extrabold uppercase text-indigo-950">
                  VERIFIED
                </span>
                <span className="text-[8px] text-indigo-500">Stamp</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                <strong className="text-slate-800 block mb-0.5">
                  Payment Received Acknowledgement:
                </strong>
                Received {formatCurrency(payment.amount, currency)} from{' '}
                {payment.studentName} ({payment.studentId}) towards {payment.courseName}.
              </p>
            </div>

            <div className="text-center sm:text-right shrink-0">
              <div className="w-40 border-b border-slate-400 mb-1.5 mx-auto sm:ml-auto" />
              <span className="text-xs font-bold text-slate-900 block">
                Authorized Signature
              </span>
              <span className="text-[11px] text-slate-500 block">
                For {settings.academyName}
              </span>
            </div>
          </div>

          <div className="text-center pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-indigo-900">
              {settings.receiptFooterMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

