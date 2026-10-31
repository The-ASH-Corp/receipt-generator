import { Request, Response } from 'express';
import {
  listStudents,
  getStudentById,
  createStudentRecord,
  updateStudentRecord,
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
      fullName,
      email,
      phone,
      courseName,
      courseDuration,
      courseStartDate,
      totalCourseFee,
      registrationDate,
      status,
    } = req.body;

    if (!fullName || !String(fullName).trim()) {
      res.status(400).json({ success: false, message: 'Full name is required.' });
      return;
    }
    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
      return;
    }
    const cleanPhone = String(phone || '').trim().replace(/\s+/g, ' ');
    if (!cleanPhone || !PHONE_WITH_CODE_REGEX.test(cleanPhone.replace(/[\s-]/g, ''))) {
      res.status(400).json({
        success: false,
        message:
          'Phone number must include country code (e.g., +91 9876543210 or +1 5550192834).',
      });
      return;
    }
    if (!courseName || !String(courseName).trim()) {
      res.status(400).json({ success: false, message: 'Course name is required.' });
      return;
    }
    if (!courseDuration || !String(courseDuration).trim()) {
      res.status(400).json({ success: false, message: 'Course duration is required.' });
      return;
    }
    if (!courseStartDate || isNaN(new Date(courseStartDate).getTime())) {
      res.status(400).json({ success: false, message: 'Valid course start date is required.' });
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

    const student = await createStudentRecord({
      fullName: String(fullName),
      email: String(email),
      phone: cleanPhone,
      courseName: String(courseName),
      courseDuration: String(courseDuration),
      courseStartDate,
      totalCourseFee: numericFee,
      registrationDate: registrationDate || new Date().toISOString(),
      status: status === 'Inactive' ? 'Inactive' : 'Active',
    });

    res.status(201).json({
      success: true,
      message: `Student ${student.fullName} (${student.studentId}) registered successfully.`,
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
      fullName,
      email,
      phone,
      courseName,
      courseDuration,
      courseStartDate,
      totalCourseFee,
      registrationDate,
      status,
    } = req.body;

    if (email !== undefined && !EMAIL_REGEX.test(String(email).trim())) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
      return;
    }

    if (phone !== undefined) {
      const cleanPhone = String(phone).trim();
      if (!PHONE_WITH_CODE_REGEX.test(cleanPhone.replace(/[\s-]/g, ''))) {
        res.status(400).json({
          success: false,
          message: 'Phone number must include country code (e.g., +91 9876543210).',
        });
        return;
      }
    }

    const updated = await updateStudentRecord(id, {
      fullName,
      email,
      phone,
      courseName,
      courseDuration,
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

