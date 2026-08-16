import { useEffect, useState, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { getCurrentUser, getYouTubePlaylists, repairMojibake } from "../api";

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
        <p className="mt-1.5 text-xs text-slate-400">
          {formatViews(video.views) && `${formatViews(video.views)} ครั้ง · `}
          {formatDate(video.published)}
        </p>
      </div>
    </button>
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
  const [videosStatus, setVideosStatus] = useState("loading"); // loading | ok | error
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const jwt = localStorage.getItem("jwt");
  // Google Sign-In session (saved by the login page)
  const googleUser = JSON.parse(localStorage.getItem("google_user") || "null");
  const isGoogle = googleUser != null;

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

  function logout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("google_user");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Top navbar ─────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" className="w-8 h-8 rounded-lg shadow-sm" alt="My App" />
              <span className="font-bold text-slate-800">My App</span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-sm">
              <span className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium">
                Dashboard
              </span>
              <span className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-default transition">
                บัญชี
              </span>
            </div>
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition"
            >
              <img
                src={user ? user["avatar"] : "/user.svg"}
                alt="avatar"
                className="w-9 h-9 rounded-full ring-2 ring-slate-200 object-cover"
              />
              <span className="hidden sm:block text-sm font-medium text-slate-700">
                {user ? user["fname"] : "..."}
              </span>
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

      {/* ── Main content ───────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              ครบเครื่องเรื่องไอที, {user ? user["fname"] : "..."} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">นี่คือภาพรวมบัญชีของคุณ</p>
          </div>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
            <div className="mt-10">
              <h2 className="text-xl font-bold text-slate-800 mb-6">คลิปจาก YouTube</h2>

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

              {videosStatus === "ok" && playlists.length > 0 && (
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

        {/* Popup player */}
        {selectedVideo && (
          <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
        )}

        {/* Footer */}
        <footer className="mt-10 pb-4 text-center text-sm text-slate-400">
          สอนโดย{" "}
          <span className="font-semibold text-slate-500">ครบเครื่องเรื่องไอที</span>
        </footer>
      </main>
    </div>
  );
}
