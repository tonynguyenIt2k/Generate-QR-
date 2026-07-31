import React from 'react';
import {
  LabelTemplate,
  LabelElement,
  TextElement,
  QRElement,
  BarcodeElement,
  ShapeElement,
} from '../../types/label';

interface TemplatePreviewThumbnailProps {
  template: LabelTemplate;
  maxHeight?: number; // Maximum height in pixels
  className?: string;
}

const MiniQRCode: React.FC<{ fgColor?: string }> = ({ fgColor = '#000000' }) => (
  <svg viewBox="0 0 25 25" className="w-full h-full shrink-0" fill={fgColor}>
    {/* Top-Left Finder */}
    <rect x="0" y="0" width="7" height="7" fill={fgColor} />
    <rect x="1" y="1" width="5" height="5" fill="#ffffff" />
    <rect x="2" y="2" width="3" height="3" fill={fgColor} />

    {/* Top-Right Finder */}
    <rect x="18" y="0" width="7" height="7" fill={fgColor} />
    <rect x="19" y="1" width="5" height="5" fill="#ffffff" />
    <rect x="20" y="2" width="3" height="3" fill={fgColor} />

    {/* Bottom-Left Finder */}
    <rect x="0" y="18" width="7" height="7" fill={fgColor} />
    <rect x="1" y="19" width="5" height="5" fill="#ffffff" />
    <rect x="2" y="20" width="3" height="3" fill={fgColor} />

    {/* Pattern Modules */}
    <rect x="8" y="2" width="2" height="2" />
    <rect x="11" y="0" width="2" height="2" />
    <rect x="14" y="2" width="2" height="2" />
    <rect x="2" y="8" width="2" height="2" />
    <rect x="5" y="11" width="2" height="2" />
    <rect x="8" y="8" width="3" height="3" />
    <rect x="13" y="8" width="3" height="2" />
    <rect x="18" y="8" width="2" height="3" />
    <rect x="22" y="10" width="3" height="2" />

    <rect x="8" y="13" width="2" height="3" />
    <rect x="11" y="12" width="3" height="3" />
    <rect x="16" y="13" width="2" height="2" />
    <rect x="20" y="14" width="3" height="3" />

    <rect x="8" y="18" width="3" height="2" />
    <rect x="12" y="17" width="2" height="3" />
    <rect x="15" y="19" width="3" height="3" />
    <rect x="20" y="19" width="4" height="2" />
    <rect x="9" y="22" width="3" height="3" />
    <rect x="14" y="23" width="2" height="2" />
    <rect x="18" y="22" width="3" height="3" />
  </svg>
);

const MiniBarcode: React.FC<{ fgColor?: string }> = ({ fgColor = '#000000' }) => (
  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full shrink-0" fill={fgColor}>
    <rect x="2" y="0" width="3" height="30" />
    <rect x="7" y="0" width="1" height="30" />
    <rect x="10" y="0" width="4" height="30" />
    <rect x="16" y="0" width="2" height="30" />
    <rect x="20" y="0" width="5" height="30" />
    <rect x="27" y="0" width="1" height="30" />
    <rect x="30" y="0" width="3" height="30" />
    <rect x="35" y="0" width="2" height="30" />
    <rect x="39" y="0" width="4" height="30" />
    <rect x="45" y="0" width="1" height="30" />
    <rect x="48" y="0" width="3" height="30" />
    <rect x="53" y="0" width="5" height="30" />
    <rect x="60" y="0" width="2" height="30" />
    <rect x="64" y="0" width="1" height="30" />
    <rect x="67" y="0" width="4" height="30" />
    <rect x="73" y="0" width="2" height="30" />
    <rect x="77" y="0" width="5" height="30" />
    <rect x="84" y="0" width="1" height="30" />
    <rect x="87" y="0" width="3" height="30" />
    <rect x="92" y="0" width="2" height="30" />
    <rect x="96" y="0" width="2" height="30" />
  </svg>
);

function resolveTextContent(content?: string, sampleData: Record<string, any> = {}): string {
  if (!content) return '';
  return content.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    if (sampleData[trimmed] !== undefined && sampleData[trimmed] !== '') {
      return String(sampleData[trimmed]);
    }
    if (sampleData._sampleOdd && sampleData._sampleOdd[trimmed] !== undefined) {
      return String(sampleData._sampleOdd[trimmed]);
    }
    // Fallbacks
    if (trimmed === 'Model') return 'NUBIA NEO 5 GT 12GB';
    if (trimmed === 'DungLuong') return '256GB';
    if (trimmed === 'MauSac') return 'BẠC';
    if (trimmed === 'Serial') return 'F2LXK982P01';
    if (trimmed === 'IMEI') return '356782091234561';
    if (trimmed === 'Gia' || trimmed === 'GiaNiemYet' || trimmed === 'GiaBan') return '1,290,000đ';
    if (trimmed === 'TenShop' || trimmed === 'TenCuaHang') return 'MOBILE CITY';
    if (trimmed === 'BaoHanh') return 'ĐÃ KÍCH HOẠT';
    return trimmed;
  });
}

export const TemplatePreviewThumbnail: React.FC<TemplatePreviewThumbnailProps> = ({
  template,
  maxHeight = 120,
  className = '',
}) => {
  const widthMm = template.widthMm || 40;
  const heightMm = template.heightMm || 30;
  const sampleData = template.sampleData || {};

  // Calculate target height & scaled width
  const renderHeightPx = maxHeight;
  const renderWidthPx = Math.round(maxHeight * (widthMm / heightMm));

  // Scale factor (pixels per mm)
  const scale = renderHeightPx / heightMm;

  return (
    <div className={`flex items-center justify-center w-full py-1 ${className}`}>
      <div
        style={{
          width: `${renderWidthPx}px`,
          height: `${renderHeightPx}px`,
        }}
        className="relative bg-white border border-slate-300 dark:border-slate-600 rounded-xs shadow-xs overflow-hidden select-none shrink-0"
      >
        {/* Dual Part Divider if applicable */}
        {template.isDualPart && (
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-black z-10" />
        )}

        {/* Render Elements */}
        {template.elements?.map((el: LabelElement) => {
          const leftPct = (el.x / widthMm) * 100;
          const topPct = (el.y / heightMm) * 100;
          const widthPct = (el.width / widthMm) * 100;
          const heightPct = (el.height / heightMm) * 100;

          const isTop = el.y + el.height / 2 < heightMm / 2;
          const currentSample = template.isDualPart
            ? isTop
              ? sampleData._sampleOdd || sampleData
              : sampleData._sampleEven || {
                  ...sampleData,
                  Serial: sampleData.Serial ? `${sampleData.Serial.replace('01', '02')}` : 'F2LXK982P02',
                }
            : sampleData;

          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                zIndex: el.zIndex || 1,
              }}
              className="flex items-center overflow-hidden"
            >
              {el.type === 'qr' && (
                <div className="w-full h-full p-0.5 flex items-center justify-center">
                  <MiniQRCode fgColor={(el as QRElement).fgColor || '#000000'} />
                </div>
              )}

              {el.type === 'barcode' && (
                <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden">
                  <MiniBarcode fgColor={(el as BarcodeElement).fgColor || '#000000'} />
                  {(el as BarcodeElement).displayValue && (
                    <span
                      style={{ fontSize: `${Math.max(6, Math.min(9, scale * 1.8))}px` }}
                      className="font-mono text-black leading-none font-bold tracking-tight truncate mt-0.5"
                    >
                      {resolveTextContent((el as BarcodeElement).content, currentSample)}
                    </span>
                  )}
                </div>
              )}

              {el.type === 'text' && (
                <div
                  style={{
                    fontSize: `${Math.max(6, Math.min(13, ((el as TextElement).fontSize || 8) * (scale / 3.8)))}px`,
                    fontWeight: (el as TextElement).fontWeight || 'normal',
                    textAlign: ((el as TextElement).textAlign || 'left') as any,
                    color: (el as TextElement).color || '#000000',
                    lineHeight: 1.1,
                  }}
                  className="w-full font-sans overflow-hidden leading-tight break-words"
                >
                  {resolveTextContent((el as TextElement).content, currentSample)}
                </div>
              )}

              {el.type === 'line' && (
                <div
                  style={{
                    backgroundColor: (el as ShapeElement).strokeColor || '#000000',
                    width: '100%',
                    height: `${Math.max(1, ((el as ShapeElement).strokeWidth || 1) * 0.8)}px`,
                  }}
                />
              )}

              {el.type === 'rectangle' && (
                <div
                  style={{
                    backgroundColor: (el as ShapeElement).fillColor || 'transparent',
                    borderWidth: `${(el as ShapeElement).strokeWidth || 1}px`,
                    borderColor: (el as ShapeElement).strokeColor || '#000000',
                    width: '100%',
                    height: '100%',
                  }}
                />
              )}

              {el.type === 'image' && (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
                  [IMG]
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
