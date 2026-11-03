import { Request, Response } from 'express';
import {
  recordPaymentTransaction,
  listPayments,
  getPaymentByIdOrReceipt,
  getInstitutionSettings,
  listStudents,
} from '../services/dataStore';
import { PaymentMethodType } from '../models/Payment';
import { generateReceiptPdfBuffer } from '../services/pdfService';

const VALID_METHODS: PaymentMethodType[] = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Card',
  'Other',
];

export const recordPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      studentId,
      amount,
      paymentDate,
      paymentMethod,
      transactionReference,
      remarks,
      allowAdvance,
    } = req.body;

    if (!studentId || !String(studentId).trim()) {
      res.status(400).json({
        success: false,
        message: 'Student selection is required to record a payment.',
      });
      return;
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than zero.',
      });
      return;
    }

    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        message: `Invalid payment method. Allowed: ${VALID_METHODS.join(', ')}`,
      });
      return;
    }

    const result = await recordPaymentTransaction({
      studentId: String(studentId),
      amount: numericAmount,
      paymentDate: paymentDate || new Date().toISOString(),
      paymentMethod,
      transactionReference,
      remarks,
      allowAdvance: Boolean(allowAdvance),
    });

    res.status(201).json({
      success: true,
      message: `Payment of ${numericAmount} recorded successfully. Receipt ${result.payment.receiptNumber} generated.`,
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to record payment',
    });
  }
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      studentId,
      search,
      course,
      paymentMethod,
      paymentStatus,
      startDate,
      endDate,
    } = req.query;

    const [transactions, allStudents] = await Promise.all([
      listPayments({
        studentId: typeof studentId === 'string' ? studentId : undefined,
        search: typeof search === 'string' ? search : undefined,
        course: typeof course === 'string' ? course : undefined,
        paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : undefined,
        paymentStatus: typeof paymentStatus === 'string' ? paymentStatus : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
      }),
      listStudents(),
    ]);

    const courses = Array.from(
      new Set([
        ...allStudents.map((s) => s.courseName),
        ...transactions.map((t) => t.courseName),
      ])
    ).filter(Boolean);

    const totalAmount =
      Math.round(transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0) * 100) /
      100;

    res.json({
      success: true,
      data: {
        transactions,
        courses,
        totalAmount,
        count: transactions.length,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to load transactions',
    });
  }
};

export const getPaymentDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const payment = await getPaymentByIdOrReceipt(id);

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Recorded payment receipt not found.',
      });
      return;
    }

    const settings = await getInstitutionSettings();

    res.json({
      success: true,
      data: {
        payment,
        settings,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to fetch receipt details',
    });
  }
};

export const downloadReceiptPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const payment = await getPaymentByIdOrReceipt(id);

    if (!payment) {
      res.status(404).json({
        success: false,
        message:
          'Cannot generate receipt: Payment record does not exist or was not successfully recorded.',
      });
      return;
    }

    const settings = await getInstitutionSettings();
    const pdfBuffer = await generateReceiptPdfBuffer(payment, settings);

    const isDownload = req.query.download === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';
    const filename = `${payment.receiptNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to generate PDF receipt',
    });
  }
};

