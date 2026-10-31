import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CreditCard,
  Download,
  FileText,
  UserCheck,
  ArrowUpRight,
} from 'lucide-react';
import { Payment, Student } from '../types';
import { paymentApi, studentApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PaymentStatusBadge, StudentStatusBadge } from '../components/StatusBadge';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { ReceiptPreviewModal } from '../components/ReceiptPreviewModal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export const PaymentsPage: React.FC = () => {
  const { settings } = useAuth();
  const { showToast } = useToast();
  const currency = settings.currencySymbol || '₹';

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentPayments, setStudentPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);

  const loadStudents = useCallback(
    async (keepStudentId?: string) => {
      try {
        setLoading(true);
        const res = await studentApi.list();
        setStudents(res.students);
        if (res.students.length > 0) {
          const target =
            res.students.find((s) => s._id === keepStudentId) || res.students[0];
          setSelectedStudent(target);
          const profile = await studentApi.getProfile(target._id);
          setStudentPayments(profile.paymentHistory);
        }
      } catch {
        showToast('Failed to load student fee accounts.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    try {
      const profile = await studentApi.getProfile(student._id);
      setSelectedStudent(profile.student);
      setStudentPayments(profile.paymentHistory);
    } catch {
      showToast('Failed to load student payment history.', 'error');
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.courseName.toLowerCase().includes(q)
    );
  });

  const handleDownloadPdf = async (payment: Payment) => {
    try {
      await paymentApi.downloadReceiptPdf(payment._id, payment.receiptNumber);
      showToast(`Receipt ${payment.receiptNumber}.pdf downloaded`, 'success');
    } catch {
      showToast('Failed to download PDF receipt.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-indigo-900 tracking-tight">
            Fee Payment Management
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Select a student to inspect their fee balance, record installments, and generate
            official receipts
          </p>
        </div>
        {selectedStudent && (
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <CreditCard className="w-4 h-4 text-indigo-300" />
            <span>Record Payment for {selectedStudent.fullName.split(' ')[0]}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Directory: Select Student (4 columns) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col max-h-[720px]">
          <div className="p-4 border-b border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Student ({filteredStudents.length})
              </span>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-200/60 overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Loading students...
              </div>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((s) => {
                const isSelected = selectedStudent?._id === s._id;
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => handleSelectStudent(s)}
                    className={`w-full text-left p-4 transition-colors flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-50/90 border-l-4 border-indigo-700'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {s.fullName}
                      </p>
                      <p className="text-xs font-mono text-indigo-800 mt-0.5">
                        {s.studentId}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {s.courseName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <PaymentStatusBadge status={s.paymentStatus} />
                      <p className="text-xs font-bold text-slate-700 mt-1.5">
                        Bal: {formatCurrency(s.remainingBalance, currency)}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No matching students found.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Selected Student Fee Information & Payment History (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedStudent ? (
            <>
              {/* Selected Student Header & Fee Breakdown Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-extrabold text-slate-900">
                        {selectedStudent.fullName}
                      </h2>
                      <StudentStatusBadge status={selectedStudent.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Student ID:{' '}
                      <strong className="font-mono text-indigo-900">
                        {selectedStudent.studentId}
                      </strong>{' '}
                      &bull; Course:{' '}
                      <strong className="text-slate-800">
                        {selectedStudent.courseName}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link
                      to={`/students/${selectedStudent._id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                    >
                      <span>Full Profile</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Record Payment</span>
                    </button>
                  </div>
                </div>

                {/* 4 Required Fee Info Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Total Course Fee
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 mt-1 block">
                      {formatCurrency(selectedStudent.totalCourseFee, currency)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Total Amount Paid
                    </span>
                    <span className="text-lg font-extrabold text-emerald-800 mt-1 block">
                      {formatCurrency(selectedStudent.totalAmountPaid, currency)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                      Remaining Balance
                    </span>
                    <span className="text-lg font-extrabold text-amber-900 mt-1 block">
                      {formatCurrency(selectedStudent.remainingBalance, currency)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Payment Status
                    </span>
                    <div className="mt-1">
                      <PaymentStatusBadge status={selectedStudent.paymentStatus} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Student's Payment & Receipt Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Recorded Installments & Receipts ({studentPayments.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Download or preview official PDF receipts for any recorded payment
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {studentPayments.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4">Receipt No.</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Method</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 text-sm">
                        {studentPayments.map((payment) => (
                          <tr
                            key={payment._id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono text-xs font-bold text-indigo-950">
                              {payment.receiptNumber}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              {formatDate(payment.paymentDate)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-emerald-700">
                              {formatCurrency(payment.amount, currency)}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              {payment.paymentMethod}
                            </td>
                            <td className="py-3.5 px-4">
                              <PaymentStatusBadge status={payment.paymentStatusAfter} />
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => setPreviewPayment(payment)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 text-xs font-semibold text-slate-700 hover:text-indigo-900"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => handleDownloadPdf(payment)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-10 text-center text-sm text-slate-500">
                      No payments recorded yet for {selectedStudent.fullName}. Click
                      &ldquo;Record Payment&rdquo; to record an installment.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <UserCheck className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-base font-bold text-slate-800">
                Select a Student to Manage Payments
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        student={selectedStudent}
        onPaymentSuccess={(_payment, updatedStudent) => {
          loadStudents(updatedStudent._id);
        }}
        onPreviewReceipt={(payment) => {
          setIsPaymentModalOpen(false);
          setPreviewPayment(payment);
        }}
      />

      {/* Receipt Preview Modal */}
      <ReceiptPreviewModal
        payment={previewPayment}
        onClose={() => setPreviewPayment(null)}
      />
    </div>
  );
};

