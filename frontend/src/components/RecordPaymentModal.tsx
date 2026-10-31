import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  Download,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Payment, PaymentMethod, Student } from '../types';
import { paymentApi, studentApi } from '../services/api';
import { formatCurrency, toInputDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { PaymentStatusBadge } from './StatusBadge';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  onPaymentSuccess: (payment: Payment, updatedStudent: Student) => void;
  onPreviewReceipt?: (payment: Payment) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Bank Transfer',
  'Card',
  'Cash',
  'Other',
];

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  student: preselectedStudent,
  onPaymentSuccess,
  onPreviewReceipt,
}) => {
  const { showToast } = useToast();
  const { settings } = useAuth();
  const currency = settings.currencySymbol || '₹';

  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(toInputDate());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [allowAdvance, setAllowAdvance] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedResult, setRecordedResult] = useState<{
    payment: Payment;
    student: Student;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setRecordedResult(null);
    setPaymentDate(toInputDate());
    setPaymentMethod('UPI');
    setTransactionReference('');
    setRemarks('');
    setAllowAdvance(false);

    if (preselectedStudent) {
      setActiveStudent(preselectedStudent);
      setSelectedStudentId(preselectedStudent._id);
      setAmount(
        preselectedStudent.remainingBalance > 0
          ? String(preselectedStudent.remainingBalance)
          : ''
      );
    } else {
      setActiveStudent(null);
      setSelectedStudentId('');
      setAmount('');
      studentApi.list().then((res) => {
        setStudentsList(res.students);
      });
    }
  }, [isOpen, preselectedStudent]);

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    const found = studentsList.find((s) => s._id === id) || null;
    setActiveStudent(found);
    if (found && found.remainingBalance > 0) {
      setAmount(String(found.remainingBalance));
    } else {
      setAmount('');
    }
  };

  if (!isOpen) return null;

  const numericAmount = Number(amount) || 0;
  const exceedsBalance =
    activeStudent !== null &&
    numericAmount > activeStudent.remainingBalance &&
    !allowAdvance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activeStudent) {
      setError('Please select a student first.');
      return;
    }

    if (numericAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (numericAmount > activeStudent.remainingBalance && !allowAdvance) {
      setError(
        `Payment amount (${formatCurrency(
          numericAmount,
          currency
        )}) exceeds remaining balance (${formatCurrency(
          activeStudent.remainingBalance,
          currency
        )}).`
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await paymentApi.record({
        studentId: activeStudent._id,
        amount: numericAmount,
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference.trim(),
        remarks: remarks.trim(),
        allowAdvance,
      });

      setRecordedResult(res.data);
      showToast(
        `Payment recorded! Receipt ${res.data.payment.receiptNumber} is ready.`,
        'success'
      );
      onPaymentSuccess(res.data.payment, res.data.student);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to record payment.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateReceiptDownload = async () => {
    if (!recordedResult) return;
    try {
      setDownloading(true);
      await paymentApi.downloadReceiptPdf(
        recordedResult.payment._id,
        recordedResult.payment.receiptNumber
      );
      showToast(
        `Downloaded PDF Receipt ${recordedResult.payment.receiptNumber}`,
        'success'
      );
    } catch {
      showToast('Failed to download PDF receipt.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {recordedResult ? 'Payment Recorded Successfully' : 'Record Fee Payment'}
              </h2>
              <p className="text-xs text-indigo-200">
                {recordedResult
                  ? `Official Receipt No: ${recordedResult.payment.receiptNumber}`
                  : 'Create an immutable fee payment transaction'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post-Payment Success View with Generate Receipt Button */}
        {recordedResult ? (
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Transaction Verified & Saved
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(recordedResult.payment.amount, currency)}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Received from{' '}
                <span className="font-semibold text-slate-900">
                  {recordedResult.payment.studentName}
                </span>{' '}
                ({recordedResult.payment.studentId})
              </p>
              <div className="mt-3">
                <PaymentStatusBadge status={recordedResult.student.paymentStatus} />
              </div>
            </div>

            {/* Fee Breakdown Summary Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Receipt Number:</span>
                <span className="font-mono font-bold text-indigo-900">
                  {recordedResult.payment.receiptNumber}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Course Fee:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(recordedResult.student.totalCourseFee, currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Previous Amount Paid:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(recordedResult.payment.previousAmountPaid, currency)}
                </span>
              </div>
              <div className="flex justify-between text-indigo-700 font-semibold">
                <span>Current Payment:</span>
                <span>+{formatCurrency(recordedResult.payment.amount, currency)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                <span>Total Amount Paid:</span>
                <span className="text-emerald-700">
                  {formatCurrency(recordedResult.student.totalAmountPaid, currency)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Updated Remaining Balance:</span>
                <span
                  className={
                    recordedResult.student.remainingBalance === 0
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }
                >
                  {formatCurrency(recordedResult.student.remainingBalance, currency)}
                </span>
              </div>
            </div>

            {/* Primary Actions: Generate Receipt (PDF) & View Receipt */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleGenerateReceiptDownload}
                disabled={downloading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Generating PDF...' : 'Generate Receipt (Download PDF)'}
              </button>
              {onPreviewReceipt && (
                <button
                  type="button"
                  onClick={() => {
                    onPreviewReceipt(recordedResult.payment);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-sm font-semibold transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Preview Receipt
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Done & Close
              </button>
            </div>
          </div>
        ) : (
          /* Payment Recording Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Student Selection if not preselected */}
            {!preselectedStudent && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Select Student <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">-- Choose a registered student --</option>
                  {studentsList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.fullName} ({s.studentId}) — Bal:{' '}
                      {formatCurrency(s.remainingBalance, currency)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Populated Student Details & Live Fee Summary */}
            {activeStudent && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Student Name</span>
                    <span className="font-bold text-slate-900">{activeStudent.fullName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Student ID</span>
                    <span className="font-mono font-semibold text-indigo-900">
                      {activeStudent.studentId}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-500 block">Course Enrolled</span>
                    <span className="font-medium text-slate-800">
                      {activeStudent.courseName}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/80 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                    <span className="text-[11px] uppercase text-slate-500 font-semibold block">
                      Total Fee
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(activeStudent.totalCourseFee, currency)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                    <span className="text-[11px] uppercase text-slate-500 font-semibold block">
                      Paid So Far
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatCurrency(activeStudent.totalAmountPaid, currency)}
                    </span>
                  </div>
                  <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200">
                    <span className="text-[11px] uppercase text-indigo-700 font-semibold block">
                      Remaining
                    </span>
                    <span className="text-sm font-bold text-indigo-950">
                      {formatCurrency(activeStudent.remainingBalance, currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Payment Amount ({currency}) <span className="text-rose-500">*</span>
                  </label>
                  {activeStudent && activeStudent.remainingBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(activeStudent.remainingBalance))}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Full Balance
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="Enter amount..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Transaction Reference <span className="text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="UTR / UPI Ref / Cheque No."
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Payment Remarks */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Payment Remarks <span className="text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Second semester installment payment"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Advance Payment Opt-in if amount > remainingBalance */}
            {activeStudent && numericAmount > activeStudent.remainingBalance && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <p className="text-xs text-amber-800 font-medium">
                  Entered amount ({formatCurrency(numericAmount, currency)}) exceeds the
                  student&apos;s remaining balance (
                  {formatCurrency(activeStudent.remainingBalance, currency)}).
                </p>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowAdvance}
                    onChange={(e) => setAllowAdvance(e.target.checked)}
                    className="rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  Explicitly allow as an advance fee payment
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !activeStudent || exceedsBalance}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                {submitting ? 'Recording Payment...' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

