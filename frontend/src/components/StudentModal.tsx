import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { Student, StudentStatus } from '../types';
import { studentApi, StudentPayload } from '../services/api';
import { toInputDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Student) => void;
  initialStudent?: Student | null;
}

const POPULAR_COURSES = [
  'Full Stack Web Development Bootcamp',
  'Data Science & Machine Learning',
  'UI/UX Product Design Mastery',
  'Cloud Architecture & DevOps',
  'Cybersecurity & Ethical Hacking',
  'Mobile App Development (React Native & Flutter)',
];

const POPULAR_DURATIONS = ['3 Months', '4 Months', '6 Months', '8 Months', '1 Year'];

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialStudent,
}) => {
  const { showToast } = useToast();
  const { settings } = useAuth();
  const isEdit = Boolean(initialStudent);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseDuration, setCourseDuration] = useState('6 Months');
  const [courseStartDate, setCourseStartDate] = useState(toInputDate());
  const [totalCourseFee, setTotalCourseFee] = useState('');
  const [registrationDate, setRegistrationDate] = useState(toInputDate());
  const [status, setStatus] = useState<StudentStatus>('Active');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (initialStudent) {
      setFullName(initialStudent.fullName);
      setEmail(initialStudent.email);

      const rawPhone = initialStudent.phone.trim();
      const match = rawPhone.match(/^(\+\d{1,4})\s*(.*)$/);
      if (match) {
        setCountryCode(match[1]);
        setPhoneNumber(match[2]);
      } else {
        setCountryCode('+91');
        setPhoneNumber(rawPhone.replace(/^\+/, ''));
      }

      setCourseName(initialStudent.courseName);
      setCourseDuration(initialStudent.courseDuration);
      setCourseStartDate(toInputDate(initialStudent.courseStartDate));
      setTotalCourseFee(String(initialStudent.totalCourseFee));
      setRegistrationDate(toInputDate(initialStudent.registrationDate));
      setStatus(initialStudent.status);
    } else {
      setFullName('');
      setEmail('');
      setCountryCode('+91');
      setPhoneNumber('');
      setCourseName('');
      setCourseDuration('6 Months');
      setCourseStartDate(toInputDate());
      setTotalCourseFee('');
      setRegistrationDate(toInputDate());
      setStatus('Active');
    }
  }, [isOpen, initialStudent]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanDigits = phoneNumber.replace(/[\s-]/g, '');
    if (!/^\d{6,14}$/.test(cleanDigits)) {
      setError('Please enter a valid phone number (6 to 14 digits).');
      return;
    }

    const numericFee = Number(totalCourseFee);
    if (isNaN(numericFee) || numericFee <= 0) {
      setError('Total course fee must be greater than 0.');
      return;
    }

    const payload: StudentPayload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: `${countryCode.trim()} ${cleanDigits}`,
      courseName: courseName.trim(),
      courseDuration: courseDuration.trim(),
      courseStartDate,
      totalCourseFee: numericFee,
      registrationDate,
      status,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEdit ? `Edit Student (${initialStudent?.studentId})` : 'Register New Student'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEdit
                  ? 'Update student profile and course enrollment details'
                  : 'Student ID will be automatically generated upon registration'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Ananya Deshmukh"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
            </div>

            {/* Phone Number with Country Code */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Phone Number (with Country Code) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 px-2.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+61">+61 (AU)</option>
                  <option value="+971">+971 (AE)</option>
                  <option value="+65">+65 (SG)</option>
                </select>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
              </div>
            </div>

            {/* Student Status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Student Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StudentStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Course Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Course Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="course-suggestions"
                required
                placeholder="Select or type course name..."
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
              <datalist id="course-suggestions">
                {POPULAR_COURSES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Course Duration */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Course Duration <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="duration-suggestions"
                required
                placeholder="e.g., 6 Months"
                value={courseDuration}
                onChange={(e) => setCourseDuration(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
              <datalist id="duration-suggestions">
                {POPULAR_DURATIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            {/* Total Course Fee */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Total Course Fee ({settings.currencySymbol}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                placeholder="e.g., 45000"
                value={totalCourseFee}
                onChange={(e) => setTotalCourseFee(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
            </div>

            {/* Course Start Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Course Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={courseStartDate}
                onChange={(e) => setCourseStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* Registration Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Registration Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {submitting
                ? 'Saving...'
                : isEdit
                ? 'Save Changes'
                : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

