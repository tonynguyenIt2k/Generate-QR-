import QRCode from 'qrcode';
import { QRErrorCorrection } from '../types/label';

export interface QRRenderOptions {
  content: string;
  fgColor?: string;
  bgColor?: string;
  errorCorrection?: QRErrorCorrection;
  logoUrl?: string;
  logoSizeRatio?: number;
  width?: number;
}

/**
 * Generates a high-quality Data URL (PNG) for a given QR content and styling options.
 */
export async function generateQRDataUrl(options: QRRenderOptions): Promise<string> {
  const {
    content,
    fgColor = '#000000',
    bgColor = '#ffffff',
    errorCorrection = 'M',
    logoUrl,
    logoSizeRatio = 0.2,
    width = 300,
  } = options;

  const rawContent = content.trim() || 'https://qr-label-pro.app';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = width;

    await QRCode.toCanvas(canvas, rawContent, {
      errorCorrectionLevel: errorCorrection,
      margin: 1,
      width: width,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    });

    if (logoUrl) {
      await overlayLogoOnCanvas(canvas, logoUrl, logoSizeRatio, bgColor);
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error generating QR code:', err);
    // Return a fallback blank or minimal canvas data URL
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = width;
    fallbackCanvas.height = width;
    const ctx = fallbackCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, width);
      ctx.fillStyle = fgColor;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QR Error', width / 2, width / 2);
    }
    return fallbackCanvas.toDataURL('image/png');
  }
}

async function overlayLogoOnCanvas(
  canvas: HTMLCanvasElement,
  logoUrl: string,
  logoRatio: number,
  bgColor: string
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve();

      const logoSize = canvas.width * Math.min(0.35, Math.max(0.1, logoRatio));
      const x = (canvas.width - logoSize) / 2;
      const y = (canvas.height - logoSize) / 2;

      // Draw rounded white background for the logo
      const padding = logoSize * 0.1;
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(
        x - padding,
        y - padding,
        logoSize + padding * 2,
        logoSize + padding * 2,
        8
      );
      ctx.fill();

      // Draw logo
      ctx.drawImage(img, x, y, logoSize, logoSize);
      resolve();
    };
    img.onerror = () => {
      resolve(); // ignore logo error gracefully
    };
    img.src = logoUrl;
  });
}

/**
 * Format specialized QR payloads
 */
export function buildWifiQRPayload(ssid: string, pass: string, encryption: 'WPA' | 'WEP' | 'nopass' = 'WPA'): string {
  return `WIFI:S:${ssid};T:${encryption};P:${pass};;`;
}

export function buildEmailQRPayload(email: string, subject = '', body = ''): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildPhoneQRPayload(phone: string): string {
  return `tel:${phone}`;
}
