import React, { useState } from 'react';
import { X, Download, Printer, ShieldCheck, MapPin, Mail, Globe, Phone } from 'lucide-react';
import { Payment } from '../types';
import { formatDateDMY } from '../utils/formatters';
import { paymentApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

interface ReceiptPreviewModalProps {
  payment: Payment | null;
  branch?: string;
  onClose: () => void;
}

const getStarPoints = (cx: number, cy: number, outerR = 5.5, innerR = 2.4): string => {
  const points: string[] = [];
  const step = Math.PI / 5;
  let rot = (Math.PI / 2) * 3;
  for (let i = 0; i < 5; i++) {
    points.push(
      `${(cx + Math.cos(rot) * outerR).toFixed(1)},${(cy + Math.sin(rot) * outerR).toFixed(1)}`
    );
    rot += step;
    points.push(
      `${(cx + Math.cos(rot) * innerR).toFixed(1)},${(cy + Math.sin(rot) * innerR).toFixed(1)}`
    );
    rot += step;
  }
  return points.join(' ');
};

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  payment,
  branch,
  onClose,
}) => {
  const { settings } = useAuth();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!payment) return null;

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await paymentApi.downloadReceiptPdf(payment._id, payment.receiptNumber);
      showToast(`Receipt ${payment.receiptNumber}.pdf downloaded!`, 'success');
    } catch {
      showToast('Failed to download receipt PDF.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenPrintablePdf = async () => {
    try {
      await paymentApi.openReceiptPdfInNewTab(payment._id);
    } catch {
      showToast('Failed to open printable PDF.', 'error');
    }
  };

  const methodStr = (payment.paymentMethod || '').toLowerCase();
  const isCash = methodStr.includes('cash');
  const isNetBanking =
    methodStr.includes('bank') ||
    methodStr.includes('net') ||
    methodStr.includes('transfer') ||
    methodStr.includes('upi') ||
    methodStr.includes('card') ||
    methodStr.includes('online');

  const receiptBranch = branch || payment.branch || settings.selectedBranch || 'Calicut';
  const branchName = receiptBranch.toUpperCase();
  const branchAddress =
    settings.branches?.[receiptBranch]?.address ||
    settings.address ||
    '2nd Floor, OPS Mall, Vailathur,Tirur';
  const phoneNo = settings.phone || '+91 8921365750';
  const cleanMob = phoneNo.replace(/[^0-9]/g, '').slice(-10) || '8921365750';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-semibold">
              Fee Receipt — {payment.receiptNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPrintablePdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Open PDF
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Outer Receipt Container */}
        <div className="p-4 sm:p-8 bg-slate-100 flex justify-center">
          {/* Exact Bordered Receipt Voucher Matching Ashcorp Physical Slip */}
          <div className="w-full bg-white border border-neutral-900 p-5 sm:p-7 shadow-xs text-neutral-900">
            {/* Header: Logo, Contact Info, Date & Bill No */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
              {/* Left: Logo */}
              <div className="flex items-center shrink-0">
                <img
                  src="/ash-academy-logo.png"
                  alt="ASH ACADEMY"
                  className="h-11 w-auto object-contain"
                />
              </div>

              {/* Middle: Contact Info with Icons */}
              <div className="text-[11px] font-semibold text-neutral-800 space-y-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-neutral-700 shrink-0" />
                  <span>{branchAddress}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-neutral-700 shrink-0" />
                  <span>{settings.email || 'connect@ashacademy.ai'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-neutral-700 shrink-0" />
                  <span>{settings.website || 'www.ashacademy.ai'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-neutral-700 shrink-0" />
                  <span>{settings.phone || '+91 8921365750'}</span>
                </div>
              </div>

              {/* Right: Date & Bill No */}
              <div className="text-xs sm:text-right shrink-0 space-y-2">
                <div className="flex sm:justify-end items-baseline gap-2">
                  <span className="font-bold text-neutral-900">Date:</span>
                  <span className="font-bold text-neutral-800 border-b border-neutral-500 pb-0.5 px-3 min-w-[95px] text-center inline-block">
                    {formatDateDMY(payment.paymentDate)}
                  </span>
                </div>
                <div className="flex sm:justify-end items-baseline gap-2">
                  <span className="font-bold text-neutral-900">Bill No :</span>
                  <span className="font-bold text-neutral-800 border-b border-neutral-500 pb-0.5 px-3 min-w-[95px] text-center inline-block font-mono">
                    {payment.receiptNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Solid Horizontal Divider Bar (#7c3aed) */}
            <div className="w-full h-1 bg-[#7c3aed] my-3"></div>

            {/* Body Section */}
            <div className="py-4 space-y-4 text-sm sm:text-base">
              <div className="flex items-baseline">
                <span className="font-bold text-neutral-900 shrink-0 mr-2">
                  Received from Mr/Ms
                </span>
                <span className="font-bold uppercase tracking-wide text-neutral-900 px-1 shrink-0">
                  {payment.studentName}
                </span>
                <span className="flex-1 border-b border-dotted border-neutral-500 ml-1 mb-1"></span>
              </div>

              <div className="flex items-baseline">
                <span className="font-bold text-neutral-900 shrink-0 mr-2">
                  for the course
                </span>
                <span className="font-bold text-neutral-900 px-1 shrink-0">
                  {payment.courseName}
                </span>
                <span className="flex-1 border-b border-dotted border-neutral-500 ml-1 mb-1"></span>
              </div>
            </div>

            {/* Lower Section: Checkboxes, Rubber Stamp, Amount */}
            <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Payment Method Checkboxes */}
              <div className="space-y-2 text-xs font-bold text-neutral-900 self-start sm:self-center">
                <label className="flex items-center gap-2 cursor-default">
                  <span className="w-4 h-4 rounded-xs border border-neutral-900 flex items-center justify-center text-xs">
                    {isCash && '✓'}
                  </span>
                  <span>Cash</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <span className="w-4 h-4 rounded-xs border border-neutral-900 flex items-center justify-center text-xs">
                    {(isNetBanking || !isCash) && '✓'}
                  </span>
                  <span>Net Banking</span>
                </label>
              </div>

              {/* Circular Rubber Seal / Stamp */}
              <div className="relative select-none -rotate-3 shrink-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  className="w-28 h-28 sm:w-32 sm:h-32 text-blue-700"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <path
                      id="preview-seal-top-path"
                      d="M 24,100 A 76,76 0 0,1 176,100"
                      fill="none"
                    />
                    <path
                      id="preview-seal-bottom-path"
                      d="M 21,100 A 79,79 0 0,0 179,100"
                      fill="none"
                    />
                  </defs>

                  {/* Outer Concentric Double Rim */}
                  <circle
                    cx="100"
                    cy="100"
                    r="96"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="91"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />

                  {/* Inner Ring */}
                  <circle
                    cx="100"
                    cy="100"
                    r="61"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  {/* Stars at 9 o'clock and 3 o'clock */}
                  <polygon points={getStarPoints(23, 100, 5.5, 2.4)} fill="currentColor" />
                  <polygon points={getStarPoints(177, 100, 5.5, 2.4)} fill="currentColor" />

                  {/* Upper Arc: ASH ACADEMY */}
                  <text
                    fill="currentColor"
                    fontFamily="'Times New Roman', Times, serif"
                    fontWeight="bold"
                    fontSize="17.5"
                    letterSpacing="3"
                  >
                    <textPath href="#preview-seal-top-path" startOffset="50%" textAnchor="middle">
                      ASH ACADEMY
                    </textPath>
                  </text>

                  {/* Lower Arc: Dynamic Branch Name */}
                  <text
                    fill="currentColor"
                    fontFamily="'Times New Roman', Times, serif"
                    fontWeight="bold"
                    fontSize="17.5"
                    letterSpacing="3.5"
                  >
                    <textPath href="#preview-seal-bottom-path" startOffset="50%" textAnchor="middle">
                      {branchName}
                    </textPath>
                  </text>

                  {/* Center: Stylized ASH Logo */}
                  <g transform="translate(51, 46) scale(0.09)">
                    <path
                      d="M 294.007812 537.589844 L 295.460938 534.1875 L 339.976562 418.808594 L 344.238281 534.1875 L 344.488281 537.589844 Z M 313.617188 351.769531 L 187.4375 648.714844 L 249.808594 648.714844 L 274.804688 586.371094 L 346.492188 586.371094 L 349.066406 648.714844 L 415.667969 648.714844 L 394.226562 351.769531 Z M 313.617188 351.769531"
                      fill="currentColor"
                    />
                    <path
                      d="M 556.25 473.933594 C 531.75 461.191406 510.679688 450.078125 514.742188 427.050781 C 517.425781 411.828125 528.625 401.957031 546.71875 401.957031 C 568.941406 401.957031 578.785156 418.394531 576.066406 450.078125 L 633.257812 450.078125 C 640.4375 385.90625 610.691406 351.769531 553.9375 351.769531 C 500.878906 351.769531 461.832031 384.277344 453.421875 431.984375 C 443.632812 487.5 483.070312 506.417969 515.863281 523.292969 C 539.609375 535.621094 560.265625 546.734375 555.984375 571 C 553.230469 586.613281 539.941406 598.964844 519.394531 598.964844 C 494.714844 598.964844 486.019531 582.917969 490.5 545.90625 L 431.679688 545.90625 C 423.214844 612.535156 450.972656 648.71875 512.664062 648.71875 C 567.789062 648.71875 608.429688 614.1875 616.988281 565.652344 C 626.78125 510.113281 588.632812 490.78125 556.25 473.933594"
                      fill="currentColor"
                    />
                    <path
                      d="M 674.203125 351.765625 L 653.632812 468.4375 L 718.121094 468.4375 L 738.691406 351.765625 Z M 674.203125 351.765625"
                      fill="currentColor"
                    />
                    <path
                      d="M 621.84375 648.71875 L 686.332031 648.71875 L 708.84375 521.03125 L 644.359375 521.03125 Z M 621.84375 648.71875"
                      fill="currentColor"
                    />
                    <path
                      d="M 892.5625 468.4375 L 851.75 468.4375 L 872.320312 351.777344 L 807.835938 351.777344 L 787.269531 468.4375 L 718.121094 468.4375 L 708.84375 521.03125 L 777.992188 521.03125 L 755.476562 648.726562 L 819.957031 648.726562 L 842.472656 521.03125 L 883.289062 521.03125 Z M 892.5625 468.4375"
                      fill="currentColor"
                    />
                  </g>

                  {/* Center: Phone */}
                  <text
                    x="100"
                    y="126"
                    textAnchor="middle"
                    fill="currentColor"
                    fontFamily="'Times New Roman', Times, serif"
                    fontSize="13.5"
                    fontWeight="normal"
                  >
                    Mob: {cleanMob}
                  </text>
                </svg>
              </div>

              {/* Amount & Signature (Right) */}
              <div className="flex flex-col items-center sm:items-end gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base text-neutral-900">Amount</span>
                  <div className="border border-neutral-900 px-4 py-1.5 min-w-[100px] text-center font-bold text-lg text-neutral-900 whitespace-nowrap">
                    ₹{payment.amount}
                  </div>
                </div>

                <div className="text-center w-32 flex flex-col items-center">
                  <img
                    src="/authorized_signature.png"
                    alt="Authorized Signature"
                    className="h-9 w-auto max-w-[120px] object-contain -mb-1 select-none pointer-events-none"
                  />
                  <div className="w-full border-b border-neutral-800 mb-1" />
                  <span className="text-[10px] font-bold text-neutral-800 tracking-wider block">
                    Authorized Signature
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Disclaimer Notice */}
            <div className="pt-6 text-center">
              <p className="text-[11px] sm:text-xs font-semibold text-neutral-600">
                Please note: All payments are final and non-refundable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
