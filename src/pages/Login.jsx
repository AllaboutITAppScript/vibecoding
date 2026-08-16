import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { login } from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/30 p-8 sm:p-10">
          <div className="text-center mb-8">
            <img
              src="/logo.svg"
              alt="My App"
              className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg"
            />
            <h1 className="text-2xl font-bold text-slate-800">
              My App <span className="text-indigo-600">· Login</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              เข้าสู่ระบบเพื่อใช้งาน
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-600 mb-1.5"
              >
                Email address
              </label>
              <input
                type="email"
                id="username"
                placeholder="name@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-600 mb-1.5"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 text-white font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              {loading ? "กำลังเข้าสู่ระบบ…" : "Login"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          <a
            href="https://www.freepik.com/free-photos-vectors/technology"
            className="hover:text-slate-300 transition"
          >
            Technology vector created by freepik - www.freepik.com
          </a>
        </p>
      </div>
    </main>
  );
}
