import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { IPayment } from '../models/Payment';
import { ISettings } from '../models/Settings';

const formatDateDMY = (dateVal?: string | Date): string => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// SVG Paths for ASH Logo
const ASH_LOGO_PATHS = [
  'M 294.007812 537.589844 L 295.460938 534.1875 L 339.976562 418.808594 L 344.238281 534.1875 L 344.488281 537.589844 Z M 313.617188 351.769531 L 187.4375 648.714844 L 249.808594 648.714844 L 274.804688 586.371094 L 346.492188 586.371094 L 349.066406 648.714844 L 415.667969 648.714844 L 394.226562 351.769531 Z M 313.617188 351.769531 ',
  'M 556.25 473.933594 C 531.75 461.191406 510.679688 450.078125 514.742188 427.050781 C 517.425781 411.828125 528.625 401.957031 546.71875 401.957031 C 568.941406 401.957031 578.785156 418.394531 576.066406 450.078125 L 633.257812 450.078125 C 640.4375 385.90625 610.691406 351.769531 553.9375 351.769531 C 500.878906 351.769531 461.832031 384.277344 453.421875 431.984375 C 443.632812 487.5 483.070312 506.417969 515.863281 523.292969 C 539.609375 535.621094 560.265625 546.734375 555.984375 571 C 553.230469 586.613281 539.941406 598.964844 519.394531 598.964844 C 494.714844 598.964844 486.019531 582.917969 490.5 545.90625 L 431.679688 545.90625 C 423.214844 612.535156 450.972656 648.71875 512.664062 648.71875 C 567.789062 648.71875 608.429688 614.1875 616.988281 565.652344 C 626.78125 510.113281 588.632812 490.78125 556.25 473.933594 ',
  'M 674.203125 351.765625 L 653.632812 468.4375 L 718.121094 468.4375 L 738.691406 351.765625 Z M 674.203125 351.765625 ',
  'M 621.84375 648.71875 L 686.332031 648.71875 L 708.84375 521.03125 L 644.359375 521.03125 Z M 621.84375 648.71875 ',
  'M 892.5625 468.4375 L 851.75 468.4375 L 872.320312 351.777344 L 807.835938 351.777344 L 787.269531 468.4375 L 718.121094 468.4375 L 708.84375 521.03125 L 777.992188 521.03125 L 755.476562 648.726562 L 819.957031 648.726562 L 842.472656 521.03125 L 883.289062 521.03125 Z M 892.5625 468.4375 ',
];

function drawRupeeIcon(
  doc: typeof PDFDocument.prototype,
  x: number,
  y: number,
  size = 11,
  color = '#1f2937'
): void {
  doc.save();
  const scale = size / 24;
  doc.translate(x, y);
  doc.scale(scale);
  doc.lineWidth(2.2).strokeColor(color).lineCap('round').lineJoin('round');
  doc.path('M6 3h12').stroke();
  doc.path('M6 8h12').stroke();
  doc.path('m6 13 8.5 8').stroke();
  doc.path('M6 13h3').stroke();
  doc.path('M9 13c6.667 0 6.667-10 0-10').stroke();
  doc.restore();
}

function drawPhoneIcon(
  doc: typeof PDFDocument.prototype,
  x: number,
  y: number,
  size = 7.5,
  color = '#262626'
): void {
  doc.save();
  const scale = size / 24;
  doc.translate(x, y);
  doc.scale(scale);
  doc.lineWidth(2.2).strokeColor(color).lineCap('round').lineJoin('round');
  doc
    .path(
      'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'
    )
    .stroke();
  doc.restore();
}

function drawLocationIcon(
  doc: typeof PDFDocument.prototype,
  x: number,
  y: number,
  size = 7.5,
  color = '#262626'
): void {
  doc.save();
  const scale = size / 24;
  doc.translate(x, y);
  doc.scale(scale);
  doc.lineWidth(2).strokeColor(color).lineCap('round').lineJoin('round');
  doc
    .path('M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0')
    .stroke();
  doc.circle(12, 10, 3).stroke();
  doc.restore();
}

function drawMailIcon(
  doc: typeof PDFDocument.prototype,
  x: number,
  y: number,
  size = 7.5,
  color = '#262626'
): void {
  doc.save();
  const scale = size / 24;
  doc.translate(x, y);
  doc.scale(scale);
  doc.lineWidth(2).strokeColor(color).lineCap('round').lineJoin('round');
  doc.roundedRect(2, 4, 20, 16, 2).stroke();
  doc.path('m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7').stroke();
  doc.restore();
}

function drawGlobeIcon(
  doc: typeof PDFDocument.prototype,
  x: number,
  y: number,
  size = 7.5,
  color = '#262626'
): void {
  doc.save();
  const scale = size / 24;
  doc.translate(x, y);
  doc.scale(scale);
  doc.lineWidth(2).strokeColor(color).lineCap('round').lineJoin('round');
  doc.circle(12, 12, 10).stroke();
  doc.path('M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20').stroke();
  doc.path('M2 12h20').stroke();
  doc.restore();
}

function drawFivePointStar(
  doc: typeof PDFDocument.prototype,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  fillColor: string
): void {
  doc.save();
  const step = Math.PI / 5;
  let rot = (Math.PI / 2) * 3;
  doc.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < 5; i++) {
    doc.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    doc.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  doc.lineTo(cx, cy - outerRadius);
  doc.closePath();
  doc.fillColor(fillColor).fill();
  doc.restore();
}

function drawReceiptSeal(
  doc: typeof PDFDocument.prototype,
  cx: number,
  cy: number,
  branchName: string,
  phone = '8921365750',
  color = '#1e40af'
): void {
  doc.save();
  doc.translate(cx, cy);
  doc.rotate(-4);

  const rOuter = 34;
  const rMid = 32.2;
  const rInner = 21.5;

  // Concentric Circles
  doc.lineWidth(1.2).strokeColor(color).circle(0, 0, rOuter).stroke();
  doc.lineWidth(0.6).strokeColor(color).circle(0, 0, rMid).stroke();
  doc.lineWidth(0.9).strokeColor(color).circle(0, 0, rInner).stroke();

  // Stars at 9 o'clock and 3 o'clock
  const rStar = (rMid + rInner) / 2;
  drawFivePointStar(doc, -rStar, 0, 2.3, 1.0, color);
  drawFivePointStar(doc, rStar, 0, 2.3, 1.0, color);

  // Upper Arc: "ASH ACADEMY"
  const topText = 'ASH ACADEMY';
  doc.font('Times-Bold').fontSize(5.4).fillColor(color);
  const rTop = (rMid + rInner) / 2;
  const letterSpacingTop = 1.2;
  let totalAngleTop = 0;
  for (const ch of topText) {
    totalAngleTop += (doc.widthOfString(ch) + letterSpacingTop) / rTop;
  }
  let currentAngleTop = -Math.PI / 2 - totalAngleTop / 2;
  for (const ch of topText) {
    const chW = doc.widthOfString(ch);
    const span = (chW + letterSpacingTop) / rTop;
    const midAngle = currentAngleTop + span / 2;
    const chX = rTop * Math.cos(midAngle);
    const chY = rTop * Math.sin(midAngle);
    const rot = midAngle + Math.PI / 2;

    doc.save();
    doc.translate(chX, chY);
    doc.rotate(rot * (180 / Math.PI));
    doc.text(ch, -chW / 2, -2.4, { lineBreak: false });
    doc.restore();

    currentAngleTop += span;
  }

  // Lower Arc: Branch Name (e.g. "CALICUT")
  const bottomText = branchName.toUpperCase();
  doc.font('Times-Bold').fontSize(5.4).fillColor(color);
  const rBottom = (rMid + rInner) / 2;
  const letterSpacingBottom = 1.3;
  let totalAngleBottom = 0;
  for (const ch of bottomText) {
    totalAngleBottom += (doc.widthOfString(ch) + letterSpacingBottom) / rBottom;
  }
  let currentAngleBottom = Math.PI / 2 + totalAngleBottom / 2;
  for (const ch of bottomText) {
    const chW = doc.widthOfString(ch);
    const span = (chW + letterSpacingBottom) / rBottom;
    const midAngle = currentAngleBottom - span / 2;
    const chX = rBottom * Math.cos(midAngle);
    const chY = rBottom * Math.sin(midAngle);
    const rot = midAngle - Math.PI / 2;

    doc.save();
    doc.translate(chX, chY);
    doc.rotate(rot * (180 / Math.PI));
    doc.text(ch, -chW / 2, -2.2, { lineBreak: false });
    doc.restore();

    currentAngleBottom -= span;
  }

  // Inner Center: ASH Logo
  const scale = 22 / 705.2;
  doc.save();
  doc.translate(0 - 540 * scale, -5.5 - 500.25 * scale);
  doc.scale(scale);
  ASH_LOGO_PATHS.forEach((p) => doc.path(p).fill(color));
  doc.restore();

  // Inner Center: Phone Number
  doc.font('Times-Roman').fontSize(5.0).fillColor(color);
  const cleanMob = (phone || '8921365750').replace(/[^0-9]/g, '').slice(-10) || '8921365750';
  doc.text(`Mob: ${cleanMob}`, -20, 3.8, { width: 40, align: 'center' });

  doc.restore();
}

export const generateReceiptPdfBuffer = (
  payment: IPayment,
  settings: ISettings
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Fee Receipt - ${payment.receiptNumber}`,
          Author: settings.academyName || 'ASH ACADEMY',
          Subject: `Course Fee Receipt for ${payment.studentName}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const boxX = 40;
      const boxY = 60;
      const boxW = 515;
      const boxH = 305;

      // Outer crisp black/dark border
      doc.rect(boxX, boxY, boxW, boxH).lineWidth(1.2).strokeColor('#262626').stroke();

      // --- Header Section ---
      const logoCandidates = [
        path.resolve(__dirname, '../../assets/ash-academy-logo.png'),
        path.resolve(process.cwd(), 'backend/assets/ash-academy-logo.png'),
        path.resolve(process.cwd(), 'assets/ash-academy-logo.png'),
        path.resolve(__dirname, '../assets/ash-academy-logo.png'),
      ];
      const logoFile = logoCandidates.find((p) => fs.existsSync(p));

      const logoX = boxX + 16;
      const logoY = boxY + 12;

      if (logoFile) {
        doc.image(logoFile, logoX, logoY, { width: 80 });
      } else {
        const logoScale = 0.088;
        doc.save();
        doc.translate(logoX - 187.4 * logoScale, logoY - 351.7 * logoScale);
        doc.scale(logoScale);
        ASH_LOGO_PATHS.forEach((p) => doc.path(p).fill('#7c3aed'));
        doc.restore();

        doc
          .font('Helvetica-Bold')
          .fontSize(6.5)
          .fillColor('#262626')
          .text('ASH ACADEMY', logoX - 4, logoY + 31, { width: 75, align: 'center' });
      }

      // Middle: Contact info & mini vector icons
      const infoX = boxX + 115;
      const infoY = boxY + 14;

      // Location Pin icon
      drawLocationIcon(doc, infoX, infoY + 1, 7.5, '#262626');
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#1f2937')
        .text(settings.address || '2nd Floor, OPS Mall, Vailathur,Tirur', infoX + 11, infoY + 1);

      // Mail icon
      drawMailIcon(doc, infoX, infoY + 13, 7.5, '#262626');
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#1f2937')
        .text(settings.email || 'connect@ashacademy.ai', infoX + 11, infoY + 13);

      // Globe icon
      drawGlobeIcon(doc, infoX, infoY + 25, 7.5, '#262626');
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#1f2937')
        .text(settings.website || 'www.ashacademy.ai', infoX + 11, infoY + 25);

      // Phone icon
      drawPhoneIcon(doc, infoX, infoY + 37, 7.5, '#262626');
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#1f2937')
        .text(settings.phone || '+91 8921365750', infoX + 11, infoY + 37);

      // Right: Date & Bill No
      const rightMetaX = boxX + 370;
      const formattedDate = formatDateDMY(payment.paymentDate);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1f2937').text('Date: ', rightMetaX, boxY + 18);
      doc.font('Helvetica-Bold').fontSize(9).text(formattedDate, rightMetaX + 45, boxY + 18);
      doc
        .moveTo(rightMetaX + 40, boxY + 29)
        .lineTo(boxX + boxW - 25, boxY + 29)
        .lineWidth(0.8)
        .strokeColor('#6b7280')
        .stroke();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1f2937').text('Bill No : ', rightMetaX, boxY + 38);
      doc.font('Helvetica-Bold').fontSize(9).text(payment.receiptNumber, rightMetaX + 45, boxY + 38);
      doc
        .moveTo(rightMetaX + 40, boxY + 49)
        .lineTo(boxX + boxW - 25, boxY + 49)
        .lineWidth(0.8)
        .strokeColor('#6b7280')
        .stroke();

      // Violet Horizontal Divider Bar (#7c3aed)
      doc.rect(boxX, boxY + 68, boxW, 2.5).fill('#7c3aed');

      // --- Body Section ---
      // const bodyY = boxY + 100;
      // const label1 = 'Received from Mr/Ms';
      // const studentNameUpper = (payment.studentName || '').toUpperCase();

      // doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937').text(label1 + '  ', boxX + 25, bodyY, { continued: true });
      // doc.font('Helvetica-Bold').text(studentNameUpper + ' ');
      // const nameWidth = doc.widthOfString(label1 + '  ' + studentNameUpper + ' ');
      // const dotsStartX1 = boxX + 25 + nameWidth;
      // const dotsEndX = boxX + boxW - 25;

      // doc.save().dash(1.5, { space: 2.5 }).lineWidth(0.8).strokeColor('#6b7280');
      // doc.moveTo(dotsStartX1, bodyY + 9).lineTo(dotsEndX, bodyY + 9).stroke();
      // doc.restore();

      // const bodyY2 = bodyY + 25;
      // const label2 = 'for the course';
      // const courseName = payment.courseName || '';

      // doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937').text(label2 + '  ', boxX + 25, bodyY2, { continued: true });
      // doc.font('Helvetica-Bold').text(courseName + ' ');
      // const courseWidth = doc.widthOfString(label2 + '  ' + courseName + ' ');
      // const dotsStartX2 = boxX + 25 + courseWidth;

      // doc.save().dash(1.5, { space: 2.5 }).lineWidth(0.8).strokeColor('#6b7280');
      // doc.moveTo(dotsStartX2, bodyY2 + 9).lineTo(dotsEndX, bodyY2 + 9).stroke();
      // doc.restore();








      // --- Student Name ---
      const bodyY = boxY + 100;
      const label1 = 'Received from Mr/Ms';
      const studentNameUpper = (payment.studentName || '').toUpperCase();

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937');

      const labelX = boxX + 25;
      const labelWidth = doc.widthOfString(label1 + '  ');
      const nameX = labelX + labelWidth;
      const nameWidth = doc.widthOfString(studentNameUpper);
      const dotsEndX = boxX + boxW - 25;

      // Draw label
      doc.text(label1, labelX, bodyY, { lineBreak: false });

      // Draw dotted line below the text
      const nameLineY = bodyY + 13;

      doc.save();
      doc.dash(1.5, { space: 2.5 })
        .lineWidth(0.8)
        .strokeColor('#6b7280')
        .moveTo(nameX, nameLineY)
        .lineTo(dotsEndX, nameLineY)
        .stroke();
      doc.restore();

      // Draw name above the dotted line
      doc.save();
      doc.rect(nameX - 2, bodyY - 1, nameWidth + 5, 13).fill('#ffffff');

      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#1f2937')
        .text(studentNameUpper, nameX, bodyY, {
          lineBreak: false,
        });
      doc.restore();


      // --- Course Name ---
      const bodyY2 = bodyY + 25;
      const label2 = 'for the course';
      const courseName = (payment.courseName || '').toUpperCase();

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937');

      const courseLabelWidth = doc.widthOfString(label2 + '  ');
      const courseX = labelX + courseLabelWidth;
      const courseWidth = doc.widthOfString(courseName);

      // Draw label
      doc.text(label2, labelX, bodyY2, { lineBreak: false });

      // Draw dotted line below the text
      const courseLineY = bodyY2 + 13;

      doc.save();
      doc.dash(1.5, { space: 2.5 })
        .lineWidth(0.8)
        .strokeColor('#6b7280')
        .moveTo(courseX, courseLineY)
        .lineTo(dotsEndX, courseLineY)
        .stroke();
      doc.restore();

      // Draw course name above the dotted line
      doc.save();
      doc.rect(courseX - 2, bodyY2 - 1, courseWidth + 5, 13).fill('#ffffff');

      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#1f2937')
        .text(courseName, courseX, bodyY2, {
          lineBreak: false,
        });
      doc.restore();



















      // --- Payment Method Checkboxes & Stamp & Amount ---
      const methodStr = (payment.paymentMethod || '').toLowerCase();
      const isCash = methodStr.includes('cash');
      const isNetBanking =
        methodStr.includes('bank') ||
        methodStr.includes('net') ||
        methodStr.includes('transfer') ||
        methodStr.includes('upi') ||
        methodStr.includes('card') ||
        methodStr.includes('online');

      const cbX = boxX + 28;
      const cbY1 = boxY + 168;

      // Cash Checkbox
      doc.rect(cbX, cbY1, 12, 12).lineWidth(1).strokeColor('#262626').stroke();
      if (isCash) {
        doc.save().lineWidth(1.6).strokeColor('#1f2937');
        doc.moveTo(cbX + 2.5, cbY1 + 6).lineTo(cbX + 5, cbY1 + 9.5).lineTo(cbX + 10, cbY1 + 2.5).stroke();
        doc.restore();
      }
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1f2937').text('Cash', cbX + 20, cbY1 + 1.5);

      // Net Banking Checkbox
      const cbY2 = cbY1 + 19;
      doc.rect(cbX, cbY2, 12, 12).lineWidth(1).strokeColor('#262626').stroke();
      if (isNetBanking || !isCash) {
        doc.save().lineWidth(1.6).strokeColor('#1f2937');
        doc.moveTo(cbX + 2.5, cbY2 + 6).lineTo(cbX + 5, cbY2 + 9.5).lineTo(cbX + 10, cbY2 + 2.5).stroke();
        doc.restore();
      }
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1f2937').text('Net Banking', cbX + 20, cbY2 + 1.5);

      // Circular Rubber Stamp (Center)
      const stampX = boxX + boxW / 2 - 20;
      const stampY = boxY + 185;
      const branchName = (payment.branch || settings.selectedBranch || 'Calicut').toUpperCase();
      const phoneNo = settings.phone || '+91 8921365750';
      drawReceiptSeal(doc, stampX, stampY, branchName, phoneNo, '#1e40af');

      // Amount Box (Right)
      const amtLabelX = boxX + 340;
      const amtBoxX = boxX + 395;
      const amtBoxY = boxY + 175;
      const amtBoxW = 90;
      const amtBoxH = 24;

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937').text('Amount', amtLabelX, amtBoxY + 5);
      doc.rect(amtBoxX, amtBoxY, amtBoxW, amtBoxH).lineWidth(1).strokeColor('#262626').stroke();

      drawRupeeIcon(doc, amtBoxX + 10, amtBoxY + 6, 11, '#1f2937');
      const formattedAmt = String(payment.amount ?? 0);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f2937').text(formattedAmt, amtBoxX + 22, amtBoxY + 6);

      // Bottom Notice
      const noticeY = boxY + boxH - 22;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#374151').text(
        'Please note: All payments are final and non-refundable.',
        boxX,
        noticeY,
        { width: boxW, align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
