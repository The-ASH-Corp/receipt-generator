import PDFDocument from 'pdfkit';
import { IPayment } from '../models/Payment';
import { ISettings } from '../models/Settings';

const formatCurrencyForPdf = (amount: number, symbol = '₹'): string => {
  const formatted = Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Standard PDF Helvetica uses WinAnsiEncoding which does not include U+20B9 (₹).
  // Use "INR " in PDF when symbol is ₹ so numbers always render cleanly across all PDF viewers.
  const safePrefix = symbol === '₹' ? 'INR ' : `${symbol} `;
  return `${safePrefix}${formatted}`;
};

const formatDateForPdf = (dateVal: string | Date): string => {
  const d = new Date(dateVal);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const generateReceiptPdfBuffer = (
  payment: IPayment,
  settings: ISettings
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 45,
        info: {
          Title: `Fee Receipt - ${payment.receiptNumber}`,
          Author: settings.academyName,
          Subject: `Course Fee Receipt for ${payment.studentName} (${payment.studentId})`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 90; // 45pt margin each side
      const leftX = 45;
      const rightX = pageWidth - 45;

      // Top Brand Accent Bar
      doc.rect(0, 0, pageWidth, 10).fill('#1e1b4b');
      doc.rect(0, 10, pageWidth, 4).fill('#4f46e5');

      // Header Section Background
      doc.roundedRect(leftX, 32, contentWidth, 96, 8).fill('#f8fafc');
      doc
        .roundedRect(leftX, 32, contentWidth, 96, 8)
        .lineWidth(1)
        .strokeColor('#e2e8f0')
        .stroke();

      // Logo Placeholder or Base64 Image
      const logoX = leftX + 18;
      const logoY = 48;
      const logoSize = 62;

      let logoRendered = false;
      if (
        settings.academyLogo &&
        (settings.academyLogo.startsWith('data:image/png;base64,') ||
          settings.academyLogo.startsWith('data:image/jpeg;base64,') ||
          settings.academyLogo.startsWith('data:image/jpg;base64,'))
      ) {
        try {
          const base64Data = settings.academyLogo.split(',')[1];
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, logoX, logoY, {
            fit: [logoSize, logoSize],
            align: 'center',
            valign: 'center',
          });
          logoRendered = true;
        } catch {
          logoRendered = false;
        }
      }

      if (!logoRendered) {
        // Draw institutional crest badge placeholder
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 10).fill('#312e81');
        doc
          .roundedRect(logoX + 3, logoY + 3, logoSize - 6, logoSize - 6, 8)
          .lineWidth(1)
          .strokeColor('#818cf8')
          .stroke();

        const initials = (settings.academyName || 'Academy')
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() || '')
          .join('');

        doc
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(20)
          .text(initials || 'AG', logoX, logoY + 18, {
            width: logoSize,
            align: 'center',
          });
        doc
          .fillColor('#c7d2fe')
          .font('Helvetica')
          .fontSize(6.5)
          .text('ACADEMY LOGO', logoX, logoY + 43, {
            width: logoSize,
            align: 'center',
          });
      }

      // Institution Details
      const infoX = logoX + logoSize + 16;
      const infoWidth = contentWidth - logoSize - 175;

      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(15)
        .text(settings.academyName.toUpperCase(), infoX, 46, {
          width: infoWidth,
        });

      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(8.5)
        .text(settings.address, infoX, doc.y + 3, {
          width: infoWidth,
        });

      const contactLine = [
        settings.phone ? `Tel: ${settings.phone}` : '',
        settings.email ? `Email: ${settings.email}` : '',
        settings.website ? `Web: ${settings.website}` : '',
      ]
        .filter(Boolean)
        .join('  |  ');

      doc
        .fillColor('#334155')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(contactLine, infoX, doc.y + 4, {
          width: infoWidth,
        });

      // Receipt Title Badge on the Right of Header
      const badgeW = 128;
      const badgeX = rightX - badgeW - 16;
      doc.roundedRect(badgeX, 46, badgeW, 30, 5).fill('#312e81');
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('FEE RECEIPT', badgeX, 56, {
          width: badgeW,
          align: 'center',
        });

      // Status Pill below Receipt Title Badge
      const statusText = payment.paymentStatusAfter.toUpperCase();
      const statusBg =
        payment.paymentStatusAfter === 'Paid'
          ? '#dcfce7'
          : payment.paymentStatusAfter === 'Partially Paid'
          ? '#fef3c7'
          : '#fee2e2';
      const statusFg =
        payment.paymentStatusAfter === 'Paid'
          ? '#166534'
          : payment.paymentStatusAfter === 'Partially Paid'
          ? '#92400e'
          : '#991b1b';

      doc.roundedRect(badgeX, 84, badgeW, 22, 4).fill(statusBg);
      doc
        .fillColor(statusFg)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(`STATUS: ${statusText}`, badgeX, 91, {
          width: badgeW,
          align: 'center',
        });

      // Receipt Meta Bar (Receipt Number & Receipt Date)
      const metaY = 142;
      doc.roundedRect(leftX, metaY, contentWidth, 38, 6).fill('#eef2ff');
      doc
        .roundedRect(leftX, metaY, contentWidth, 38, 6)
        .lineWidth(0.75)
        .strokeColor('#c7d2fe')
        .stroke();

      doc
        .fillColor('#4338ca')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('RECEIPT NUMBER', leftX + 16, metaY + 8);
      doc
        .fillColor('#1e1b4b')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(payment.receiptNumber, leftX + 16, metaY + 20);

      doc
        .fillColor('#4338ca')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('RECEIPT DATE', leftX + 200, metaY + 8);
      doc
        .fillColor('#1e1b4b')
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .text(formatDateForPdf(payment.paymentDate), leftX + 200, metaY + 20);

      doc
        .fillColor('#4338ca')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('PAYMENT METHOD', leftX + 360, metaY + 8);
      doc
        .fillColor('#1e1b4b')
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .text(payment.paymentMethod, leftX + 360, metaY + 20);

      // Two-Column Section: Student Details & Payment Details
      const detailsY = 196;
      const colW = (contentWidth - 16) / 2;
      const col1X = leftX;
      const col2X = leftX + colW + 16;
      const boxH = 132;

      // Left Box: Student Information
      doc.roundedRect(col1X, detailsY, colW, boxH, 6).fill('#ffffff');
      doc
        .roundedRect(col1X, detailsY, colW, boxH, 6)
        .lineWidth(1)
        .strokeColor('#e2e8f0')
        .stroke();
      doc.rect(col1X, detailsY, colW, 26).fill('#f1f5f9');
      doc
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('STUDENT INFORMATION', col1X + 14, detailsY + 8);

      const drawKeyValue = (
        x: number,
        y: number,
        label: string,
        val: string,
        boldVal = false
      ) => {
        doc
          .fillColor('#64748b')
          .font('Helvetica')
          .fontSize(8.5)
          .text(label, x, y, { width: 88 });
        doc
          .fillColor('#0f172a')
          .font(boldVal ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .text(val || '-', x + 90, y, { width: colW - 108 });
      };

      drawKeyValue(col1X + 14, detailsY + 36, 'Student Name:', payment.studentName, true);
      drawKeyValue(col1X + 14, detailsY + 56, 'Student ID:', payment.studentId, true);
      drawKeyValue(col1X + 14, detailsY + 76, 'Course Enrolled:', payment.courseName);
      drawKeyValue(col1X + 14, detailsY + 96, 'Phone / Email:', `${payment.studentPhone}`);

      // Right Box: Transaction Information
      doc.roundedRect(col2X, detailsY, colW, boxH, 6).fill('#ffffff');
      doc
        .roundedRect(col2X, detailsY, colW, boxH, 6)
        .lineWidth(1)
        .strokeColor('#e2e8f0')
        .stroke();
      doc.rect(col2X, detailsY, colW, 26).fill('#f1f5f9');
      doc
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('PAYMENT TRANSACTION DETAILS', col2X + 14, detailsY + 8);

      drawKeyValue(
        col2X + 14,
        detailsY + 36,
        'Amount Paid:',
        formatCurrencyForPdf(payment.amount, settings.currencySymbol),
        true
      );
      drawKeyValue(col2X + 14, detailsY + 56, 'Payment Mode:', payment.paymentMethod);
      drawKeyValue(
        col2X + 14,
        detailsY + 76,
        'Transaction Ref:',
        payment.transactionReference || 'N/A'
      );
      drawKeyValue(
        col2X + 14,
        detailsY + 96,
        'Remarks:',
        payment.remarks ? payment.remarks.slice(0, 45) : 'Course Fee Installment'
      );

      // Fee Summary Table
      const tableY = 346;
      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .text('FEE BREAKDOWN & ACCOUNT SUMMARY', leftX, tableY);

      const headerY = tableY + 18;
      doc.roundedRect(leftX, headerY, contentWidth, 28, 4).fill('#1e1b4b');
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('DESCRIPTION', leftX + 16, headerY + 9);
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('AMOUNT', rightX - 160, headerY + 9, {
          width: 144,
          align: 'right',
        });

      const summaryRows: Array<{
        label: string;
        sublabel: string;
        value: string;
        highlight?: boolean;
        accent?: 'green' | 'amber' | 'indigo';
      }> = [
        {
          label: `Total Course Fee (${payment.courseName})`,
          sublabel: 'Standard total tuition & course fee payable',
          value: formatCurrencyForPdf(
            payment.totalCourseFeeSnapshot,
            settings.currencySymbol
          ),
        },
        {
          label: 'Previous Amount Paid',
          sublabel: 'Cumulative verified payments prior to this receipt',
          value: formatCurrencyForPdf(payment.previousAmountPaid, settings.currencySymbol),
        },
        {
          label: 'Current Payment Received',
          sublabel: `Received via ${payment.paymentMethod} on ${formatDateForPdf(
            payment.paymentDate
          )}`,
          value: formatCurrencyForPdf(payment.amount, settings.currencySymbol),
          highlight: true,
          accent: 'indigo',
        },
        {
          label: 'Total Amount Paid to Date',
          sublabel: 'Previous payments + current receipt amount',
          value: formatCurrencyForPdf(
            payment.totalAmountPaidAfter,
            settings.currencySymbol
          ),
          accent: 'green',
        },
        {
          label: 'Remaining Balance Due',
          sublabel:
            payment.remainingBalanceAfter === 0
              ? 'All course fee dues cleared in full'
              : 'Outstanding course fee balance payable',
          value: formatCurrencyForPdf(
            payment.remainingBalanceAfter,
            settings.currencySymbol
          ),
          accent: payment.remainingBalanceAfter === 0 ? 'green' : 'amber',
        },
      ];

      let currentRowY = headerY + 28;
      summaryRows.forEach((row, index) => {
        const rowH = 36;
        const bgColor = row.highlight
          ? '#eef2ff'
          : index % 2 === 0
          ? '#ffffff'
          : '#f8fafc';

        doc.rect(leftX, currentRowY, contentWidth, rowH).fill(bgColor);
        doc
          .rect(leftX, currentRowY, contentWidth, rowH)
          .lineWidth(0.5)
          .strokeColor('#e2e8f0')
          .stroke();

        doc
          .fillColor(row.highlight ? '#1e1b4b' : '#0f172a')
          .font(row.highlight || index >= 3 ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9.5)
          .text(row.label, leftX + 16, currentRowY + 7);

        doc
          .fillColor('#64748b')
          .font('Helvetica')
          .fontSize(7.5)
          .text(row.sublabel, leftX + 16, currentRowY + 21);

        let valueColor = '#0f172a';
        if (row.accent === 'indigo') valueColor = '#4338ca';
        if (row.accent === 'green') valueColor = '#15803d';
        if (row.accent === 'amber') valueColor = '#b45309';

        doc
          .fillColor(valueColor)
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .text(row.value, rightX - 160, currentRowY + 12, {
            width: 144,
            align: 'right',
          });

        currentRowY += rowH;
      });

      // Payment Acknowledgement Box
      const ackY = currentRowY + 18;
      doc.roundedRect(leftX, ackY, contentWidth, 44, 6).fill('#f8fafc');
      doc
        .roundedRect(leftX, ackY, contentWidth, 44, 6)
        .lineWidth(0.75)
        .strokeColor('#cbd5e1')
        .stroke();

      doc
        .fillColor('#334155')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('PAYMENT ACKNOWLEDGEMENT:', leftX + 14, ackY + 10);

      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(8.5)
        .text(
          `Received with thanks from ${payment.studentName} (${
            payment.studentId
          }) a sum of ${formatCurrencyForPdf(
            payment.amount,
            settings.currencySymbol
          )} towards "${payment.courseName}" course fees via ${payment.paymentMethod}.`,
          leftX + 14,
          ackY + 23,
          { width: contentWidth - 28 }
        );

      // Footer Section: Institution Stamp Placeholder & Authorized Signatory
      const sigY = ackY + 64;

      // Left: Official Institution Stamp Placeholder (Circular Vector Seal)
      const stampCenterX = leftX + 75;
      const stampCenterY = sigY + 38;
      doc
        .circle(stampCenterX, stampCenterY, 36)
        .lineWidth(1.5)
        .strokeColor('#6366f1')
        .stroke();
      doc
        .circle(stampCenterX, stampCenterY, 32)
        .lineWidth(0.75)
        .dash(3, { space: 2 })
        .strokeColor('#818cf8')
        .stroke()
        .undash();

      doc
        .fillColor('#4338ca')
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .text('INSTITUTION SEAL', stampCenterX - 30, stampCenterY - 16, {
          width: 60,
          align: 'center',
        });
      doc
        .fillColor('#312e81')
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text('VERIFIED', stampCenterX - 30, stampCenterY - 4, {
          width: 60,
          align: 'center',
        });
      doc
        .fillColor('#6366f1')
        .font('Helvetica')
        .fontSize(6)
        .text('OFFICIAL STAMP', stampCenterX - 30, stampCenterY + 9, {
          width: 60,
          align: 'center',
        });

      // Center: Terms / Computer Generated Note
      doc
        .fillColor('#64748b')
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          'This receipt is electronically generated and recorded in the institutional ledger.\nAll fees once paid are subject to academy enrollment policies.',
          leftX + 145,
          sigY + 26,
          { width: 210, align: 'center' }
        );

      // Right: Authorized Signature Line
      const sigLineX = rightX - 150;
      const sigLineW = 140;
      doc
        .moveTo(sigLineX, sigY + 50)
        .lineTo(sigLineX + sigLineW, sigY + 50)
        .lineWidth(1)
        .strokeColor('#475569')
        .stroke();

      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('Authorized Signatory', sigLineX, sigY + 56, {
          width: sigLineW,
          align: 'center',
        });
      doc
        .fillColor('#64748b')
        .font('Helvetica')
        .fontSize(7.5)
        .text(`For ${settings.academyName}`, sigLineX - 10, sigY + 68, {
          width: sigLineW + 20,
          align: 'center',
        });

      // Bottom Thank You Banner
      const footerY = doc.page.height - 68;
      doc
        .moveTo(leftX, footerY - 8)
        .lineTo(rightX, footerY - 8)
        .lineWidth(0.75)
        .strokeColor('#e2e8f0')
        .stroke();

      doc
        .fillColor('#312e81')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(
          settings.receiptFooterMessage ||
            'Thank you for your payment! Looking forward to empowering your learning journey.',
          leftX,
          footerY,
          {
            width: contentWidth,
            align: 'center',
          }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

