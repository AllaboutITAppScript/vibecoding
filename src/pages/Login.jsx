import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { login } from "../api";

const FEATURES = [
  "JWT Authentication มาตรฐานสากล",
  "จัดการข้อมูลผู้ใช้แบบ Real-time",
  "ดีไซน์ทันสมัย ใช้งานง่าย",
];

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Already logged in? Go straight to the profile page
  if (localStorage.getItem("jwt") != null) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const objects = await login(username, password);
    setLoading(false);
    console.log(objects);
    if (objects["status"] === "ok") {
      localStorage.setItem("jwt", objects["accessToken"]);
      Swal.fire({
        text: objects["message"],
        icon: "success",
        confirmButtonText: "OK",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/");
        }
      });
    } else {
      Swal.fire({
        text: objects["message"],
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
          <img src="/logo.svg" className="w-10 h-10 rounded-xl shadow-lg" alt="My App" />
          <span className="text-lg font-bold tracking-tight">My App</span>
        </div>

        <div className="relative space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight">
              เข้าสู่ระบบครั้งเดียว
              <br />
              ใช้งานได้ทุกที่
            </h1>
            <p className="text-indigo-200/90 max-w-md">
              ระบบจัดการบัญชีผู้ใช้ที่ทันสมัย พร้อมความปลอดภัยระดับ Enterprise
              ด้วย JWT Authentication
            </p>
          </div>

          <ul className="space-y-3.5 text-sm">
            {FEATURES.map((feature) => (
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
          © 2026 My App. All rights reserved.
        </p>
      </div>

      {/* ── Form panel ────────────────────────────────────────── */}
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="/logo.svg" className="w-10 h-10 rounded-xl shadow" alt="My App" />
            <span className="text-lg font-bold text-slate-800">My App</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
          <p className="text-slate-500 text-sm mt-1 mb-8">เข้าสู่ระบบเพื่อใช้งานต่อ</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-600 mb-1.5"
              >
                Email address
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
                  type="email"
                  id="username"
                  placeholder="name@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
                Password
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 text-white font-semibold shadow-lg shadow-indigo-600/25 transition"
            >
              {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-slate-600">
            <p className="font-semibold text-indigo-700 mb-1.5">บัญชีทดลอง</p>
            <p>
              อีเมล: <code className="font-mono">karn.yong@mecallapi.com</code>
            </p>
            <p>
              รหัสผ่าน: <code className="font-mono">mecallapi</code>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            <a
              href="https://www.freepik.com/free-photos-vectors/technology"
              className="hover:text-slate-500 transition"
            >
              Technology vector created by freepik - www.freepik.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
