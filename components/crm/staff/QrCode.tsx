'use client';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** 生成二维码图片（dataURL），可下载打印。 */
export function useQr(text: string | null, size = 600): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return setUrl(null);
    QRCode.toDataURL(text, { width: size, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0A1730', light: '#FFFFFF' } })
      .then(setUrl)
      .catch(() => setUrl(null));
  }, [text, size]);
  return url;
}
