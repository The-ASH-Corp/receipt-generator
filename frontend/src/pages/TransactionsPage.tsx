import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Receipt,
  Calendar,
} from 'lucide-react';
import { Payment } from '../types';
import { paymentApi } from '../services/api';
import {
  exportTransactionsToCsv,
  formatCurrency,
  formatDate,
} from '../utils/formatters';
import { PaymentStatusBadge } from '../components/StatusBadge';
import { ReceiptPreviewModal } from '../components/ReceiptPreviewModal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export const TransactionsPage: React.FC = () => {
  const { settings } = useAuth();
  const { showToast } = useToast();
  const currency = settings.currencySymbol || '₹';

  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('All');
  const [selectedMethod, setSelectedMethod] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await paymentApi.list({
        search: search || undefined,
        course: selectedCourse !== 'All' ? selectedCourse : undefined,
        paymentMethod: selectedMethod !== 'All' ? selectedMethod : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setTransactions(res.transactions);
      setCourses(res.courses);
      setTotalAmount(res.totalAmount);
    } catch {
      showToast('Failed to load transactions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCourse, selectedMethod, startDate, endDate, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCourse('All');
    setSelectedMethod('All');
    setStartDate('');
    setEndDate('');
  };

  const handleExportCsv = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export.', 'info');
      return;
    }
    exportTransactionsToCsv(
      transactions,
      `fee-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    );
    showToast(`Exported ${transactions.length} transactions to CSV.`, 'success');
  };

  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      setDownloadingId(payment._id);
      await paymentApi.downloadReceiptPdf(payment._id, payment.receiptNumber);
      showToast(`Downloaded ${payment.receiptNumber}.pdf`, 'success');
    } catch {
      showToast('Failed to download PDF receipt.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-indigo-900 tracking-tight">
            Transactions Ledger
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Search, filter, audit, and export all student fee payments and official receipts
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-300" />
          <span>Export Transactions to CSV</span>
        </button>
      </div>

      {/* Filters Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search */}
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Receipt no, student name, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Course Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="All">All Courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="All">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="lg:col-span-2 relative">
            <input
              type="date"
              title="From Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* End Date & Reset */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <input
              type="date"
              title="To Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <button
              onClick={handleResetFilters}
              title="Clear Filters"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Summary Strip */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="font-semibold text-slate-600 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Showing {transactions.length} recorded transactions</span>
          </div>
          <div className="font-bold text-slate-800">
            Filtered Volume:{' '}
            <span className="text-emerald-700 text-sm">
              {formatCurrency(totalAmount, currency)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading transactions...
            </div>
          ) : transactions.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Receipt Number</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Student ID</th>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-sm">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs font-bold text-indigo-950 whitespace-nowrap">
                      {t.receiptNumber}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      <Link
                        to={`/students/${t.student}`}
                        className="hover:text-indigo-700"
                      >
                        {t.studentName}
                      </Link>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {t.studentId}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-700 max-w-[200px] truncate">
                      {t.courseName}
                    </td>
                    <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                      {formatDate(t.paymentDate)}
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(t.amount, currency)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{t.paymentMethod}</span>
                      {t.transactionReference && (
                        <span className="block text-[11px] font-mono text-slate-500">
                          {t.transactionReference}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <PaymentStatusBadge status={t.paymentStatusAfter} />
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewPayment(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 text-xs font-semibold text-slate-700 hover:text-indigo-900"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(t)}
                          disabled={downloadingId === t._id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="text-base font-bold text-slate-800">
                No transactions match your filters
              </div>
              <p className="text-xs text-slate-500">
                Try clearing your search or date range filters.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Preview Modal */}
      <ReceiptPreviewModal
        payment={previewPayment}
        onClose={() => setPreviewPayment(null)}
      />
    </div>
  );
};

