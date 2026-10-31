import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { isMongoConnected } from '../config/db';
import { StudentModel, IStudent, PaymentStatusType, StudentStatusType } from '../models/Student';
import { PaymentModel, IPayment, PaymentMethodType } from '../models/Payment';
import { SettingsModel, ISettings } from '../models/Settings';
import { AdminModel, IAdmin } from '../models/Admin';
import { CounterModel } from '../models/Counter';
import { calculateFeeBreakdown, formatSequentialCode } from '../utils/idGenerator';

interface LocalDatabaseSchema {
  students: IStudent[];
  payments: IPayment[];
  settings: ISettings;
  admins: IAdmin[];
  counters: Record<string, number>;
}

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'database.local.json');

// Simple async mutex to ensure atomic operations & prevent race conditions on concurrent requests
class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void = () => {};
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

const DEFAULT_SETTINGS: ISettings = {
  academyName: 'Apex Global Academy of Technology',
  academyLogo: '',
  address: '4th Floor, Innovation Tower, Residency Road, Bengaluru - 560025',
  phone: '+91 80 4567 8900',
  email: 'admissions@apexacademy.edu',
  website: 'www.apexacademy.edu',
  receiptPrefix: 'REC',
  receiptFooterMessage: 'Thank you for your payment! Looking forward to empowering your learning journey.',
  currencySymbol: '₹',
};

const readLocalDB = (): LocalDatabaseSchema => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: LocalDatabaseSchema = {
      students: [],
      payments: [],
      settings: { ...DEFAULT_SETTINGS },
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

export const initializeSeedData = async (): Promise<void> => {
  if (isMongoConnected()) {
    const existingSettings = await SettingsModel.findOne();
    if (!existingSettings) {
      await SettingsModel.create(DEFAULT_SETTINGS);
    }

    const studentCount = await StudentModel.countDocuments();
    if (studentCount === 0) {
      await seedInitialSampleRecords();
    }
  } else {
    await txMutex.runExclusive(async () => {
      const db = readLocalDB();
      if (!db.settings || !db.settings.academyName) {
        db.settings = { ...DEFAULT_SETTINGS };
      }
      writeLocalDB(db);
    });

    const dbAfter = readLocalDB();
    if (dbAfter.students.length === 0) {
      await seedInitialSampleRecords();
    }
  }
};

const seedInitialSampleRecords = async (): Promise<void> => {
  // Seed 4 realistic students across Paid, Partially Paid, and Pending statuses
  const s1 = await createStudentRecord({
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+91 98450 11223',
    courseName: 'Full Stack Web Development Bootcamp',
    courseDuration: '6 Months',
    courseStartDate: '2026-09-01',
    totalCourseFee: 45000,
    registrationDate: '2026-08-20',
    status: 'Active',
  });

  const s2 = await createStudentRecord({
    fullName: 'Priya Nair',
    email: 'priya.nair@example.com',
    phone: '+91 97312 44556',
    courseName: 'Data Science & Machine Learning',
    courseDuration: '8 Months',
    courseStartDate: '2026-09-15',
    totalCourseFee: 60000,
    registrationDate: '2026-09-02',
    status: 'Active',
  });

  const s3 = await createStudentRecord({
    fullName: 'Rohan Verma',
    email: 'rohan.verma@example.com',
    phone: '+91 99001 77889',
    courseName: 'UI/UX Product Design Mastery',
    courseDuration: '4 Months',
    courseStartDate: '2026-10-01',
    totalCourseFee: 32000,
    registrationDate: '2026-09-25',
    status: 'Active',
  });

  await createStudentRecord({
    fullName: 'Sneha Kulkarni',
    email: 'sneha.kulkarni@example.com',
    phone: '+91 96112 33445',
    courseName: 'Cloud Architecture & DevOps',
    courseDuration: '6 Months',
    courseStartDate: '2026-10-15',
    totalCourseFee: 50000,
    registrationDate: '2026-10-10',
    status: 'Active',
  });

  // Record realistic payments for Aarav (Full Paid in 2 installments), Priya (Partially Paid), Rohan (Partially Paid)
  await recordPaymentTransaction({
    studentId: s1._id,
    amount: 25000,
    paymentDate: '2026-08-22',
    paymentMethod: 'UPI',
    transactionReference: 'UPI-623489102341',
    remarks: 'First installment at registration',
  });

  await recordPaymentTransaction({
    studentId: s1._id,
    amount: 20000,
    paymentDate: '2026-09-25',
    paymentMethod: 'Bank Transfer',
    transactionReference: 'NEFT-HDFC9928371',
    remarks: 'Final installment clearing full course fee',
  });

  await recordPaymentTransaction({
    studentId: s2._id,
    amount: 35000,
    paymentDate: '2026-09-05',
    paymentMethod: 'Card',
    transactionReference: 'POS-4829-9910',
    remarks: 'Initial installment via credit card',
  });

  await recordPaymentTransaction({
    studentId: s3._id,
    amount: 16000,
    paymentDate: '2026-09-28',
    paymentMethod: 'Cash',
    transactionReference: 'CSH-COUNTER-01',
    remarks: '50% upfront fee payment',
  });
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
export const getInstitutionSettings = async (): Promise<ISettings> => {
  if (isMongoConnected()) {
    const doc = await SettingsModel.findOne().lean();
    if (!doc) {
      const created = await SettingsModel.create(DEFAULT_SETTINGS);
      const obj = created.toObject();
      return { ...DEFAULT_SETTINGS, ...obj, _id: String(obj._id) };
    }
    return { ...DEFAULT_SETTINGS, ...doc, _id: String(doc._id) };
  } else {
    const db = readLocalDB();
    return db.settings || { ...DEFAULT_SETTINGS };
  }
};

export const updateInstitutionSettings = async (
  updates: Partial<ISettings>
): Promise<ISettings> => {
  return txMutex.runExclusive(async () => {
    const cleanUpdates: Partial<ISettings> = {
      academyName: updates.academyName?.trim() || DEFAULT_SETTINGS.academyName,
      academyLogo: updates.academyLogo !== undefined ? updates.academyLogo : '',
      address: updates.address?.trim() || DEFAULT_SETTINGS.address,
      phone: updates.phone?.trim() || DEFAULT_SETTINGS.phone,
      email: updates.email?.trim() || DEFAULT_SETTINGS.email,
      website: updates.website?.trim() ?? DEFAULT_SETTINGS.website,
      receiptPrefix: (updates.receiptPrefix?.trim() || 'REC').toUpperCase(),
      receiptFooterMessage:
        updates.receiptFooterMessage?.trim() || DEFAULT_SETTINGS.receiptFooterMessage,
      currencySymbol: updates.currencySymbol?.trim() || '₹',
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConnected()) {
      const existing = await SettingsModel.findOne();
      if (existing) {
        Object.assign(existing, cleanUpdates);
        await existing.save();
        return { ...existing.toObject(), _id: String(existing._id) };
      } else {
        const created = await SettingsModel.create(cleanUpdates);
        return { ...created.toObject(), _id: String(created._id) };
      }
    } else {
      const db = readLocalDB();
      db.settings = {
        ...db.settings,
        ...cleanUpdates,
      };
      writeLocalDB(db);
      return db.settings;
    }
  });
};

// Recompute student fee totals strictly from immutable payment records
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
  fullName: string;
  email: string;
  phone: string;
  courseName: string;
  courseDuration: string;
  courseStartDate: string | Date;
  totalCourseFee: number;
  registrationDate?: string | Date;
  status?: StudentStatusType;
}

export const createStudentRecord = async (input: CreateStudentInput): Promise<IStudent> => {
  return txMutex.runExclusive(async () => {
    const seq = await getNextSequence('student');
    const studentId = formatSequentialCode('STU', seq, new Date());
    const fee = Math.round(Number(input.totalCourseFee) * 100) / 100;
    const breakdown = calculateFeeBreakdown(fee, 0);
    const now = new Date().toISOString();

    if (isMongoConnected()) {
      const created = await StudentModel.create({
        studentId,
        fullName: input.fullName.trim(),
        email: input.email.toLowerCase().trim(),
        phone: input.phone.trim(),
        courseName: input.courseName.trim(),
        courseDuration: input.courseDuration.trim(),
        courseStartDate: new Date(input.courseStartDate),
        totalCourseFee: breakdown.totalCourseFee,
        totalAmountPaid: 0,
        remainingBalance: breakdown.remainingBalance,
        paymentStatus: breakdown.paymentStatus,
        registrationDate: input.registrationDate ? new Date(input.registrationDate) : new Date(),
        status: input.status || 'Active',
      });
      return { ...created.toObject(), _id: String(created._id) };
    } else {
      const db = readLocalDB();
      // Ensure unique studentId
      if (db.students.some((s) => s.studentId === studentId)) {
        throw new Error(`Duplicate Student ID generated: ${studentId}`);
      }
      const newStudent: IStudent = {
        _id: generateObjectId(),
        studentId,
        fullName: input.fullName.trim(),
        email: input.email.toLowerCase().trim(),
        phone: input.phone.trim(),
        courseName: input.courseName.trim(),
        courseDuration: input.courseDuration.trim(),
        courseStartDate: new Date(input.courseStartDate).toISOString(),
        totalCourseFee: breakdown.totalCourseFee,
        totalAmountPaid: 0,
        remainingBalance: breakdown.remainingBalance,
        paymentStatus: breakdown.paymentStatus,
        registrationDate: input.registrationDate
          ? new Date(input.registrationDate).toISOString()
          : now,
        status: input.status || 'Active',
        createdAt: now,
        updatedAt: now,
      };
      db.students.unshift(newStudent);
      writeLocalDB(db);
      return newStudent;
    }
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
      if (updates.courseName !== undefined) student.courseName = updates.courseName.trim();
      if (updates.courseDuration !== undefined)
        student.courseDuration = updates.courseDuration.trim();
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
      if (updates.courseStartDate !== undefined)
        student.courseStartDate = new Date(updates.courseStartDate).toISOString();
      if (updates.registrationDate !== undefined)
        student.registrationDate = new Date(updates.registrationDate).toISOString();
      if (updates.status !== undefined) student.status = updates.status;

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
        s.email.toLowerCase().includes(q) ||
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
  studentId: string; // Can be _id or studentId code (STU-...)
  amount: number;
  paymentDate?: string | Date;
  paymentMethod: PaymentMethodType;
  transactionReference?: string;
  remarks?: string;
  allowAdvance?: boolean;
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
    const prefix = settings.receiptPrefix || 'REC';

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

      if (!input.allowAdvance && amount > currentRemaining) {
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
        remarks: input.remarks?.trim() || '',
        allowAdvance: Boolean(input.allowAdvance),
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

      if (!input.allowAdvance && amount > currentRemaining) {
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
        remarks: input.remarks?.trim() || '',
        allowAdvance: Boolean(input.allowAdvance),
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
    return doc ? { ...doc, _id: String(doc._id) } : null;
  } else {
    const db = readLocalDB();
    return (
      db.payments.find(
        (p) => p._id === idOrReceipt || p.receiptNumber.toLowerCase() === idOrReceipt.toLowerCase()
      ) || null
    );
  }
};
