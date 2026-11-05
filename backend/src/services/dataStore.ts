import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { isMongoConnected } from '../config/db';
import {
  StudentModel,
  IStudent,
  StudentStatusType,
  ClassModeType,
  BranchType,
} from '../models/Student';
import { PaymentModel, IPayment, PaymentMethodType } from '../models/Payment';
import { SettingsModel, ISettings } from '../models/Settings';
import { AdminModel, IAdmin } from '../models/Admin';
import { CourseModel, ICourse } from '../models/Course';
import { CounterModel } from '../models/Counter';
import { calculateFeeBreakdown, formatSequentialCode } from '../utils/idGenerator';

interface LocalDatabaseSchema {
  students: IStudent[];
  payments: IPayment[];
  courses?: ICourse[];
  settings?: ISettings;
  admins: IAdmin[];
  counters: Record<string, number>;
}

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'database.local.json');

// Simple async mutex to ensure atomic operations & prevent race conditions on concurrent requests
class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void = () => { };
    const prev = this.queue;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

const txMutex = new AsyncMutex();

// const DEFAULT_SETTINGS: ISettings = {
//   academyName: 'ASH ACADEMY',
//   academyLogo: '/ash-academy-logo.png',
//   address: '2nd Floor, OPS Mall, Vailathur,Tirur',
//   phone: '+91 8921365750',
//   email: 'connect@ashacademy.ai',
//   website: 'www.ashacademy.ai',
//   receiptPrefix: 'e',
//   receiptFooterMessage: 'Please note: All payments are final and non-refundable.',
//   currencySymbol: '₹',
//   selectedBranch: 'Thirur',
//   branches: {
//     Thirur: {
//       address: '2nd Floor, OPS Mall, Vailathur,Tirur',
//       phone: '+91 8921365750',
//       email: 'connect@ashacademy.ai',
//       website: 'www.ashacademy.ai',
//       receiptPrefix: 'e',
//       receiptFooterMessage: 'Please note: All payments are final and non-refundable.',
//     },
//     Calicut: {
//       address: 'Hilite Business Park, Palazhi, Calicut, Pantheeramkav, Kerala',
//       phone: '+91 8921365750',
//       email: 'connect@ashacademy.ai',
//       website: 'www.ashacademy.ai',
//       receiptPrefix: 'e',
//       receiptFooterMessage: 'Please note: All payments are final and non-refundable.',
//     },
//   },
// };

const readLocalDB = (): LocalDatabaseSchema => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: LocalDatabaseSchema = {
      students: [],
      payments: [],
      // settings: { ...DEFAULT_SETTINGS },
      admins: [],
      counters: {
        student: 0,
        receipt: 0,
      },
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw) as LocalDatabaseSchema;
};

const writeLocalDB = (data: LocalDatabaseSchema): void => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
};

const generateObjectId = (): string => crypto.randomBytes(12).toString('hex');

// export const initializeDefaults = async (): Promise<void> => {
//   const defaultCourses = [
//     'Full Stack Web Development Bootcamp',
//     'Data Science & Machine Learning',
//     'UI/UX Product Design Mastery',
//     'Cloud Architecture & DevOps',
//   ];

//   if (isMongoConnected()) {
//     const existingSettings = await SettingsModel.findOne();
//     if (!existingSettings) {
//       await SettingsModel.create(DEFAULT_SETTINGS);
//     }

//     const courseCount = await CourseModel.countDocuments();
//     if (courseCount === 0) {
//       for (const name of defaultCourses) {
//         await CourseModel.create({ name });
//       }
//     }
//   } else {
//     await txMutex.runExclusive(async () => {
//       const db = readLocalDB();
//       if (!db.settings || !db.settings.academyName) {
//         db.settings = { ...DEFAULT_SETTINGS };
//       }
//       if (!db.courses || db.courses.length === 0) {
//         const now = new Date().toISOString();
//         db.courses = defaultCourses.map((name) => ({
//           _id: generateObjectId(),
//           name,
//           createdAt: now,
//           updatedAt: now,
//         }));
//       }
//       writeLocalDB(db);
//     });
//   }
// };



export const initializeDefaults = async (): Promise<void> => {
  if (!isMongoConnected()) {
    await txMutex.runExclusive(async () => {
      readLocalDB(); // Only initialize the local database file
    });
  }
};





// Next sequence generator (atomic)
const getNextSequence = async (key: string): Promise<number> => {
  if (isMongoConnected()) {
    const counter = await CounterModel.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return counter.seq;
  } else {
    const db = readLocalDB();
    const current = db.counters[key] || 0;
    const next = current + 1;
    db.counters[key] = next;
    writeLocalDB(db);
    return next;
  }
};

// Admin Auth
export const findAdminByEmail = async (email: string): Promise<IAdmin | null> => {
  const normalized = email.toLowerCase().trim();
  if (isMongoConnected()) {
    const doc = await AdminModel.findOne({ email: normalized }).lean();
    return doc ? { ...doc, _id: String(doc._id) } : null;
  } else {
    const db = readLocalDB();
    return db.admins.find((a) => a.email === normalized) || null;
  }
};

export const createAdminRecord = async (input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<IAdmin> => {
  return txMutex.runExclusive(async () => {
    const cleanName = input.name.trim();
    const cleanEmail = input.email.toLowerCase().trim();

    if (isMongoConnected()) {
      const existing = await AdminModel.findOne({ email: cleanEmail });
      if (existing) {
        throw new Error('An admin with this email address is already registered.');
      }
      const created = await AdminModel.create({
        name: cleanName,
        email: cleanEmail,
        passwordHash: input.passwordHash,
      });
      return {
        _id: String(created._id),
        name: created.name,
        email: created.email,
        passwordHash: created.passwordHash,
      };
    } else {
      const db = readLocalDB();
      if (db.admins.some((a) => a.email === cleanEmail)) {
        throw new Error('An admin with this email address is already registered.');
      }
      const newAdmin: IAdmin = {
        _id: generateObjectId(),
        name: cleanName,
        email: cleanEmail,
        passwordHash: input.passwordHash,
      };
      db.admins.push(newAdmin);
      writeLocalDB(db);
      return newAdmin;
    }
  });
};

// Settings
// export const getInstitutionSettings = async (): Promise<ISettings> => {
//   if (isMongoConnected()) {
//     const doc = await SettingsModel.findOne().lean();
//     if (!doc) {
//       const created = await SettingsModel.create(DEFAULT_SETTINGS);
//       const obj = created.toObject();
//       return { ...DEFAULT_SETTINGS, ...obj, _id: String(obj._id) };
//     }
//     return { ...DEFAULT_SETTINGS, ...doc, _id: String(doc._id) };
//   } else {
//     const db = readLocalDB();
//     return db.settings || { ...DEFAULT_SETTINGS };
//   }
// };

export const getInstitutionSettings = async (): Promise<ISettings | null> => {
  if (isMongoConnected()) {
    const doc = await SettingsModel.findOne().lean();

    if (!doc) return null;

    return {
      ...doc,
      _id: String(doc._id),
    } as ISettings;
  }

  const db = readLocalDB();
  return db.settings || null;
};

// export const updateInstitutionSettings = async (
//   updates: Partial<ISettings>
// ): Promise<ISettings> => {
//   return txMutex.runExclusive(async () => {
//     // const cleanUpdates: Partial<ISettings> = {
//     //   academyName: updates.academyName?.trim() || DEFAULT_SETTINGS.academyName,
//     //   academyLogo: updates.academyLogo !== undefined ? updates.academyLogo : '',
//     //   address: updates.address?.trim() || DEFAULT_SETTINGS.address,
//     //   phone: updates.phone?.trim() || DEFAULT_SETTINGS.phone,
//     //   email: updates.email?.trim() || DEFAULT_SETTINGS.email,
//     //   website: updates.website?.trim() ?? DEFAULT_SETTINGS.website,
//     //   receiptPrefix: (updates.receiptPrefix?.trim() || 'e').toUpperCase(),
//     //   receiptFooterMessage:
//     //     updates.receiptFooterMessage?.trim() || DEFAULT_SETTINGS.receiptFooterMessage,
//     //   currencySymbol: updates.currencySymbol?.trim() || '₹',
//     //   selectedBranch: updates.selectedBranch || 'Thirur',
//     //   branches: updates.branches || DEFAULT_SETTINGS.branches,
//     //   updatedAt: new Date().toISOString(),
//     // };
//     const cleanUpdates: Partial<ISettings> = {
//       ...(updates.academyName !== undefined && {
//         academyName: updates.academyName.trim(),
//       }),
//       ...(updates.academyLogo !== undefined && {
//         academyLogo: updates.academyLogo,
//       }),
//       ...(updates.address !== undefined && {
//         address: updates.address.trim(),
//       }),
//       ...(updates.phone !== undefined && {
//         phone: updates.phone.trim(),
//       }),
//       ...(updates.email !== undefined && {
//         email: updates.email.trim(),
//       }),
//       ...(updates.website !== undefined && {
//         website: updates.website.trim(),
//       }),
//       ...(updates.receiptPrefix !== undefined && {
//         receiptPrefix: updates.receiptPrefix.trim().toUpperCase(),
//       }),
//       ...(updates.receiptFooterMessage !== undefined && {
//         receiptFooterMessage: updates.receiptFooterMessage.trim(),
//       }),
//       ...(updates.currencySymbol !== undefined && {
//         currencySymbol: updates.currencySymbol.trim(),
//       }),
//       ...(updates.selectedBranch !== undefined && {
//         selectedBranch: updates.selectedBranch,
//       }),
//       ...(updates.branches !== undefined && {
//         branches: updates.branches,
//       }),
//       updatedAt: new Date().toISOString(),
//     };

//     if (isMongoConnected()) {
//       const existing = await SettingsModel.findOne();
//       if (existing) {
//         Object.assign(existing, cleanUpdates);
//         await existing.save();
//         return { ...existing.toObject(), _id: String(existing._id) };
//       } else {
//         const created = await SettingsModel.create(cleanUpdates);
//         return { ...created.toObject(), _id: String(created._id) };
//       }
//     } else {
//       const db = readLocalDB();
//       db.settings = {
//         ...db.settings,
//         ...cleanUpdates,
//       };
//       writeLocalDB(db);
//       return db.settings;
//     }
//   });
// };

// Recompute student fee totals strictly from immutable payment records

export const updateInstitutionSettings = async (
  updates: Partial<ISettings>
): Promise<ISettings> => {
  return txMutex.runExclusive(async () => {
    const cleanUpdates: Partial<ISettings> = {
      ...(updates.academyName !== undefined && {
        academyName: updates.academyName.trim(),
      }),
      ...(updates.academyLogo !== undefined && {
        academyLogo: updates.academyLogo,
      }),
      ...(updates.address !== undefined && {
        address: updates.address.trim(),
      }),
      ...(updates.phone !== undefined && {
        phone: updates.phone.trim(),
      }),
      ...(updates.email !== undefined && {
        email: updates.email.trim(),
      }),
      ...(updates.website !== undefined && {
        website: updates.website.trim(),
      }),
      ...(updates.receiptPrefix !== undefined && {
        receiptPrefix: updates.receiptPrefix.trim().toUpperCase(),
      }),
      ...(updates.receiptFooterMessage !== undefined && {
        receiptFooterMessage: updates.receiptFooterMessage.trim(),
      }),
      ...(updates.currencySymbol !== undefined && {
        currencySymbol: updates.currencySymbol.trim(),
      }),
      ...(updates.selectedBranch !== undefined && {
        selectedBranch: updates.selectedBranch,
      }),
      ...(updates.branches !== undefined && {
        branches: updates.branches,
      }),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConnected()) {
      let existing = await SettingsModel.findOne();

      if (!existing) {
        existing = new SettingsModel(cleanUpdates);
      } else {
        Object.assign(existing, cleanUpdates);
      }

      await existing.save();

      return {
        ...existing.toObject(),
        _id: String(existing._id),
      } as ISettings;
    }

    const db = readLocalDB();

    db.settings = {
      ...(db.settings || {}),
      ...cleanUpdates,
    } as ISettings;

    writeLocalDB(db);

    return db.settings;
  });
};




const recomputeStudentBalance = async (studentInternalId: string): Promise<IStudent | null> => {
  if (isMongoConnected()) {
    const student = await StudentModel.findById(studentInternalId);
    if (!student) return null;
    const payments = await PaymentModel.find({ student: String(student._id) }).lean();
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const breakdown = calculateFeeBreakdown(student.totalCourseFee, totalPaid);

    student.totalAmountPaid = breakdown.totalAmountPaid;
    student.remainingBalance = breakdown.remainingBalance;
    student.paymentStatus = breakdown.paymentStatus;
    await student.save();
    return { ...student.toObject(), _id: String(student._id) };
  } else {
    const db = readLocalDB();
    const idx = db.students.findIndex((s) => s._id === studentInternalId);
    if (idx === -1) return null;
    const student = db.students[idx];
    const payments = db.payments.filter((p) => p.student === student._id);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const breakdown = calculateFeeBreakdown(student.totalCourseFee, totalPaid);

    student.totalAmountPaid = breakdown.totalAmountPaid;
    student.remainingBalance = breakdown.remainingBalance;
    student.paymentStatus = breakdown.paymentStatus;
    student.updatedAt = new Date().toISOString();
    db.students[idx] = student;
    writeLocalDB(db);
    return student;
  }
};

// Students CRUD
export interface CreateStudentInput {
  studentId: string;
  fullName: string;
  email?: string;
  phone: string;
  courseName: string;
  courseDuration: string;
  classMode?: ClassModeType;
  branch?: BranchType;
  paymentMethod?: string;
  receivedAmount?: number;
  courseStartDate?: string | Date;
  totalCourseFee: number;
  registrationDate?: string | Date;
  status?: StudentStatusType;
}

export const createStudentRecord = async (input: CreateStudentInput): Promise<IStudent> => {
  return txMutex.runExclusive(async () => {
    const studentId = input.studentId.trim();

    if (!studentId) {
      throw new Error('Admission Number is required.');
    }
    if (isMongoConnected()) {
      const existingStudent = await StudentModel.findOne({ studentId });

      if (existingStudent) {
        throw new Error('A student with this Admission Number already exists.');
      }
    } else {
      const db = readLocalDB();

      if (db.students.some(
        (student) => student.studentId.toLowerCase() === studentId.toLowerCase()
      )) {
        throw new Error('A student with this Admission Number already exists.');
      }
    }
    const fee = Math.round(Number(input.totalCourseFee) * 100) / 100;
    const initialPaid = Math.max(
      0,
      Math.min(fee, Math.round(Number(input.receivedAmount || 0) * 100) / 100)
    );
    const breakdown = calculateFeeBreakdown(fee, initialPaid);
    const now = new Date().toISOString();
    const regDate = input.registrationDate ? new Date(input.registrationDate) : new Date();
    const startDate = input.courseStartDate ? new Date(input.courseStartDate) : regDate;

    let createdStudent: IStudent;

    if (isMongoConnected()) {
      const settings = await getInstitutionSettings();

      if (!settings?.receiptPrefix?.trim()) {
        throw new Error(
          'Please configure the receipt prefix in Institution Settings before recording payments.'
        );
      }

      const prefix = settings.receiptPrefix.trim();
      const created = await StudentModel.create({
        studentId,
        fullName: input.fullName.trim(),
        email: input.email ? input.email.toLowerCase().trim() : '',
        phone: input.phone.trim(),
        courseName: input.courseName.trim(),
        courseDuration: input.courseDuration.trim(),
        classMode: input.classMode || 'Offline',
        branch: input.branch || 'Calicut',
        paymentMethod: input.paymentMethod || '',
        courseStartDate: startDate,
        totalCourseFee: breakdown.totalCourseFee,
        totalAmountPaid: breakdown.totalAmountPaid,
        remainingBalance: breakdown.remainingBalance,
        paymentStatus: breakdown.paymentStatus,
        registrationDate: regDate,
        status: input.status || 'Active',
      });
      createdStudent = { ...created.toObject(), _id: String(created._id) };

      if (initialPaid > 0) {
        const settings = await getInstitutionSettings();
        // const prefix = settings.receiptPrefix || 'e';
        if (!settings?.receiptPrefix?.trim()) {
          throw new Error(
            'Please configure the receipt prefix in Institution Settings before recording payments.'
          );
        }

        const prefix = settings.receiptPrefix.trim().toUpperCase();
        const receiptSeq = await getNextSequence('receipt');
        const receiptNumber = formatSequentialCode(prefix, receiptSeq, regDate);

        await PaymentModel.create({
          receiptNumber,
          student: String(created._id),
          studentId: createdStudent.studentId,
          studentName: createdStudent.fullName,
          studentEmail: createdStudent.email || '',
          studentPhone: createdStudent.phone,
          courseName: createdStudent.courseName,
          amount: initialPaid,
          totalCourseFeeSnapshot: createdStudent.totalCourseFee,
          previousAmountPaid: 0,
          totalAmountPaidAfter: initialPaid,
          remainingBalanceAfter: breakdown.remainingBalance,
          paymentStatusAfter: breakdown.paymentStatus,
          paymentDate: regDate,
          paymentMethod: input.paymentMethod || 'Cash',
          transactionReference: 'Initial Registration Payment',
          branch: input.branch || createdStudent.branch || 'Calicut',
        });
      }
    } else {
      const db = readLocalDB();
      if (db.students.some((s) => s.studentId === studentId)) {
        throw new Error(`Duplicate Student ID generated: ${studentId}`);
      }
      const newStudentId = generateObjectId();
      const newStudent: IStudent = {
        _id: newStudentId,
        studentId,
        fullName: input.fullName.trim(),
        email: input.email ? input.email.toLowerCase().trim() : '',
        phone: input.phone.trim(),
        courseName: input.courseName.trim(),
        courseDuration: input.courseDuration.trim(),
        classMode: input.classMode || 'Offline',
        branch: input.branch || 'Calicut',
        paymentMethod: input.paymentMethod || '',
        courseStartDate: startDate.toISOString(),
        totalCourseFee: breakdown.totalCourseFee,
        totalAmountPaid: breakdown.totalAmountPaid,
        remainingBalance: breakdown.remainingBalance,
        paymentStatus: breakdown.paymentStatus,
        registrationDate: regDate.toISOString(),
        status: input.status || 'Active',
        createdAt: now,
        updatedAt: now,
      };
      db.students.unshift(newStudent);

      if (initialPaid > 0) {
        const settings = await getInstitutionSettings();

        if (!settings?.receiptPrefix?.trim()) {
          throw new Error(
            'Please configure the receipt prefix in Institution Settings before recording payments.'
          );
        }

        const prefix = settings.receiptPrefix.trim().toUpperCase();
        const receiptSeq = (db.counters['receipt'] || 0) + 1;
        db.counters['receipt'] = receiptSeq;
        const receiptNumber = formatSequentialCode(prefix, receiptSeq, regDate);

        const newPayment: IPayment = {
          _id: generateObjectId(),
          receiptNumber,
          student: newStudentId,
          studentId: newStudent.studentId,
          studentName: newStudent.fullName,
          studentEmail: newStudent.email || '',
          studentPhone: newStudent.phone,
          courseName: newStudent.courseName,
          amount: initialPaid,
          totalCourseFeeSnapshot: newStudent.totalCourseFee,
          previousAmountPaid: 0,
          totalAmountPaidAfter: initialPaid,
          remainingBalanceAfter: breakdown.remainingBalance,
          paymentStatusAfter: breakdown.paymentStatus,
          paymentDate: regDate.toISOString(),
          paymentMethod: (input.paymentMethod as any) || 'Cash',
          transactionReference: 'Initial Registration Payment',
          branch: input.branch || 'Calicut',
          createdAt: now,
        };
        db.payments.unshift(newPayment);
      }

      writeLocalDB(db);
      createdStudent = newStudent;
    }

    return createdStudent;
  });
};

export const updateStudentRecord = async (
  id: string,
  updates: Partial<CreateStudentInput>
): Promise<IStudent | null> => {
  return txMutex.runExclusive(async () => {
    if (isMongoConnected()) {
      const student = await StudentModel.findById(id);
      if (!student) return null;

      const payments = await PaymentModel.find({ student: String(student._id) }).lean();
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      if (updates.totalCourseFee !== undefined) {
        const newFee = Number(updates.totalCourseFee);
        if (newFee < totalPaid) {
          throw new Error(
            `Total course fee (${newFee}) cannot be set lower than total amount already paid (${totalPaid}).`
          );
        }
        student.totalCourseFee = newFee;
      }
      if (updates.fullName !== undefined) student.fullName = updates.fullName.trim();
      if (updates.email !== undefined) student.email = updates.email.toLowerCase().trim();
      if (updates.phone !== undefined) student.phone = updates.phone.trim();
      if (updates.studentId !== undefined) {
        const cleanStudentId = String(updates.studentId ?? '').trim();

        const duplicate = await StudentModel.findOne({
          studentId: cleanStudentId,
          _id: { $ne: student._id },
        });

        if (duplicate) {
          throw new Error('A student with this Admission Number already exists.');
        }

        student.studentId = cleanStudentId;
      }
      if (updates.courseName !== undefined) student.courseName = updates.courseName.trim();
      if (updates.courseDuration !== undefined)
        student.courseDuration = updates.courseDuration.trim();
      if (updates.classMode !== undefined) student.classMode = updates.classMode;
      if (updates.branch !== undefined) student.branch = updates.branch;
      if (updates.paymentMethod !== undefined) student.paymentMethod = updates.paymentMethod;
      if (updates.courseStartDate !== undefined)
        student.courseStartDate = new Date(updates.courseStartDate);
      if (updates.registrationDate !== undefined)
        student.registrationDate = new Date(updates.registrationDate);
      if (updates.status !== undefined) student.status = updates.status;

      const breakdown = calculateFeeBreakdown(student.totalCourseFee, totalPaid);
      student.totalAmountPaid = breakdown.totalAmountPaid;
      student.remainingBalance = breakdown.remainingBalance;
      student.paymentStatus = breakdown.paymentStatus;

      await student.save();
      return { ...student.toObject(), _id: String(student._id) };
    } else {
      const db = readLocalDB();
      const idx = db.students.findIndex((s) => s._id === id || s.studentId === id);
      if (idx === -1) return null;
      const student = db.students[idx];

      const payments = db.payments.filter((p) => p.student === student._id);
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      if (updates.totalCourseFee !== undefined) {
        const newFee = Number(updates.totalCourseFee);
        if (newFee < totalPaid) {
          throw new Error(
            `Total course fee (${newFee}) cannot be set lower than total amount already paid (${totalPaid}).`
          );
        }
        student.totalCourseFee = newFee;
      }
      if (updates.fullName !== undefined) student.fullName = updates.fullName.trim();
      if (updates.email !== undefined) student.email = updates.email.toLowerCase().trim();
      if (updates.phone !== undefined) student.phone = updates.phone.trim();
      if (updates.courseName !== undefined) student.courseName = updates.courseName.trim();
      if (updates.courseDuration !== undefined)
        student.courseDuration = updates.courseDuration.trim();
      if (updates.classMode !== undefined) student.classMode = updates.classMode;
      if (updates.branch !== undefined) student.branch = updates.branch;
      if (updates.paymentMethod !== undefined) student.paymentMethod = updates.paymentMethod;
      if (updates.courseStartDate !== undefined)
        student.courseStartDate = new Date(updates.courseStartDate).toISOString();
      if (updates.registrationDate !== undefined)
        student.registrationDate = new Date(updates.registrationDate).toISOString();
      if (updates.status !== undefined) student.status = updates.status;
      if (updates.studentId !== undefined) {
        const cleanStudentId = String(updates.studentId ?? '').trim();
        const duplicate = db.students.some(
          (s, i) =>
            i !== idx &&
            s.studentId.toLowerCase() === cleanStudentId.toLowerCase()
        );

        if (duplicate) {
          throw new Error('A student with this Admission Number already exists.');
        }

        student.studentId = cleanStudentId;
      }

      const breakdown = calculateFeeBreakdown(student.totalCourseFee, totalPaid);
      student.totalAmountPaid = breakdown.totalAmountPaid;
      student.remainingBalance = breakdown.remainingBalance;
      student.paymentStatus = breakdown.paymentStatus;
      student.updatedAt = new Date().toISOString();

      db.students[idx] = student;
      writeLocalDB(db);
      return student;
    }
  });
};

export const deleteStudentRecord = async (id: string): Promise<boolean> => {
  return txMutex.runExclusive(async () => {
    if (isMongoConnected()) {
      let student = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        student = await StudentModel.findById(id);
      }
      if (!student) {
        student = await StudentModel.findOne({ studentId: id });
      }
      if (!student) return false;

      const internalId = String(student._id);
      const studentCode = student.studentId;

      await StudentModel.findByIdAndDelete(internalId);
      await PaymentModel.deleteMany({
        $or: [{ student: internalId }, { studentId: studentCode }],
      });
      return true;
    } else {
      const db = readLocalDB();
      const idx = db.students.findIndex((s) => s._id === id || s.studentId === id);
      if (idx === -1) return false;
      const student = db.students[idx];
      db.students.splice(idx, 1);
      db.payments = db.payments.filter(
        (p) => p.student !== student._id && p.studentId !== student.studentId
      );
      writeLocalDB(db);
      return true;
    }
  });
};

export interface StudentFilterQuery {
  search?: string;
  course?: string;
  status?: string;
  paymentStatus?: string;
}

export const listStudents = async (query: StudentFilterQuery = {}): Promise<IStudent[]> => {
  let students: IStudent[] = [];

  if (isMongoConnected()) {
    const docs = await StudentModel.find().sort({ createdAt: -1 }).lean();
    students = docs.map((d) => ({ ...d, _id: String(d._id) }));
  } else {
    const db = readLocalDB();
    students = [...db.students].sort(
      (a, b) =>
        new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
    );
  }

  if (query.search && query.search.trim()) {
    const q = query.search.toLowerCase().trim();
    students = students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        s.studentId.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q)
    );
  }

  if (query.course && query.course !== 'All') {
    students = students.filter((s) => s.courseName === query.course);
  }

  if (query.status && query.status !== 'All') {
    students = students.filter((s) => s.status === query.status);
  }

  if (query.paymentStatus && query.paymentStatus !== 'All') {
    students = students.filter((s) => s.paymentStatus === query.paymentStatus);
  }

  return students;
};

export const getStudentById = async (id: string): Promise<IStudent | null> => {
  if (isMongoConnected()) {
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await StudentModel.findById(id).lean();
    }
    if (!doc) {
      doc = await StudentModel.findOne({ studentId: id }).lean();
    }
    if (!doc) return null;
    return recomputeStudentBalance(String(doc._id));
  } else {
    const db = readLocalDB();
    const found = db.students.find((s) => s._id === id || s.studentId === id);
    if (!found) return null;
    return recomputeStudentBalance(found._id);
  }
};

// Payments & Immutable Transaction Recording
export interface RecordPaymentInput {
  studentId: string;
  amount: number;
  paymentDate?: string | Date;
  paymentMethod: PaymentMethodType;
  transactionReference?: string;
}

export const recordPaymentTransaction = async (
  input: RecordPaymentInput
): Promise<{ payment: IPayment; student: IStudent }> => {
  return txMutex.runExclusive(async () => {
    const amount = Math.round(Number(input.amount) * 100) / 100;
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Payment amount must be a valid number greater than zero.');
    }

    const settings = await getInstitutionSettings();
    if (!settings?.receiptPrefix?.trim()) {
      throw new Error(
        'Please configure the receipt prefix in Institution Settings before recording payments.'
      );
    }
    const prefix = settings.receiptPrefix.trim().toUpperCase();

    if (isMongoConnected()) {
      let student = null;
      if (mongoose.Types.ObjectId.isValid(input.studentId)) {
        student = await StudentModel.findById(input.studentId);
      }
      if (!student) {
        student = await StudentModel.findOne({ studentId: input.studentId });
      }
      if (!student) {
        throw new Error('Student not found. A payment must belong to an existing student.');
      }

      // Compute previous amount paid strictly from recorded payments
      const existingPayments = await PaymentModel.find({ student: String(student._id) }).lean();
      const previousPaid =
        Math.round(
          existingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100
        ) / 100;
      const currentRemaining = Math.max(
        0,
        Math.round((student.totalCourseFee - previousPaid) * 100) / 100
      );

      if (amount > currentRemaining) {
        throw new Error(
          `Payment amount (${amount}) exceeds remaining balance (${currentRemaining}). Enable advance payment if intentional.`
        );
      }

      const seq = await getNextSequence('receipt');
      const paymentDateObj = input.paymentDate ? new Date(input.paymentDate) : new Date();
      const receiptNumber = formatSequentialCode(prefix, seq, paymentDateObj);

      const newTotalPaid = Math.round((previousPaid + amount) * 100) / 100;
      const breakdownAfter = calculateFeeBreakdown(student.totalCourseFee, newTotalPaid);

      const createdPayment = await PaymentModel.create({
        receiptNumber,
        student: String(student._id),
        studentId: student.studentId,
        studentName: student.fullName,
        studentEmail: student.email,
        studentPhone: student.phone,
        courseName: student.courseName,
        amount,
        totalCourseFeeSnapshot: student.totalCourseFee,
        previousAmountPaid: previousPaid,
        totalAmountPaidAfter: breakdownAfter.totalAmountPaid,
        remainingBalanceAfter: breakdownAfter.remainingBalance,
        paymentStatusAfter: breakdownAfter.paymentStatus,
        paymentDate: paymentDateObj,
        paymentMethod: input.paymentMethod,
        transactionReference: input.transactionReference?.trim() || '',
        branch: student.branch || 'Calicut',
      });

      student.totalAmountPaid = breakdownAfter.totalAmountPaid;
      student.remainingBalance = breakdownAfter.remainingBalance;
      student.paymentStatus = breakdownAfter.paymentStatus;
      await student.save();

      return {
        payment: { ...createdPayment.toObject(), _id: String(createdPayment._id) },
        student: { ...student.toObject(), _id: String(student._id) },
      };
    } else {
      const db = readLocalDB();
      const studentIdx = db.students.findIndex(
        (s) => s._id === input.studentId || s.studentId === input.studentId
      );
      if (studentIdx === -1) {
        throw new Error('Student not found. A payment must belong to an existing student.');
      }

      const student = db.students[studentIdx];
      const existingPayments = db.payments.filter((p) => p.student === student._id);
      const previousPaid =
        Math.round(
          existingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100
        ) / 100;
      const currentRemaining = Math.max(
        0,
        Math.round((student.totalCourseFee - previousPaid) * 100) / 100
      );

      if (amount > currentRemaining) {
        throw new Error(
          `Payment amount (${amount}) exceeds the remaining balance (${currentRemaining}).`
        );
      }

      const currentReceiptSeq = db.counters['receipt'] || 0;
      const nextReceiptSeq = currentReceiptSeq + 1;
      const paymentDateObj = input.paymentDate ? new Date(input.paymentDate) : new Date();
      const receiptNumber = formatSequentialCode(prefix, nextReceiptSeq, paymentDateObj);

      if (db.payments.some((p) => p.receiptNumber === receiptNumber)) {
        throw new Error(`Duplicate receipt number detected: ${receiptNumber}`);
      }

      db.counters['receipt'] = nextReceiptSeq;

      const newTotalPaid = Math.round((previousPaid + amount) * 100) / 100;
      const breakdownAfter = calculateFeeBreakdown(student.totalCourseFee, newTotalPaid);
      const nowIso = new Date().toISOString();

      const newPayment: IPayment = {
        _id: generateObjectId(),
        receiptNumber,
        student: student._id,
        studentId: student.studentId,
        studentName: student.fullName,
        studentEmail: student.email,
        studentPhone: student.phone,
        courseName: student.courseName,
        amount,
        totalCourseFeeSnapshot: student.totalCourseFee,
        previousAmountPaid: previousPaid,
        totalAmountPaidAfter: breakdownAfter.totalAmountPaid,
        remainingBalanceAfter: breakdownAfter.remainingBalance,
        paymentStatusAfter: breakdownAfter.paymentStatus,
        paymentDate: paymentDateObj.toISOString(),
        paymentMethod: input.paymentMethod,
        transactionReference: input.transactionReference?.trim() || '',
        branch: student.branch || 'Calicut',
        createdAt: nowIso,
      };

      // Append immutable payment record
      db.payments.unshift(newPayment);

      // Update student's derived balance
      student.totalAmountPaid = breakdownAfter.totalAmountPaid;
      student.remainingBalance = breakdownAfter.remainingBalance;
      student.paymentStatus = breakdownAfter.paymentStatus;
      student.updatedAt = nowIso;
      db.students[studentIdx] = student;

      writeLocalDB(db);
      return { payment: newPayment, student };
    }
  });
};

export interface PaymentFilterQuery {
  studentId?: string;
  search?: string;
  course?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

export const listPayments = async (query: PaymentFilterQuery = {}): Promise<IPayment[]> => {
  let payments: IPayment[] = [];

  if (isMongoConnected()) {
    const docs = await PaymentModel.find().sort({ paymentDate: -1, createdAt: -1 }).lean();
    payments = docs.map((d) => ({ ...d, _id: String(d._id) }));
  } else {
    const db = readLocalDB();
    payments = [...db.payments].sort((a, b) => {
      const diff = new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
      if (diff !== 0) return diff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  if (query.studentId) {
    payments = payments.filter(
      (p) => p.student === query.studentId || p.studentId === query.studentId
    );
  }

  if (query.search && query.search.trim()) {
    const q = query.search.toLowerCase().trim();
    payments = payments.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        p.studentId.toLowerCase().includes(q) ||
        p.receiptNumber.toLowerCase().includes(q) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q))
    );
  }

  if (query.course && query.course !== 'All') {
    payments = payments.filter((p) => p.courseName === query.course);
  }

  if (query.paymentMethod && query.paymentMethod !== 'All') {
    payments = payments.filter((p) => p.paymentMethod === query.paymentMethod);
  }

  if (query.paymentStatus && query.paymentStatus !== 'All') {
    payments = payments.filter((p) => p.paymentStatusAfter === query.paymentStatus);
  }

  if (query.startDate) {
    const start = new Date(query.startDate);
    start.setHours(0, 0, 0, 0);
    payments = payments.filter((p) => new Date(p.paymentDate) >= start);
  }

  if (query.endDate) {
    const end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);
    payments = payments.filter((p) => new Date(p.paymentDate) <= end);
  }

  // Enrich branch if not present
  if (!isMongoConnected()) {
    const db = readLocalDB();
    payments = payments.map((p) => {
      if (!p.branch && p.student) {
        const student = db.students.find(
          (s) => s._id === p.student || s.studentId === p.student
        );
        if (student?.branch) return { ...p, branch: student.branch };
      }
      return p;
    });
  }

  return payments;
};

export const getPaymentByIdOrReceipt = async (idOrReceipt: string): Promise<IPayment | null> => {
  if (isMongoConnected()) {
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(idOrReceipt)) {
      doc = await PaymentModel.findById(idOrReceipt).lean();
    }
    if (!doc) {
      doc = await PaymentModel.findOne({ receiptNumber: idOrReceipt }).lean();
    }
    if (!doc) return null;
    const payment = { ...doc, _id: String(doc._id) } as IPayment;
    if (!payment.branch && payment.student) {
      const student = await StudentModel.findById(payment.student).lean();
      if (student?.branch) payment.branch = student.branch;
    }
    return payment;
  } else {
    const db = readLocalDB();
    const payment = db.payments.find(
      (p) => p._id === idOrReceipt || p.receiptNumber.toLowerCase() === idOrReceipt.toLowerCase()
    );
    if (!payment) return null;
    const copy = { ...payment };
    if (!copy.branch && copy.student) {
      const student = db.students.find(
        (s) => s._id === copy.student || s.studentId === copy.student
      );
      if (student?.branch) copy.branch = student.branch;
    }
    return copy;
  }
};

// Courses CRUD
export const listCourses = async (): Promise<ICourse[]> => {
  if (isMongoConnected()) {
    const docs = await CourseModel.find().sort({ createdAt: -1 }).lean();
    return docs.map((d) => ({ ...d, _id: String(d._id) }));
  } else {
    const db = readLocalDB();
    return [...(db.courses || [])];
  }
};

export const createCourseRecord = async (name: string): Promise<ICourse> => {
  return txMutex.runExclusive(async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Course name is required.');
    }

    if (isMongoConnected()) {
      const existing = await CourseModel.findOne({
        name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (existing) {
        throw new Error('A course with this name already exists.');
      }
      const created = await CourseModel.create({ name: cleanName });
      return { ...created.toObject(), _id: String(created._id) };
    } else {
      const db = readLocalDB();
      if (!db.courses) db.courses = [];
      if (db.courses.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
        throw new Error('A course with this name already exists.');
      }
      const now = new Date().toISOString();
      const newCourse: ICourse = {
        _id: generateObjectId(),
        name: cleanName,
        createdAt: now,
        updatedAt: now,
      };
      db.courses.unshift(newCourse);
      writeLocalDB(db);
      return newCourse;
    }
  });
};

export const updateCourseRecord = async (
  id: string,
  name: string
): Promise<ICourse | null> => {
  return txMutex.runExclusive(async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Course name is required.');
    }

    if (isMongoConnected()) {
      const duplicate = await CourseModel.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (duplicate) {
        throw new Error('Another course with this name already exists.');
      }
      const updated = await CourseModel.findByIdAndUpdate(
        id,
        { name: cleanName },
        { new: true }
      ).lean();
      return updated ? { ...updated, _id: String(updated._id) } : null;
    } else {
      const db = readLocalDB();
      if (!db.courses) db.courses = [];
      const idx = db.courses.findIndex((c) => c._id === id);
      if (idx === -1) return null;

      if (
        db.courses.some(
          (c, i) => i !== idx && c.name.toLowerCase() === cleanName.toLowerCase()
        )
      ) {
        throw new Error('Another course with this name already exists.');
      }

      db.courses[idx].name = cleanName;
      db.courses[idx].updatedAt = new Date().toISOString();
      writeLocalDB(db);
      return db.courses[idx];
    }
  });
};

export const deleteCourseRecord = async (id: string): Promise<boolean> => {
  return txMutex.runExclusive(async () => {
    if (isMongoConnected()) {
      const deleted = await CourseModel.findByIdAndDelete(id);
      return Boolean(deleted);
    } else {
      const db = readLocalDB();
      if (!db.courses) return false;
      const prevLen = db.courses.length;
      db.courses = db.courses.filter((c) => c._id !== id);
      if (db.courses.length === prevLen) return false;
      writeLocalDB(db);
      return true;
    }
  });
};
