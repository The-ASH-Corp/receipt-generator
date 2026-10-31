import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  IndianRupee,
  Clock,
  Receipt,
  UserPlus,
  CreditCard,
  ArrowUpRight,
  Download,
  Eye,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { DashboardData, Payment, Student } from '../types';
import { dashboardApi, paymentApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PaymentStatusBadge } from '../components/StatusBadge';
import { StudentModal } from '../components/StudentModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { ReceiptPreviewModal } from '../components/ReceiptPreviewModal';
import { useToast } from '../hooks/useToast';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getSummary();
      setData(res);
    } catch {
      showToast('Failed to load dashboard overview.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleDownloadPdf = async (payment: Payment) => {
    try {
      await paymentApi.downloadReceiptPdf(payment._id, payment.receiptNumber);
      showToast(`Receipt ${payment.receiptNumber}.pdf downloaded`, 'success');
    } catch {
      showToast('Failed to download PDF receipt', 'error');
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 bg-white rounded-2xl border border-slate-200 p-5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-white rounded-2xl border border-slate-200" />
          <div className="h-96 bg-white rounded-2xl border border-slate-200" />
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const currency = summary?.currencySymbol || '₹';

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-indigo-900 tracking-tight">
            Admin Dashboard
          </h1>
           </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
         
          <button
            onClick={() => setIsStudentModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-semibold shadow-2xs transition-colors"
          >
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <span>Add Student</span>
          </button>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <CreditCard className="w-4 h-4 text-indigo-300" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Students */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Students
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {summary?.totalStudents ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-indigo-700">
                {summary?.activeStudents ?? 0} active
              </span>{' '}
              enrolled students
            </p>
          </div>
        </div>

        {/* Card 2: Total Fees Collected */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Fees Collected
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {formatCurrency(summary?.totalFeesCollected || 0, currency)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Of {formatCurrency(summary?.totalCourseFeeExpected || 0, currency)} total
              course fees
            </p>
          </div>
        </div>

        {/* Card 3: Pending Fees */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Fees
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
              {formatCurrency(summary?.pendingFees || 0, currency)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {summary?.statusBreakdown.partiallyPaid || 0} partial &bull;{' '}
              {summary?.statusBreakdown.pending || 0} pending
            </p>
          </div>
        </div>

        {/* Card 4: Total Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Transactions
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {summary?.totalTransactions ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verified receipts issued to date
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid: Recent Fee Payments & Recently Registered Students */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Fee Payments (7 columns) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Fee Payments</h2>
              <p className="text-xs text-slate-500">
                Latest recorded fee installments & generated receipts
              </p>
            </div>
            <Link
              to="/transactions"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            {data?.recentPayments && data.recentPayments.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Receipt No.</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method / Date</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-sm">
                  {data.recentPayments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-indigo-950">
                        {payment.receiptNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/students/${payment.student}`}
                          className="font-semibold text-slate-900 hover:text-indigo-700 block"
                        >
                          {payment.studentName}
                        </Link>
                        <span className="text-xs text-slate-500 font-mono">
                          {payment.studentId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {formatCurrency(payment.amount, currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-slate-800 block">
                          {payment.paymentMethod}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(payment.paymentDate)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setPreviewPayment(payment)}
                            title="Preview Receipt"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(payment)}
                            title="Download PDF Receipt"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">
                No fee payments recorded yet. Click &ldquo;Record Payment&rdquo; to begin.
              </div>
            )}
          </div>
        </div>

        {/* Recently Registered Students (5 columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recently Registered Students
              </h2>
              <p className="text-xs text-slate-500">
                Latest student enrollments & fee status
              </p>
            </div>
            <Link
              to="/students"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
            >
              All Students <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-200/60 flex-1">
            {data?.recentStudents && data.recentStudents.length > 0 ? (
              data.recentStudents.map((student) => (
                <div
                  key={student._id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/students/${student._id}`}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-700 truncate"
                      >
                        {student.fullName}
                      </Link>
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {student.studentId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5">
                      {student.courseName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Paid:{' '}
                      <strong className="text-slate-800">
                        {formatCurrency(student.totalAmountPaid, currency)}
                      </strong>{' '}
                      / {formatCurrency(student.totalCourseFee, currency)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <PaymentStatusBadge status={student.paymentStatus} />
                    <Link
                      to={`/students/${student._id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      <Eye className="w-3.5 h-3.5" /> Profile
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">
                No students registered yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSuccess={(newStudent: Student) => {
          fetchDashboard();
          navigate(`/students/${newStudent._id}`);
        }}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={() => {
          fetchDashboard();
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

