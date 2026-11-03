import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Filter,
  Eye,
  Edit3,
  CreditCard,
  Users,
  RotateCcw,
} from 'lucide-react';
import { Payment, Student } from '../types';
import { studentApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PaymentStatusBadge } from '../components/StatusBadge';
import { StudentModal } from '../components/StudentModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { ReceiptPreviewModal } from '../components/ReceiptPreviewModal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export const StudentsPage: React.FC = () => {
  const { settings } = useAuth();
  const { showToast } = useToast();
  const currency = settings.currencySymbol || '₹';

  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('All');

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await studentApi.list({
        search: search || undefined,
        course: selectedCourse !== 'All' ? selectedCourse : undefined,
        paymentStatus: selectedPaymentStatus !== 'All' ? selectedPaymentStatus : undefined,
      });
      setStudents(res.students);
      setCourses(res.courses);
    } catch {
      showToast('Failed to load students directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCourse, selectedPaymentStatus, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCourse('All');
    setSelectedPaymentStatus('All');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-indigo-900 tracking-tight">
            Student Management
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingStudent(null);
            setIsStudentModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-indigo-300" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Course Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="All">All Courses</option>
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="All">All Fee States</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Showing {students.length} registered students</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading students directory...
            </div>
          ) : students.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Student Details</th>
                  <th className="py-3.5 px-4">Course & Duration</th>
                  <th className="py-3.5 px-4">Total Fee</th>
                  <th className="py-3.5 px-4">Paid / Balance</th>
                  <th className="py-3.5 px-4">Fee Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-sm">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <Link
                        to={`/students/${student._id}`}
                        className="font-bold text-slate-900 hover:text-indigo-700 block"
                      >
                        {student.fullName}
                      </Link>
                      <span className="text-xs text-slate-600 block">WhatsApp: {student.phone}</span>
                      {student.email ? <span className="text-xs text-slate-400 block">{student.email}</span> : null}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {student.courseName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {student.courseDuration}
                        {student.branch ? ` • ${student.branch}` : ''}
                        {student.classMode ? ` • ${student.classMode}` : ''}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(student.totalCourseFee, currency)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="text-xs">
                        <span className="text-slate-500">Paid: </span>
                        <strong className="text-emerald-700">
                          {formatCurrency(student.totalAmountPaid, currency)}
                        </strong>
                      </div>
                      <div className="text-xs mt-0.5">
                        <span className="text-slate-500">Bal: </span>
                        <strong
                          className={
                            student.remainingBalance === 0
                              ? 'text-slate-600'
                              : 'text-amber-700'
                          }
                        >
                          {formatCurrency(student.remainingBalance, currency)}
                        </strong>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <PaymentStatusBadge status={student.paymentStatus} />
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/students/${student._id}`}
                          title="View Student Profile & Payment History"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-xs font-semibold text-slate-700 hover:text-indigo-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Link>
                        <button
                          onClick={() => setPaymentStudent(student)}
                          title="Record Fee Payment"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingStudent(student);
                            setIsStudentModalOpen(true);
                          }}
                          title="Edit Student"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-base font-bold text-slate-800">
                No matching students found
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search query or filters, or register a new student.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
        initialStudent={editingStudent}
        onSuccess={() => {
          fetchStudents();
        }}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(paymentStudent)}
        onClose={() => setPaymentStudent(null)}
        student={paymentStudent}
        onPaymentSuccess={() => {
          fetchStudents();
        }}
        onPreviewReceipt={(payment) => {
          setPaymentStudent(null);
          setPreviewPayment(payment);
        }}
      />

      {/* Receipt Preview Modal */}
      <ReceiptPreviewModal
        payment={previewPayment}
        branch={paymentStudent?.branch || previewPayment?.branch}
        onClose={() => setPreviewPayment(null)}
      />
    </div>
  );
};

