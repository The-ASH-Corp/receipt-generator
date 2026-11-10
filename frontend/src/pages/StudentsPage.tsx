import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Filter,
  Eye,
  Edit3,
  Trash2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { Payment, Student } from '../types';
import { studentApi } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { PaymentStatusBadge } from '../components/StatusBadge';
import { StudentModal } from '../components/StudentModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { ReceiptPreviewModal } from '../components/ReceiptPreviewModal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Select from '../components/Select';
import { Pagination } from '../components/Pagination';

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
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

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


  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    try {
      setIsDeleting(true);
      const res = await studentApi.delete(deletingStudent._id);
      showToast(res.message || 'Student deleted successfully.', 'success');
      setDeletingStudent(null);
      fetchStudents();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete student.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCourse, selectedPaymentStatus]);

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const paginatedStudents = students.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [students.length, totalPages, currentPage]);

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
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
            />
          </div>

          {/* Course Filter */}
          <div className="lg:col-span-3">
            <Select
              value={selectedCourse}
              onChange={setSelectedCourse}
              options={[
                { label: "All Courses", value: "All" },
                ...courses.map((course) => ({
                  label: course,
                  value: course,
                })),
              ]}
            />
          </div>

          {/* Payment Status Filter */}
          <div className="lg:col-span-3">
            <Select
              value={selectedPaymentStatus}
              onChange={setSelectedPaymentStatus}
              options={[
                { label: "All Fee States", value: "All" },
                { label: "Paid", value: "Paid" },
                { label: "Partially Paid", value: "Partially Paid" },
                { label: "Pending", value: "Pending" },
              ]}
            />
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
                {paginatedStudents.map((student) => (
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
                          onClick={() => {
                            setEditingStudent(student);
                            setIsStudentModalOpen(true);
                          }}
                          title="Edit Student"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingStudent(student)}
                          title="Delete Student"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

        {students.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={students.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemName="registered students"
          />
        )}
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

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-5 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-indigo-900">Delete Student</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete{' '}
                  <strong className="text-slate-900">{deletingStudent.fullName}</strong>?
                  This will also remove their associated payment records.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

