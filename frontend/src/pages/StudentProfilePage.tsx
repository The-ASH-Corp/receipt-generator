import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Clock,
  Edit3,
  CreditCard,
  Download,
  FileText,
  Receipt,
  MapPin,
  Laptop,
} from 'lucide-react';
import { Payment, Student } from '../types';
import { paymentApi, studentApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PaymentStatusBadge } from '../components/StatusBadge';
import { StudentModal } from '../components/StudentModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { ReceiptPreviewModal } from '../components/ReceiptPreviewModal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export const StudentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { settings } = useAuth();
  const { showToast } = useToast();
  const currency = settings.currencySymbol || '₹';

  const [student, setStudent] = useState<Student | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await studentApi.getProfile(id);
      setStudent(res.student);
      setPaymentHistory(res.paymentHistory);
    } catch {
      showToast('Failed to load student profile.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      setDownloadingId(payment._id);
      await paymentApi.downloadReceiptPdf(payment._id, payment.receiptNumber);
      showToast(`Downloaded ${payment.receiptNumber}.pdf`, 'success');
    } catch {
      showToast('Failed to download receipt PDF.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading && !student) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-40" />
        <div className="h-48 bg-white rounded-2xl border border-slate-200" />
        <div className="h-64 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Student Profile Not Found</h2>
        <Link
          to="/students"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Link>
      </div>
    );
  }

  const progressPercent =
    student.totalCourseFee > 0
      ? Math.min(100, Math.round((student.totalAmountPaid / student.totalCourseFee) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-indigo-900 tracking-tight">
                {student.fullName}
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Registered {formatDate(student.registrationDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors"
          >
            <Edit3 className="w-4 h-4 text-slate-600" />
            <span>Edit Student</span>
          </button>
        </div>
      </div>

      {/* Fee Information Cards (Section 5 Requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Total Course Fee
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-2 block">
            {formatCurrency(student.totalCourseFee, currency)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">{student.courseName}</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Total Amount Paid
          </span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-2 block">
            {formatCurrency(student.totalAmountPaid, currency)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {paymentHistory.length} recorded payment(s)
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Remaining Balance
          </span>
          <span
            className={`text-2xl font-extrabold mt-2 block ${student.remainingBalance === 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
          >
            {formatCurrency(student.remainingBalance, currency)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {student.remainingBalance === 0 ? 'Full fee cleared' : 'Outstanding balance'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Payment Status
          </span>
          <div className="my-2">
            <PaymentStatusBadge status={student.paymentStatus} />
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Student Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Enrollment & Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">WhatsApp Number</span>
              <span className="font-semibold text-slate-900">{student.phone}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Course</span>
              <span className="font-semibold text-slate-900">{student.courseName}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Duration</span>
              <span className="font-semibold text-slate-900">{student.courseDuration}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Class Mode</span>
              <span className="font-semibold text-slate-900">{student.classMode || 'Offline'}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Branch</span>
              <span className="font-semibold text-slate-900">{student.branch || 'Calicut'}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Registration Date</span>
              <span className="font-semibold text-slate-900">
                {formatDate(student.registrationDate)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Admission Number</span>
              <span className="font-semibold text-slate-900">
                {student.studentId || '—'}
              </span>
            </div>
          </div>

          {student.email ? (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Email Address</span>
                <span className="font-semibold text-slate-900">{student.email}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Section 7: Student Payment History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-base font-bold text-indigo-900">
              Student Payment History
            </h2>
          </div>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>+ Record New Payment</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {paymentHistory.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Receipt No.</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Amount</th>
                  <th className="py-3.5 px-5">Payment Method</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-sm">
                {paymentHistory.map((payment) => (
                  <tr key={payment._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 font-mono text-xs font-bold text-indigo-950">
                      {payment.receiptNumber}
                    </td>
                    <td className="py-4 px-5 text-slate-700">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="py-4 px-5 font-bold text-emerald-700">
                      {formatCurrency(payment.amount, currency)}
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-medium text-slate-800">
                        {payment.paymentMethod}
                      </span>
                      {payment.transactionReference && (
                        <span className="block text-xs font-mono text-slate-500">
                          Ref: {payment.transactionReference}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <PaymentStatusBadge status={payment.paymentStatusAfter} />
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setPreviewPayment(payment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-xs font-semibold text-slate-700 hover:text-indigo-900 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(payment)}
                          disabled={downloadingId === payment._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {downloadingId === payment._id
                              ? 'Generating...'
                              : 'Download Receipt'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                No payments recorded for this student yet
              </div>
              <p className="text-xs text-slate-500">
                Click &ldquo;Record Payment&rdquo; above to record their first fee installment and
                generate an official receipt.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Student Modal */}
      <StudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialStudent={student}
        onSuccess={() => {
          fetchProfile();
        }}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        student={student}
        onPaymentSuccess={() => {
          fetchProfile();
        }}
        onPreviewReceipt={(payment) => {
          setIsPaymentModalOpen(false);
          setPreviewPayment(payment);
        }}
      />

      {/* Receipt Preview Modal */}
      <ReceiptPreviewModal
        payment={previewPayment}
        branch={student?.branch}
        onClose={() => setPreviewPayment(null)}
      />
    </div>
  );
};

