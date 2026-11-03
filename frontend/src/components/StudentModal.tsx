import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { Student } from '../types';
import { studentApi, courseApi, StudentPayload } from '../services/api';
import { toInputDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Student) => void;
  initialStudent?: Student | null;
}

const DEFAULT_COURSES = [
  'Full Stack Web Development Bootcamp',
  'Data Science & Machine Learning',
  'UI/UX Product Design Mastery',
  'Cloud Architecture & DevOps',
];

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialStudent,
}) => {
  const { showToast } = useToast();
  const { settings } = useAuth();
  const isEdit = Boolean(initialStudent);

  const [date, setDate] = useState(toInputDate());
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseDuration, setCourseDuration] = useState('6 Months');
  const [classMode, setClassMode] = useState<'Offline' | 'Online' | 'Hybrid'>('Offline');
  const [branch, setBranch] = useState<'Calicut' | 'Thirur'>('Calicut');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Cash']);
  const [totalCourseFee, setTotalCourseFee] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');

  const [courseOptions, setCourseOptions] = useState<string[]>(DEFAULT_COURSES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load courses for the dropdown
  useEffect(() => {
    if (!isOpen) return;

    courseApi
      .list()
      .then((data) => {
        if (data && data.length > 0) {
          const names = data.map((c) => c.name);
          setCourseOptions(names);
          if (!initialStudent && !courseName) {
            setCourseName(names[0]);
          }
        } else {
          setCourseOptions(DEFAULT_COURSES);
          if (!initialStudent && !courseName) {
            setCourseName(DEFAULT_COURSES[0]);
          }
        }
      })
      .catch(() => {
        setCourseOptions(DEFAULT_COURSES);
      });
  }, [isOpen, initialStudent, courseName]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (initialStudent) {
      setDate(toInputDate(initialStudent.registrationDate));
      setFullName(initialStudent.fullName);
      setPhoneNumber(initialStudent.phone);
      setCourseName(initialStudent.courseName);
      setCourseDuration(
        initialStudent.courseDuration === '1 Year' ? '1 Year' : '6 Months'
      );
      setClassMode(
        (initialStudent.classMode as 'Offline' | 'Online' | 'Hybrid') || 'Offline'
      );
      setBranch((initialStudent.branch as 'Calicut' | 'Thirur') || 'Calicut');

      // Parse payment method checkboxes
      const methods = initialStudent.paymentMethod
        ? initialStudent.paymentMethod.split(',').map((m) => m.trim())
        : ['Cash'];
      setPaymentMethods(methods.length > 0 ? methods : ['Cash']);

      setTotalCourseFee(String(initialStudent.totalCourseFee));
      setReceivedAmount(String(initialStudent.totalAmountPaid || 0));
    } else {
      setDate(toInputDate());
      setFullName('');
      setPhoneNumber('');
      setCourseName(courseOptions[0] || 'Full Stack Web Development Bootcamp');
      setCourseDuration('6 Months');
      setClassMode('Offline');
      setBranch('Calicut');
      setPaymentMethods(['Cash']);
      setTotalCourseFee('');
      setReceivedAmount('');
    }
  }, [isOpen, initialStudent]);

  if (!isOpen) return null;

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Student Name is required.');
      return;
    }

    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone || cleanPhone.replace(/[\s-]/g, '').length < 8) {
      setError('Please enter a valid WhatsApp Number (at least 8 digits).');
      return;
    }

    if (!courseName) {
      setError('Please select a Course.');
      return;
    }

    const numericFee = Number(totalCourseFee);
    if (isNaN(numericFee) || numericFee <= 0) {
      setError('Total Course Fee must be greater than 0.');
      return;
    }

    const numericReceived = Number(receivedAmount) || 0;
    if (numericReceived < 0) {
      setError('Received Amount cannot be negative.');
      return;
    }
    if (numericReceived > numericFee) {
      setError('Received Amount cannot exceed Total Course Fee.');
      return;
    }

    if (numericReceived > 0 && paymentMethods.length === 0) {
      setError('Please select at least one Payment Method (Cash or Bank).');
      return;
    }

    const payload: StudentPayload = {
      fullName: fullName.trim(),
      phone: cleanPhone,
      courseName: courseName.trim(),
      courseDuration,
      classMode,
      branch,
      paymentMethod: paymentMethods.join(', '),
      receivedAmount: numericReceived,
      totalCourseFee: numericFee,
      registrationDate: date,
      courseStartDate: date,
    };

    try {
      setSubmitting(true);
      if (isEdit && initialStudent) {
        const res = await studentApi.update(initialStudent._id, payload);
        showToast(res.message || 'Student updated successfully!', 'success');
        onSuccess(res.data);
      } else {
        const res = await studentApi.create(payload);
        showToast(res.message || 'Student registered successfully!', 'success');
        onSuccess(res.data);
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to save student record.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const numericTotal = Number(totalCourseFee) || 0;
  const numericPaid = Number(receivedAmount) || 0;
  const balancePreview = Math.max(0, numericTotal - numericPaid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEdit ? 'Edit Student' : 'Add Student'}
              </h2>
              <p className="text-xs text-indigo-200">
                {isEdit
                  ? 'Update student details and course enrollment'
                  : 'Enter student details and initial payment to enroll'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* 2. Student Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Student Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* 3. WhatsApp Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* 4. Course (Dropdown) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Course <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="" disabled>
                  Select Course
                </option>
                {courseOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Duration (Dropdown: 6 Months, 1 Year) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Duration <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={courseDuration}
                onChange={(e) => setCourseDuration(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year</option>
              </select>
            </div>

            {/* 6. Class Mode (Dropdown: Offline, Online, Hybrid) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Class Mode <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={classMode}
                onChange={(e) =>
                  setClassMode(e.target.value as 'Offline' | 'Online' | 'Hybrid')
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Offline">Offline</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* 7. Branch (Dropdown: Calicut, Thirur) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Branch <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value as 'Calicut' | 'Thirur')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Calicut">Calicut</option>
                <option value="Thirur">Thirur</option>
              </select>
            </div>

            {/* 8. Payment Method (Checkbox: Cash and Bank) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Payment Method
              </label>
              <div className="flex items-center gap-5 px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes('Cash')}
                    onChange={() => togglePaymentMethod('Cash')}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Cash</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes('Bank')}
                    onChange={() => togglePaymentMethod('Bank')}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Bank</span>
                </label>
              </div>
            </div>

            {/* 9. Total Course Fee */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Total Course Fee ({settings.currencySymbol || '₹'}){' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                placeholder="e.g., 45000"
                value={totalCourseFee}
                onChange={(e) => setTotalCourseFee(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* 10. Received Amount */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Received Amount ({settings.currencySymbol || '₹'})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g., 15000"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Fee Balance Preview strip */}
          {numericTotal > 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-600">
                Remaining Balance:{' '}
                <strong className="text-indigo-950 font-bold text-sm">
                  {settings.currencySymbol || '₹'}
                  {balancePreview.toLocaleString('en-IN')}
                </strong>
              </span>
              <span className="text-slate-500">
                Initial Status:{' '}
                <span className="font-semibold text-indigo-900">
                  {numericPaid >= numericTotal
                    ? 'Paid in Full'
                    : numericPaid > 0
                    ? 'Partially Paid'
                    : 'Pending'}
                </span>
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
