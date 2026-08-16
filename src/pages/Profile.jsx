import { useEffect, useState, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  getCurrentUser,
  getYouTubePlaylists,
  getAdminUsers,
  setUserBlocked,
  repairMojibake,
} from "../api";

const ADMIN_EMAIL = "jhokhao@gmail.com";
const BRAND_LOGO =
  "https://lh3.googleusercontent.com/a/ACg8ocIVWlJu0DIkrMmkw2kp3LIeOvkgoGSOe33Vbt-oQ77TWq9Ym_Os=s96-c";

function formatViews(n) {
  const x = Number(n);
  if (!x) return "";
  return x >= 1000 ? (x / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(x);
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return "";
  }
}

const VIDEOS_PER_PAGE = 12;

// Page numbers to show in the pagination bar (current ± 2, with ellipsis)
function pageNumbers(current, total) {
  const pages = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("...");
    out.push(p);
    prev = p;
  }
  return out;
}

// One video card (thumbnail + title + views/date). Click opens the popup player.
function VideoCard({ video, onSelect }) {
  return (
    <button
      onClick={() => onSelect(video)}
      className="group w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
    >
      <div className="relative aspect-video bg-slate-900">
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:opacity-90 transition"
        />
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <span className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition">
          {video.title}
        </p>
        {video.playlistTitle && (
          <span className="mt-1.5 inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[11px] font-medium">
            {video.playlistTitle}
          </span>
        )}
        <p className="mt-1.5 text-xs text-slate-400">
          {formatViews(video.views) && `${formatViews(video.views)} ครั้ง · `}
          {formatDate(video.published)}
        </p>
      </div>
    </button>
  );
}

// Flat search results across all playlists (deduped by video id)
function SearchResults({ videos, onSelectVideo }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(videos.length / VIDEOS_PER_PAGE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * VIDEOS_PER_PAGE;

  if (videos.length === 0) {
    return <p className="text-sm text-slate-400 py-4">ไม่พบคลิปที่ค้นหา</p>;
  }

  return (
    <div>
      <p className="text-sm text-slate-400 mb-4">พบ {videos.length} คลิป</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.slice(start, start + VIDEOS_PER_PAGE).map((video) => (
          <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
          <button
            onClick={() => setPage(current - 1)}
            disabled={current === 1}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ก่อนหน้า
          </button>
          {pageNumbers(current, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                  p === current
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => setPage(current + 1)}
            disabled={current === totalPages}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ถัดไป
          </button>
        </div>
      )}
    </div>
  );
}

// Popup player: embedded YouTube iframe in a modal
function VideoModal({ video, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{video.title}</h3>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="ปิด"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="relative aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-400">
          <span>
            {formatViews(video.views) && `${formatViews(video.views)} ครั้ง · `}
            {formatDate(video.published)}
          </span>
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-indigo-600 hover:text-indigo-700 transition"
          >
            เปิดบน YouTube ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// One playlist section: header + grid of its videos + pagination
function PlaylistSection({ playlist, onSelectVideo }) {
  const [page, setPage] = useState(1);
  const videos = playlist.videos || [];
  const totalPages = Math.max(1, Math.ceil(videos.length / VIDEOS_PER_PAGE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * VIDEOS_PER_PAGE;
  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          {playlist.title}
          <span className="text-xs font-normal text-slate-400">({videos.length})</span>
        </h2>
        <a
          href={`https://www.youtube.com/playlist?list=${playlist.id}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition"
        >
          ดูบน YouTube
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.slice(start, start + VIDEOS_PER_PAGE).map((video) => (
          <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
          <button
            onClick={() => setPage(current - 1)}
            disabled={current === 1}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ก่อนหน้า
          </button>
          {pageNumbers(current, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                  p === current
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => setPage(current + 1)}
            disabled={current === totalPages}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ถัดไป
          </button>
        </div>
      )}
    </section>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [search, setSearch] = useState("");
  const [videosStatus, setVideosStatus] = useState("loading"); // loading | ok | error
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminStatus, setAdminStatus] = useState("idle"); // idle | loading | ok | error
  const [adminOpen, setAdminOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const jwt = localStorage.getItem("jwt");
  // Google Sign-In session (saved by the login page)
  const googleUser = JSON.parse(localStorage.getItem("google_user") || "null");
  const isGoogle = googleUser != null;

  // Admin = the owner account (can view all users + block/unblock)
  const isAdmin = user != null && user["username"] === ADMIN_EMAIL;
  // Token for admin API calls: JWT (email/password) or the Google ID token
  const adminToken = jwt || (googleUser && googleUser.credential) || null;

  // Not logged in? Go to the login page
  if (jwt == null && googleUser == null) {
    return <Navigate to="/login" replace />;
  }

  const loadVideos = useCallback(() => {
    setVideosStatus("loading");
    getYouTubePlaylists().then((objects) => {
      if (objects && objects["status"] === "ok") {
        const list = objects["playlists"] || [];
        setPlaylists(list);
        setActiveTab((prev) => (list.some((p) => p.id === prev) ? prev : (list[0]?.id ?? null)));
        setVideosStatus("ok");
      } else {
        setVideosStatus("error");
      }
    });
  }, []);

  useEffect(() => {
    if (isGoogle) {
      // Google session — profile data comes from the ID token
      setUser({
        username: googleUser.email,
        fname: repairMojibake(googleUser.name),
        lname: "",
        avatar: googleUser.picture,
      });
    } else {
      async function loadUser() {
        try {
          const objects = await getCurrentUser(jwt);
          if (objects["status"] === "ok") {
            setUser({
              username: objects["user"]["username"],
              fname: repairMojibake(objects["user"]["fname"]),
              lname: repairMojibake(objects["user"]["lname"]),
              avatar: objects["user"]["avatar"],
            });
          }
        } catch (e) {
          // ignore — profile stays on placeholder state
        }
      }
      loadUser();
    }

    // YouTube playlists of the channel (public)
    loadVideos();
    // Watchdog: never leave the loading state hanging
    const watchdog = setTimeout(() => {
      setVideosStatus((s) => (s === "loading" ? "error" : s));
    }, 15000);
    return () => clearTimeout(watchdog);
  }, [jwt, isGoogle, loadVideos]);

  // Close the admin modal with the Escape key
  useEffect(() => {
    if (!adminOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setAdminOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adminOpen]);

  const loadAdminUsers = useCallback(() => {
    if (!adminToken) {
      setAdminStatus("error");
      return;
    }
    setAdminStatus("loading");
    getAdminUsers(adminToken).then((r) => {
      if (r && r["status"] === "ok") {
        setAdminUsers(r["users"] || []);
        setAdminStatus("ok");
      } else {
        setAdminStatus("error");
      }
    });
  }, [adminToken]);

  async function toggleBlock(row) {
    const next = !row.blocked;
    const r = await setUserBlocked(adminToken, row.id, next);
    if (r && r["status"] === "ok") {
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === row.id ? { ...u, blocked: next } : u))
      );
    } else {
      Swal.fire({
        text: (r && r["message"]) || "อัปเดตสถานะไม่สำเร็จ",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  }

  const stats = [
    { label: "สถานะบัญชี", value: "Active", tone: "text-emerald-600" },
    {
      label: "สิทธิ์การเข้าถึง",
      value: isGoogle ? "Google OAuth" : "JWT Bearer",
      tone: "text-slate-800",
    },
    {
      label: "ระบบ",
      value: isGoogle ? "Google Sign-In" : "MeCallAPI Mock",
      tone: "text-slate-800",
    },
  ];

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function logout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("google_user");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Sidebar (desktop) ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-72 z-30 bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-950 text-white">
        {/* Brand */}
        <div className="px-6 pt-7 pb-6 flex items-center gap-3 border-b border-white/10">
          <img
            src={BRAND_LOGO}
            alt="ครบเครื่องเรื่องไอที"
            className="w-11 h-11 rounded-xl ring-2 ring-white/25 shadow-lg object-cover"
          />
          <div>
            <p className="font-bold text-[15px] leading-tight">ครบเครื่องเรื่องไอที</p>
            <p className="text-[11px] text-indigo-300/80 mt-0.5">Admin Dashboard</p>
          </div>
        </div>

        {/* Nav menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-300/70">
            เมนู
          </p>
          <button
            onClick={() => scrollToSection("top")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm transition"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z"
              />
            </svg>
            Dashboard
          </button>
          <button
            onClick={() => scrollToSection("profile-card")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-100/90 hover:bg-white/10 hover:text-white font-medium text-sm transition"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            บัญชี
          </button>
          <button
            onClick={() => scrollToSection("videos")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-100/90 hover:bg-white/10 hover:text-white font-medium text-sm transition"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            คลิปจาก YouTube
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setAdminOpen(true);
                if (adminStatus === "idle") loadAdminUsers();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-100/90 hover:bg-white/10 hover:text-white font-medium text-sm transition"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              จัดการผู้ใช้
            </button>
          )}
        </nav>

        {/* User card + logout */}
        <div className="px-4 pb-6">
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 flex items-center gap-3">
            <img
              src={user ? user["avatar"] : "/user.svg"}
              alt="avatar"
              className="w-10 h-10 rounded-full ring-2 ring-white/20 object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {user ? `${user["fname"]} ${user["lname"]}` : "..."}
              </p>
              <p className="text-[11px] text-indigo-300/80 truncate">
                {user ? user["username"] : "..."}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────── */}
      <nav className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={BRAND_LOGO} className="w-8 h-8 rounded-lg shadow-sm object-cover" alt="ครบเครื่องเรื่องไอที" />
            <span className="font-bold text-slate-800 text-sm">ครบเครื่องเรื่องไอที</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition"
            >
              <img
                src={user ? user["avatar"] : "/user.svg"}
                alt="avatar"
                className="w-9 h-9 rounded-full ring-2 ring-slate-200 object-cover"
              />
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 z-20 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {user ? `${user["fname"]} ${user["lname"]}` : "..."}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {user ? user["username"] : "..."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      scrollToSection("videos");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    คลิปจาก YouTube
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setAdminOpen(true);
                        if (adminStatus === "idle") loadAdminUsers();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      จัดการผู้ใช้
                    </button>
                  )}
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* ── Main content ──────────────────────────────────────── */}
      <main id="top" className="lg:ml-72">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Page header */}
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                ครบเครื่องเรื่องไอที, {user ? user["fname"] : "..."} 👋
              </h1>
              <p className="text-slate-500 text-sm mt-1">ยินดีต้อนรับกลับสู่แดชบอร์ดของคุณ</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => {
                    setAdminOpen(true);
                    if (adminStatus === "idle") loadAdminUsers();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  จัดการผู้ใช้
                </button>
              )}
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                ออกจากระบบ
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4"
              >
                <p className="text-xs font-medium text-slate-400">{stat.label}</p>
                <p className={`mt-1 text-lg font-bold ${stat.tone}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Profile card */}
          <div id="profile-card" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />
            <div className="px-6 pb-6 -mt-12">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <img
                  src={user ? user["avatar"] : "/user.svg"}
                  alt="avatar"
                  className="w-24 h-24 rounded-2xl ring-4 ring-white shadow-lg object-cover"
                />
                <div className="flex-1 pb-1">
                  <h2 className="text-xl font-bold text-slate-800">
                    {user ? `${user["fname"]} ${user["lname"]}` : "..."}
                  </h2>
                  <p className="text-slate-500 text-sm">{user ? user["username"] : "..."}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-1 sm:mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>

              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-400">First name</dt>
                  <dd className="font-medium text-slate-700">{user ? user["fname"] : "-"}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-400">Last name</dt>
                  <dd className="font-medium text-slate-700">{user ? user["lname"] : "-"}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-400">Email</dt>
                  <dd className="font-medium text-slate-700 truncate">
                    {user ? user["username"] : "-"}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-400">Authentication</dt>
                  <dd className="font-medium text-slate-700">
                    {isGoogle ? "Google OAuth" : "JWT · Bearer Token"}
                  </dd>
                </div>
              </dl>

              {/* YouTube playlists — inside the profile card */}
              <div id="videos" className="mt-10 scroll-mt-24">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold text-slate-800">คลิปจาก YouTube</h2>
                  {/* Search box */}
                  <div className="relative w-full sm:w-72">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ค้นหาคลิป..."
                      className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-700 outline-none transition"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        aria-label="ล้างการค้นหา"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {videosStatus === "loading" && (
                  <div className="flex items-center gap-3 text-sm text-slate-400 py-6">
                    <span className="w-4 h-4 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
                    กำลังโหลดคลิป...
                  </div>
                )}

                {videosStatus === "error" && (
                  <div className="py-4">
                    <p className="text-sm text-red-500 mb-3">ไม่สามารถโหลดคลิปได้</p>
                    <button
                      onClick={loadVideos}
                      className="px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition"
                    >
                      ลองใหม่อีกครั้ง
                    </button>
                  </div>
                )}

                {videosStatus === "ok" && playlists.length === 0 && (
                  <p className="text-sm text-slate-400 py-4">ยังไม่มีคลิป</p>
                )}

                {videosStatus === "ok" &&
                  search.trim() !== "" &&
                  playlists.length > 0 &&
                  (() => {
                    // Dedupe across playlists, preferring a specific playlist over "Videos"
                    const byId = new Map();
                    playlists.forEach((pl) => {
                      const isVideos = pl.title === "Videos";
                      (pl.videos || []).forEach((v) => {
                        const cur = byId.get(v.id);
                        if (!cur || (cur.playlistTitle === "Videos" && !isVideos)) {
                          byId.set(v.id, { ...v, playlistTitle: isVideos ? "Videos" : pl.title });
                        }
                      });
                    });
                    const query = search.trim().toLowerCase();
                    const results = [...byId.values()].filter((v) =>
                      v.title.toLowerCase().includes(query)
                    );
                    return (
                      <SearchResults key={query} videos={results} onSelectVideo={setSelectedVideo} />
                    );
                  })()}

                {videosStatus === "ok" && search.trim() === "" && playlists.length > 0 && (
                  <div>
                    {/* Tab bar */}
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1 scrollbar-thin">
                      {playlists.map((pl) => {
                        const count = (pl.videos || []).length;
                        const active = activeTab === pl.id;
                        return (
                          <button
                            key={pl.id}
                            onClick={() => setActiveTab(pl.id)}
                            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                              active
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {pl.title}
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active playlist */}
                    {(() => {
                      const active =
                        playlists.find((p) => p.id === activeTab) || playlists[0];
                      return active ? (
                        <PlaylistSection
                          key={active.id}
                          playlist={active}
                          onSelectVideo={setSelectedVideo}
                        />
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-10 pb-4 text-center text-sm text-slate-400">
            สอนโดย{" "}
            <span className="font-semibold text-slate-500">ครบเครื่องเรื่องไอที</span>
          </footer>
        </div>
      </main>

      {/* Popup player */}
      {selectedVideo && (
        <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}

      {/* Admin modal — only for jhokhao@gmail.com */}
      {isAdmin && adminOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          onClick={() => setAdminOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-800">จัดการผู้ใช้</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadAdminUsers}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition"
                >
                  รีเฟรช
                </button>
                <button
                  onClick={() => setAdminOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  aria-label="ปิด"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto">
              {adminStatus === "loading" && (
                <div className="px-6 py-10 text-sm text-slate-400">กำลังโหลดผู้ใช้...</div>
              )}
              {adminStatus === "error" && (
                <div className="px-6 py-10 text-sm text-red-500">
                  โหลดข้อมูลผู้ใช้ไม่สำเร็จ
                  {!adminToken && (
                    <p className="mt-2 text-xs text-slate-400">
                      กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่อีกครั้ง (เพื่อยืนยันสิทธิ์ผู้ดูแล)
                    </p>
                  )}
                </div>
              )}
              {adminStatus === "ok" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                        <th className="px-6 py-3 font-medium">ผู้ใช้</th>
                        <th className="px-6 py-3 font-medium">อีเมล</th>
                        <th className="px-6 py-3 font-medium">วันที่สมัคร</th>
                        <th className="px-6 py-3 font-medium">สถานะ</th>
                        <th className="px-6 py-3 font-medium text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u.pictureUrl || "/user.svg"}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                              />
                              <span className="font-medium text-slate-700">
                                {u.displayName || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-slate-500">{u.userId}</td>
                          <td className="px-6 py-3 text-slate-500">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                u.blocked
                                  ? "bg-red-50 text-red-600"
                                  : "bg-emerald-50 text-emerald-600"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.blocked ? "bg-red-500" : "bg-emerald-500"
                                }`}
                              />
                              {u.blocked ? "ถูกบล็อก" : "ปกติ"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            {u.userId === ADMIN_EMAIL ? (
                              <span className="text-xs text-slate-300">ผู้ดูแล</span>
                            ) : u.blocked ? (
                              <button
                                onClick={() => toggleBlock(u)}
                                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-sm font-medium text-emerald-600 hover:bg-emerald-100 transition"
                              >
                                ปลดบล็อก
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleBlock(u)}
                                className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition"
                              >
                                บล็อก
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
