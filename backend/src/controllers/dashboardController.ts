import { Request, Response } from 'express';
import { listStudents, listPayments, getInstitutionSettings, listCourses } from '../services/dataStore';

export const getDashboardSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [students, payments, settings, courses] = await Promise.all([
      listStudents(),
      listPayments(),
      getInstitutionSettings(),
      listCourses(),
    ]);

    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status === 'Active').length;
    const totalCourses = courses.length;

    const totalFeesCollected =
      Math.round(payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100) / 100;

    const pendingFees =
      Math.round(
        students.reduce((sum, s) => sum + Number(s.remainingBalance || 0), 0) * 100
      ) / 100;

    const totalCourseFeeExpected =
      Math.round(students.reduce((sum, s) => sum + Number(s.totalCourseFee || 0), 0) * 100) /
      100;

    const totalTransactions = payments.length;

    const statusBreakdown = {
      paid: students.filter((s) => s.paymentStatus === 'Paid').length,
      partiallyPaid: students.filter((s) => s.paymentStatus === 'Partially Paid').length,
      pending: students.filter((s) => s.paymentStatus === 'Pending').length,
    };

    const recentPayments = payments.slice(0, 6);
    const recentStudents = students.slice(0, 6);

    res.json({
      success: true,
      data: {
        summary: {
          totalStudents,
          totalCourses,
          activeStudents,
          totalFeesCollected,
          pendingFees,
          totalCourseFeeExpected,
          totalTransactions,
          statusBreakdown,
          currencySymbol: settings.currencySymbol || '₹',
        },
        recentPayments,
        recentStudents,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to load dashboard data',
    });
  }
};

