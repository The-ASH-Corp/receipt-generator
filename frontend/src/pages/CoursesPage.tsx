import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, BookOpen, X, Save, AlertCircle, AlertTriangle } from 'lucide-react';
import { Course } from '../types';
import { courseApi } from '../services/api';
import { useToast } from '../hooks/useToast';

export const CoursesPage: React.FC = () => {
  const { showToast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await courseApi.list();
      setCourses(data);
    } catch {
      showToast('Failed to load courses.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const openAddModal = () => {
    setEditingCourse(null);
    setCourseName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    setCourseName('');
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!courseName.trim()) {
      setFormError('Course name is required.');
      return;
    }

    try {
      setSaving(true);
      if (editingCourse) {
        const res = await courseApi.update(editingCourse._id, courseName.trim());
        showToast(res.message || 'Course updated.', 'success');
      } else {
        const res = await courseApi.create(courseName.trim());
        showToast(res.message || 'Course added.', 'success');
      }
      closeModal();
      fetchCourses();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    try {
      setDeleting(true);
      const res = await courseApi.remove(deletingCourse._id);
      showToast(res.message || 'Course deleted.', 'success');
      setDeletingCourse(null);
      fetchCourses();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete course.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Course button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-indigo-900 tracking-tight">
            Courses
          </h1>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-indigo-300" />
          <span>Add Course</span>
        </button>
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading courses...</div>
        ) : courses.length > 0 ? (
          <ul className="divide-y divide-slate-200/70">
            {courses.map((course) => (
              <li
                key={course._id}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {course.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(course)}
                    title="Edit Course"
                    className="p-2 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingCourse(course)}
                    title="Delete Course"
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="text-base font-bold text-slate-800">No courses added yet</div>
            <p className="text-xs text-slate-500">
              Click &ldquo;Add Course&rdquo; to create your first course.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-heading text-lg font-bold text-indigo-900">
                {editingCourse ? 'Edit Course' : 'Add Course'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Course Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g., Full Stack Web Development"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : editingCourse ? 'Save Changes' : 'Add Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-indigo-900">Delete Course</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete{' '}
                  <strong className="text-slate-900">{deletingCourse.name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingCourse(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

