import { Request, Response } from 'express';
import {
  listStudents,
  getStudentById,
  createStudentRecord,
  updateStudentRecord,
  deleteStudentRecord,
  listPayments,
} from '../services/dataStore';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_WITH_CODE_REGEX = /^\+\d{1,4}[\s-]?\d{6,14}$/;

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, course, status, paymentStatus } = req.query;
    const allStudents = await listStudents();
    const courses = Array.from(new Set(allStudents.map((s) => s.courseName))).filter(Boolean);

    const filtered = await listStudents({
      search: typeof search === 'string' ? search : undefined,
      course: typeof course === 'string' ? course : undefined,
      status: typeof status === 'string' ? status : undefined,
      paymentStatus: typeof paymentStatus === 'string' ? paymentStatus : undefined,
    });

    res.json({
      success: true,
      data: {
        students: filtered,
        courses,
        totalCount: allStudents.length,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to fetch students',
    });
  }
};

export const getStudentProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await getStudentById(id);

    if (!student) {
      res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
      return;
    }

    const paymentHistory = await listPayments({ studentId: student._id });

    res.json({
      success: true,
      data: {
        student,
        paymentHistory,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to load student profile',
    });
  }
};

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      studentId,
      fullName,
      email,
      phone,
      courseName,
      courseDuration,
      classMode,
      branch,
      paymentMethod,
      receivedAmount,
      courseStartDate,
      totalCourseFee,
      registrationDate,
      status,
    } = req.body;

    if (!fullName || !String(fullName).trim()) {
      res.status(400).json({ success: false, message: 'Student Name is required.' });
      return;
    }

    if (!studentId || !String(studentId).trim()) {
      res.status(400).json({
        success: false,
        message: 'Admission Number is required.',
      });
      return;
    }

    if (email && String(email).trim() && !EMAIL_REGEX.test(String(email).trim())) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
      return;
    }

    const cleanPhone = String(phone || '').trim();
    const phoneDigits = cleanPhone.replace(/[\s-]/g, '');
    if (!phoneDigits || phoneDigits.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid WhatsApp number.',
      });
      return;
    }

    if (!courseName || !String(courseName).trim()) {
      res.status(400).json({ success: false, message: 'Course is required.' });
      return;
    }
    if (!courseDuration || !String(courseDuration).trim()) {
      res.status(400).json({ success: false, message: 'Duration is required.' });
      return;
    }

    const numericFee = Number(totalCourseFee);
    if (isNaN(numericFee) || numericFee <= 0) {
      res.status(400).json({
        success: false,
        message: 'Total course fee must be a positive amount.',
      });
      return;
    }

    const numericReceived = Number(receivedAmount) || 0;
    if (numericReceived < 0) {
      res.status(400).json({
        success: false,
        message: 'Received amount cannot be negative.',
      });
      return;
    }
    if (numericReceived > numericFee) {
      res.status(400).json({
        success: false,
        message: 'Received amount cannot exceed total course fee.',
      });
      return;
    }

    const regDate = registrationDate || new Date().toISOString();

    const student = await createStudentRecord({
       studentId: String(studentId).trim(),
      fullName: String(fullName),
      email: email ? String(email).trim() : '',
      phone: cleanPhone,
      courseName: String(courseName),
      courseDuration: String(courseDuration),
      classMode: classMode || 'Offline',
      branch: branch || 'Calicut',
      paymentMethod: Array.isArray(paymentMethod) ? paymentMethod.join(', ') : paymentMethod || '',
      receivedAmount: numericReceived,
      courseStartDate: courseStartDate || regDate,
      totalCourseFee: numericFee,
      registrationDate: regDate,
      status: status === 'Inactive' ? 'Inactive' : 'Active',
    });

    res.status(201).json({
      success: true,
      message: `Student ${student.fullName} added successfully.`,
      data: student,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to create student',
    });
  }
};

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      studentId,
      fullName,
      email,
      phone,
      courseName,
      courseDuration,
      classMode,
      branch,
      paymentMethod,
      courseStartDate,
      totalCourseFee,
      registrationDate,
      status,
    } = req.body;

    if (email && String(email).trim() && !EMAIL_REGEX.test(String(email).trim())) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
      return;
    }

    const cleanPhone = phone !== undefined ? String(phone).trim() : undefined;

    const updated = await updateStudentRecord(id, {
      studentId,
      fullName,
      email,
      phone: cleanPhone,
      courseName,
      courseDuration,
      classMode,
      branch,
      paymentMethod: Array.isArray(paymentMethod) ? paymentMethod.join(', ') : paymentMethod,
      courseStartDate,
      totalCourseFee: totalCourseFee !== undefined ? Number(totalCourseFee) : undefined,
      registrationDate,
      status,
    });

    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Student details updated successfully.',
      data: updated,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to update student',
    });
  }
};

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await deleteStudentRecord(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
      return;
    }
    res.json({
      success: true,
      message: 'Student deleted successfully.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to delete student',
    });
  }
};


