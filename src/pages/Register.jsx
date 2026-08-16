import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api";

export default function Register() {
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pictureUrl, setPictureUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const result = await registerUser({
      userId,
      displayName,
      password,
      pictureUrl,
      statusMessage,
    });
    setLoading(false);
    if (result["status"] === "ok") {
      Swal.fire({
        text: result["message"],
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        navigate("/login");
      });
    } else {
      Swal.fire({
        text: result["message"],
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  }

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-white">
      {/* ── Brand panel (desktop) ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 px-12 py-10 text-white">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.14) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <img src="https://lh3.googleusercontent.com/a/ACg8ocIVWlJu0DIkrMmkw2kp3LIeOvkgoGSOe33Vbt-oQ77TWq9Ym_Os=s96-c" className="w-10 h-10 rounded-xl shadow-lg" alt="ครบเครื่องเรื่องไอที" />
          <span className="text-lg font-bold tracking-tight">ครบเครื่องเรื่องไอที</span>
        </div>

        <div className="relative space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight">
              สมัครสมาชิก
              <br />
              เริ่มต้นใช้งานได้เลย
            </h1>
            <p className="text-indigo-200/90 max-w-md">
              ลงทะเบียนเพียงไม่กี่ขั้นตอน ข้อมูลของคุณจะถูกบันทึกอย่างปลอดภัย
            </p>
          </div>

          <ul className="space-y-3.5 text-sm">
            {[
              "บันทึกข้อมูลลง Supabase แบบ Real-time",
              "ใช้งานร่วมกับระบบ AI ได้ทันที",
              "จัดการบัญชีของคุณได้ง่าย ๆ",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 ring-1 ring-white/20">
                  <svg
                    className="w-3.5 h-3.5 text-emerald-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-300/70">
          © 2026 ครบเครื่องเรื่องไอที. All rights reserved.
        </p>
      </div>

      {/* ── Form panel ────────────────────────────────────────── */}
      <div className="flex flex-col min-h-screen bg-slate-50">
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <img src="https://lh3.googleusercontent.com/a/ACg8ocIVWlJu0DIkrMmkw2kp3LIeOvkgoGSOe33Vbt-oQ77TWq9Ym_Os=s96-c" className="w-10 h-10 rounded-xl shadow" alt="ครบเครื่องเรื่องไอที" />
              <span className="text-lg font-bold text-slate-800">ครบเครื่องเรื่องไอที</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-800">สร้างบัญชีใหม่</h2>
            <p className="text-slate-500 text-sm mt-1 mb-8">
              กรอกข้อมูลเพื่อลงทะเบียน
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* User ID */}
              <div>
                <label
                  htmlFor="userId"
                  className="block text-sm font-medium text-slate-600 mb-1.5"
                >
                  User ID (อีเมลหรือชื่อผู้ใช้) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <input
                    type="text"
                    id="userId"
                    placeholder="name@example.com"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Display name */}
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-slate-600 mb-1.5"
                >
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <input
                    type="text"
                    id="displayName"
                    placeholder="สมชาย ใจดี"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-600 mb-1.5"
                >
                  รหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={4}
                    className={inputClass + " pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Picture URL */}
              <div>
                <label
                  htmlFor="pictureUrl"
                  className="block text-sm font-medium text-slate-600 mb-1.5"
                >
                  รูปโปรไฟล์ (URL)
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <input
                    type="url"
                    id="pictureUrl"
                    placeholder="https://example.com/avatar.png"
                    value={pictureUrl}
                    onChange={(e) => setPictureUrl(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Status message */}
              <div>
                <label
                  htmlFor="statusMessage"
                  className="block text-sm font-medium text-slate-600 mb-1.5"
                >
                  ข้อความสถานะ
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <input
                    type="text"
                    id="statusMessage"
                    placeholder="สวัสดีครับ 🙏"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 text-white font-semibold shadow-lg shadow-indigo-600/25 transition"
              >
                {loading ? "กำลังบันทึก…" : "ลงทะเบียน"}
              </button>
            </form>

            {/* Link to login */}
            <p className="mt-6 text-center text-sm text-slate-500">
              มีบัญชีอยู่แล้ว?{" "}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="pb-6 text-center text-xs text-slate-400">
          <p>
            สอนโดย{" "}
            <span className="font-semibold text-slate-500">
              ครบเครื่องเรื่องไอที
            </span>
          </p>
          <p className="mt-1">
            <a
              href="https://www.freepik.com/free-photos-vectors/technology"
              className="hover:text-slate-500 transition"
            >
              Technology vector created by freepik - www.freepik.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
