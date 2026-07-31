import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  ShieldAlert,
  Globe,
  RefreshCw,
  ShieldCheck,
  Bot,
  QrCode,
  Printer,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  required?: boolean;
}

const generateCaptchaCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, required = false }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // CAPTCHA State
  const [captchaCode, setCaptchaCode] = useState<string>('');
  const [captchaInput, setCaptchaInput] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const refreshCaptcha = useCallback(() => {
    const newCode = generateCaptchaCode();
    setCaptchaCode(newCode);
    setCaptchaInput('');
  }, []);

  // Initialize CAPTCHA when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      refreshCaptcha();
    }
  }, [isOpen, mode, refreshCaptcha]);

  // Draw CAPTCHA canvas
  useEffect(() => {
    if (!isOpen || !captchaCode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Random noise lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 160)}, ${Math.floor(Math.random() * 160)}, ${Math.floor(Math.random() * 200)}, 0.45)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineWidth = 1 + Math.random();
      ctx.stroke();
    }

    // Random noise dots
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 0.5)`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw rotated characters
    ctx.font = 'bold 20px "Courier New", monospace, sans-serif';
    ctx.textBaseline = 'middle';
    const charWidth = (canvas.width - 24) / captchaCode.length;

    for (let i = 0; i < captchaCode.length; i++) {
      const char = captchaCode[i];
      const x = 14 + i * charWidth;
      const y = canvas.height / 2 + (Math.random() * 4 - 2);
      const angle = (Math.random() - 0.5) * 0.4;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = `rgb(${Math.floor(Math.random() * 110)}, ${Math.floor(Math.random() * 90)}, ${Math.floor(110 + Math.random() * 120)})`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 2;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, [isOpen, captchaCode]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('file://') ? window.location.origin : '';
  const WEB_APP_URL = currentOrigin || 'https://ais-dev-pjrooggrb3rgcp3ujaoui5-816846408329.asia-southeast1.run.app';

  const handleOpenBrowser = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(WEB_APP_URL);
    } else {
      window.open(WEB_APP_URL, '_blank');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      if (onSuccess) onSuccess('Đăng nhập Google thành công! Tất cả cài đặt đã được đồng bộ.');
      onClose();
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setErrorMsg('auth/unauthorized-domain');
      } else if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setErrorMsg('Phương thức đăng nhập này chưa được bật trên Firebase Console (Authentication -> Sign-in method). Vui lòng kích hoạt "Email/Password" hoặc "Google".');
      } else if (isElectron || err.code === 'auth/operation-not-supported-in-this-environment') {
        setErrorMsg('electron_google_auth_notice');
      } else {
        setErrorMsg(err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vui lòng điền đầy đủ Email và Mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải từ 6 ký tự trở lên.');
      return;
    }

    if (!captchaInput || captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setErrorMsg('Mã xác thực CAPTCHA không chính xác. Vui lòng nhập lại!');
      refreshCaptcha();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        if (onSuccess) onSuccess('Đăng nhập thành công!');
      } else {
        await signUpWithEmail(email, password);
        if (onSuccess) onSuccess('Đăng ký tài khoản thành công!');
      }
      onClose();
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      refreshCaptcha();
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Email này đã được sử dụng. Vui lòng đăng nhập.');
      } else if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setErrorMsg('Phương thức Đăng nhập bằng Email/Mật khẩu chưa được bật trong dự án Firebase. Vui lòng bật "Email/Password" trong Firebase Console -> Authentication -> Sign-in method.');
      } else {
        setErrorMsg(err.message || 'Thao tác thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {mode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Tạo Tài Khoản Mới'}
                </h3>
                {required && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800/80">
                    Bắt buộc
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {required
                  ? 'Vui lòng đăng nhập để bắt đầu sử dụng QR Label Pro'
                  : 'Lưu và riêng biệt hóa cài đặt mẫu in theo tài khoản'}
              </p>
            </div>
          </div>
          {!required && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* App Branding Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-indigo-800/60 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">QR Label Pro</h4>
                <p className="text-[10px] text-indigo-200/80">Thiết kế & In tem nhãn mã vạch nhiệt chuyên nghiệp</p>
              </div>
            </div>

            <div className="pt-1.5 grid grid-cols-2 gap-1.5 text-[10px] text-indigo-100/90 font-medium border-t border-indigo-800/40">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Đồng bộ Cloud Firebase</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>In tem nhiệt 40x30 / 50x30</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Nhập Excel danh sách tem</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Xuất ZIP / Backup JSON</span>
              </div>
            </div>
          </div>
          {errorMsg === 'auth/unauthorized-domain' ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-xs space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tên Miền Chưa Được Thêm Vào Firebase</span>
              </div>
              <p className="text-amber-900/80 dark:text-amber-200/90 leading-relaxed text-[11px]">
                Tên miền <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-[10px] font-bold select-all text-amber-900 dark:text-amber-100">{typeof window !== 'undefined' ? window.location.hostname : 'domain-cua-ban'}</code> chưa được ủy quyền trong Firebase Console.
              </p>
              <div className="pt-1 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-amber-900 dark:text-amber-100">👉 Cách khắc phục:</div>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Vào <strong>Firebase Console</strong> &gt; project của bạn &gt; <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.</li>
                  <li>Bấm <strong>Add domain</strong> và dán tên miền: <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-[10px] font-bold select-all text-amber-900 dark:text-amber-100">{typeof window !== 'undefined' ? window.location.hostname : ''}</code>.</li>
                </ol>
                <div className="mt-2 text-slate-500 font-medium">Hoặc bạn có thể Đăng Nhập bằng Email/Mật khẩu bên dưới ngay lập tức!</div>
              </div>
            </div>
          ) : errorMsg === 'electron_google_auth_notice' ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-xs space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Đăng Nhập Google Trên Ứng Dụng Desktop</span>
              </div>
              <p className="text-amber-900/80 dark:text-amber-200/90 leading-relaxed text-[11px]">
                Google Firebase quy định bảo mật chặn cửa sổ Popup 1-click khi chạy từ file máy tính cục bộ (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-[10px]">file://</code>).
              </p>
              
              <button
                type="button"
                onClick={handleOpenBrowser}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Globe className="w-3.5 h-3.5" /> Mở Trình Duyệt Chrome / Edge Đăng Nhập
              </button>

              <div className="pt-1 space-y-1 text-[11px]">
                <div className="font-semibold text-amber-900 dark:text-amber-100">👉 Đăng nhập nhanh trực tiếp trên app EXE:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                  <li>Vui lòng gõ <strong>Email + Mật khẩu</strong> ở khung bên dưới.</li>
                  <li>Nếu chưa có tài khoản, gõ Email của bạn và bấm <strong>&ldquo;Tạo Tài Khoản Mới&rdquo;</strong>.</li>
                </ul>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Tiếp tục với Google</span>
          </button>

          {typeof window !== 'undefined' && window.electronAPI?.isElectron && (
            <div className="text-center -mt-2">
              <button
                type="button"
                onClick={handleOpenBrowser}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <Globe className="w-3 h-3" /> Mở trình duyệt Web để đăng nhập Google
              </button>
            </div>
          )}

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              hoặc dùng Email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vidu@cuahang.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* CAPTCHA Anti-Bot Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Xác thực CAPTCHA</span>
                </label>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                  <Bot className="w-3 h-3 text-emerald-500" /> Chống Spam/Robot
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <canvas
                  ref={canvasRef}
                  width={130}
                  height={38}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 select-none shadow-xs shrink-0 cursor-pointer bg-slate-100 dark:bg-slate-800"
                  onClick={refreshCaptcha}
                  title="Bấm vào hình để đổi mã CAPTCHA mới"
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Tải lại mã CAPTCHA mới"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Bấm hình hoặc nút để đổi mã
                </span>
              </div>

              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Nhập 5 ký tự trong hình trên..."
                  maxLength={5}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase tracking-wider focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading
                ? 'Đang xử lý...'
                : mode === 'login'
                ? 'Đăng Nhập'
                : 'Đăng Ký Tài Khoản'}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center pt-2">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrorMsg(null);
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {mode === 'login'
                ? 'Chưa có tài khoản? Đăng ký ngay'
                : 'Đã có tài khoản? Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
