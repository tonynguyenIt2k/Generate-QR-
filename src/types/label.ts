export type ElementType = 'text' | 'qr' | 'barcode' | 'image' | 'rectangle' | 'line' | 'circle';

export type QRType = 'text' | 'url' | 'imei' | 'serial' | 'wifi' | 'email' | 'phone' | 'json';
export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'DATAMATRIX';
export type QRErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  x: number; // in mm
  y: number; // in mm
  width: number; // in mm
  height: number; // in mm
  rotation: number; // in degrees
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string; // supports mustache variables e.g. {{Model}} {{Gia | currency}}
  fontSize: number; // in pt
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | '600' | '800';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  autoFit?: boolean;
  wrap?: boolean;
  lineHeight?: number;
}

export interface QRElement extends BaseElement {
  type: 'qr';
  content: string; // supports {{IMEI}}, {{URL}}, etc.
  qrType: QRType;
  fgColor: string;
  bgColor: string;
  errorCorrection: QRErrorCorrection;
  logoUrl?: string;
  logoSizeRatio?: number; // 0.1 to 0.35
  margin?: number;
}

export interface BarcodeElement extends BaseElement {
  type: 'barcode';
  content: string; // e.g. {{IMEI}} or static code
  format: BarcodeFormat;
  fgColor: string;
  bgColor: string;
  displayValue: boolean;
  fontSize: number;
  fontFamily: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // base64 or url
  keepAspectRatio: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'rectangle' | 'line' | 'circle';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number; // in mm or px
  cornerRadius?: number; // in mm for rectangle
}

export type LabelElement = TextElement | QRElement | BarcodeElement | ImageElement | ShapeElement;

export interface LabelSizePreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
  category: 'mobile' | 'retail' | 'shipping' | 'custom';
}

export interface PrintSettings {
  printerName?: string;
  presetId: string;
  widthMm: number;
  heightMm: number;
  dpi: number; // 203, 300, 600
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  gapMm: number;
  labelsPerRow: number;
  copiesPerItem: number;
}

export interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  category: 'phone' | 'accessory' | 'warehouse' | 'warranty' | 'custom';
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  sampleData?: Record<string, any>;
}

export type DatasetRow = Record<string, string | number>;

export interface GeneratedLabel {
  id: string;
  rowIndex: number;
  data: DatasetRow;
  selected: boolean;
  status: 'pending' | 'rendered' | 'error';
  errorMessage?: string;
  previewDataUrl?: string;
}
