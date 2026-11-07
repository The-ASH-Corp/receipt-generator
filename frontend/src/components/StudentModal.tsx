import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { Student } from '../types';
import { studentApi, courseApi, StudentPayload } from '../services/api';
import { toInputDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import Select from './Select';
import DatePicker from './DatePicker';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Student) => void;
  initialStudent?: Student | null;
}

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
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseDuration, setCourseDuration] = useState('6 Months');
  const [classMode, setClassMode] = useState<'Offline' | 'Online' | 'Hybrid' | 'Recorded'>('Offline');
  const [branch, setBranch] = useState<'Calicut' | 'Tirur'>('Calicut');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Cash']);
  const [totalCourseFee, setTotalCourseFee] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');

  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load courses for the dropdown
  useEffect(() => {
    if (!isOpen) return;

    courseApi
      .list()
      .then((data) => {
        const names = data.map((c) => c.name);
        setCourseOptions(names);

        if (!initialStudent && names.length > 0) {
          setCourseName(names[0]);
        }
      })
      .catch(() => {
        setCourseOptions([]);
        showToast('Failed to load courses.', 'error');
      });
  }, [isOpen, initialStudent, showToast]);


  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (initialStudent) {
      setDate(toInputDate(initialStudent.registrationDate));
      setFullName(initialStudent.fullName);
      setPhoneNumber(initialStudent.phone);
      setCourseName(initialStudent.courseName);
      setStudentId(initialStudent.studentId || '');
      setEmail(initialStudent.email || '');
      setCourseDuration(initialStudent.courseDuration || '6 Months');
      setClassMode(
        (initialStudent.classMode as 'Offline' | 'Online' | 'Hybrid' | 'Recorded') || 'Offline'
      );
      setBranch((initialStudent.branch as 'Calicut' | 'Tirur') || 'Calicut');

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
      setCourseName('');
      setStudentId('');
      setEmail('');
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
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!courseName) {
      setError('Please select a Course.');
      return;
    }
    const numericFee = Number(totalCourseFee);
    const numericReceived = Number(receivedAmount) || 0;
    if (!isEdit) {
      if (isNaN(numericFee) || numericFee <= 0) {
        setError('Total Course Fee must be greater than 0.');
        return;
      }
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
    }

    const payload: StudentPayload = {
      fullName: fullName.trim(),
      phone: cleanPhone,
      courseName: courseName.trim(),
      studentId: studentId.trim(),
      email: email.trim(),
      courseDuration,
      classMode,
      branch,
      paymentMethod: paymentMethods.join(', '),
      receivedAmount: isEdit
        ? initialStudent?.totalAmountPaid || 0
        : numericReceived,

      totalCourseFee: isEdit
        ? initialStudent?.totalCourseFee || 0
        : numericFee,
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
        showToast(res.message || 'Student added successfully!', 'success');
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4  pt-20 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {isEdit ? 'Edit Student' : 'Add Student'}
              </h2>
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
              <DatePicker
                value={date}
                onChange={setDate}
                required
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
            {/* Admission Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Admission Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter Admission Number"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex w-full rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600">
                <span className="inline-flex items-center px-3.5 bg-slate-50 border-r border-slate-300 text-sm font-medium text-slate-600">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  minLength={10}
                  pattern="[6-9][0-9]{9}"
                  placeholder="Enter 10 digit number"
                  value={phoneNumber}
                  // onChange={(e) => setPhoneNumber(e.target.value)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setPhoneNumber(value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>


            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Course <span className="text-rose-500">*</span>
              </label>
              <Select
                value={courseName}
                onChange={setCourseName}
                placeholder="Select Course"
                options={courseOptions.map((course) => ({
                  label: course,
                  value: course,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Duration <span className="text-rose-500">*</span>
              </label>
              <Select
                required
                value={courseDuration}
                onChange={setCourseDuration}
                options={[
                  { label: "1 Months", value: "1 Months" },
                  { label: "2 Months", value: "2 Months" },
                  { label: "3 Months", value: "3 Months" },
                  { label: "4 Months", value: "4 Months" },
                  { label: "5 Months", value: "5 Months" },
                  { label: "6 Months", value: "6 Months" },
                  { label: "7 Months", value: "7 Months" },
                  { label: "8 Months", value: "8 Months" },
                  { label: "9 Months", value: "9 Months" },
                  { label: "10 Months", value: "10 Months" },
                  { label: "11 Months", value: "11 Months" },
                  { label: "1 Year", value: "1 Year" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Class Mode <span className="text-rose-500">*</span>
              </label>
              <Select
                required
                value={classMode}
                onChange={(value) =>
                  setClassMode(value as 'Offline' | 'Online' | 'Hybrid' | 'Recorded')
                }
                options={[
                  { label: 'Offline', value: 'Offline' },
                  { label: 'Online', value: 'Online' },
                  { label: 'Hybrid', value: 'Hybrid' },
                  { label: 'Recorded', value: 'Recorded' },
                ]}
              />
            </div>

            {/* 7. Branch (Dropdown: Calicut, Thirur) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Branch <span className="text-rose-500">*</span>
              </label>
              <Select
                required
                value={branch}
                onChange={(value) =>
                  setBranch(value as 'Calicut' | 'Tirur')
                }
                options={[
                  { label: 'Calicut', value: 'Calicut' },
                  { label: 'Tirur', value: 'Tirur' },
                ]}
              />
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


            {!isEdit && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Total Course Fee ({settings.currencySymbol || '₹'}){" "}
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
              </>
            )}
          </div>

          {/* Fee Balance Preview strip */}
          {!isEdit && numericTotal > 0 && (
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
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
