import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { getCurrentUser } from "../api";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const jwt = localStorage.getItem("jwt");
  // Not logged in? Go to the login page
  if (jwt == null) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    async function loadUser() {
      const objects = await getCurrentUser(jwt);
      if (objects["status"] === "ok") {
        setUser(objects["user"]);
      }
    }
    loadUser();
  }, [jwt]);

  function logout() {
    localStorage.removeItem("jwt");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Navbar */}
      <nav className="bg-slate-950/70 backdrop-blur border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="My App" className="w-9 h-9 rounded-lg" />
            <span className="text-white font-bold text-lg">My App</span>
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition"
            >
              <span className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase">
                {user ? user["fname"].charAt(0) : "?"}
              </span>
              {user ? user["fname"] : "..."}
              <svg
                className={`w-4 h-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-40 z-20 bg-white rounded-xl shadow-xl overflow-hidden">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Profile card */}
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/30 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 h-28" />
          <div className="px-6 pb-8 -mt-14 text-center">
            <img
              src={user ? user["avatar"] : "/user.svg"}
              alt="avatar"
              className="w-28 h-28 mx-auto rounded-full ring-4 ring-white shadow-lg object-cover"
            />
            <h2 className="mt-4 text-xl font-bold text-slate-800">
              {user ? `${user["fname"]} ${user["lname"]}` : "..."}
            </h2>
            <p className="text-slate-400 text-sm mt-1">{user ? user["username"] : "..."}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-slate-400 text-xs">First name</p>
                <p className="font-semibold text-slate-700 truncate">
                  {user ? user["fname"] : "-"}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-slate-400 text-xs">Last name</p>
                <p className="font-semibold text-slate-700 truncate">
                  {user ? user["lname"] : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
