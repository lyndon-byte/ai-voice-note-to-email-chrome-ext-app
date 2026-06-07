import { useState, useEffect } from "react";
import axios from "axios";
import { getToken, getCurrentUser } from "../AuthGuard";
import { useNavigate, useLocation } from "react-router-dom";
import { generateId } from "ai";
import { API_BASE_URL } from "../config/api";

export default function LandingScreen() {

  const navigate = useNavigate()
  const user = getCurrentUser();
  const location = useLocation()

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(location.state?.page ?? null);
  const [totalPages, setTotalPages] = useState(null);

 
  useEffect(() => {

    fetchChats(page);

  }, [page]);

  async function fetchChats(page) {

    setLoading(true);
    setError(null);

    const token = await getToken();

    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page },
      });

      const chats = data.data || [];

      const totalPages = data.pagination?.totalPages
      const currentPage = data.pagination?.currentPage

      const mapped = chats.map((item) => ({
        chatId: item.chatId,
        title: item.title,
        updatedAt: item.updatedAt,
      }));

      setSessions(mapped);
      setPage(currentPage)
      setTotalPages(totalPages);

    } catch (err) {
      setError("Could not load sessions.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSessionClick(chatId) {

    try {

      navigate('/email', { state: { chatId, previousPage: page } });

    } catch (err) {
      console.error("Failed to fetch messages for chatId:", chatId, err);
    } 

  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diffMs = Date.now() - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) {
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m ago`;
      return `${Math.floor(diffMins / 60)}h ago`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  return (

    <div className="bg-white min-h-screen w-full flex flex-col">

      {/* Header — tight, no excess top padding */}
      <header className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <p className="text-xs text-gray-500 tracking-wide leading-none mb-1">
            {getGreeting()},
          </p>
          <h1 className="text-2xl font-normal text-gray-900 tracking-tight leading-none">
            {user.displayName}
          </h1>
        </div>

        <button
          onClick={() => {

            const id = generateId()
            navigate('/email',{ state: { chatId: id, initialMessages: []  }})

          }}
          aria-label="New session"
          className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white active:scale-95 transition-transform shrink-0 cursor-pointer"
        >
          <svg
            width="16" height="16" viewBox="0 0 16 16"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
        </button>
      </header>

      <div className="border-t border-gray-200 mx-5" />

      {/* Body */}
      <main className="flex-1 pt-8">
        <p className="text-[10px] uppercase tracking-widest text-gray-700 px-5 mb-4">
          Recents 
        </p>

        {/* Skeleton */}
        {loading && (
          <ul className="px-5 space-y-4 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-3/5 mb-2" />
                <div className="h-2.5 bg-gray-100 rounded w-2/5" />
              </li>
            ))}
          </ul>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="px-5 pt-4 flex flex-col items-start gap-3">
            <p className="text-sm text-gray-400">{error}</p>
            <button
              onClick={() => fetchChats(page)}
              className="text-sm text-gray-900 border border-gray-200 rounded-full px-5 py-2 active:scale-95 transition-transform"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && sessions.length === 0 && (
          <div className="flex flex-col items-center gap-2 pt-16 px-5">
            <svg
              width="38" height="38" viewBox="0 0 38 38"
              fill="none" stroke="#6a7282" strokeWidth="1.4"
              className="mb-2"
            >
              <rect x="5" y="7" width="28" height="24" rx="4" />
              <line x1="11" y1="15" x2="27" y2="15" />
              <line x1="11" y1="21" x2="21" y2="21" />
            </svg>
            <p className="text-base text-gray-500">No sessions yet</p>
            <p className="text-xs text-gray-500">Tap + to start a new one</p>
          </div>
        )}

        {/* Sessions list */}
        {!loading && !error && sessions.length > 0 && (
          <ul className="w-full space-y-3 px-5">
            {sessions.map((s, idx) => (
              <li key={s.chatId} className="w-full">
                <button
                  type="button"
                  onClick={() => handleSessionClick(s.chatId)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 text-left shadow-sm shadow-slate-100 transition-all duration-200 hover:-translate-y-0.5  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="h-2 w-2 rounded bg-gray-900 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 leading-snug">
                        {s.title}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {formatDate(s.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Pagination */}
      {!loading && !error && sessions.length > 0 && (
        <footer className="flex items-center justify-between px-5 pt-3 pb-4 border-t border-gray-100">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1.5 text-sm text-gray-900 disabled:opacity-25 transition-opacity active:scale-95 cursor-pointer disabled:cursor-default"
          >
            <svg
              width="14" height="14" viewBox="0 0 14 14"
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="9 2.5 4.5 7 9 11.5" />
            </svg>
            Prev
          </button>

          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1.5 text-sm text-gray-900 disabled:opacity-25 transition-opacity active:scale-95 cursor-pointer disabled:cursor-default"
          >
            Next
            <svg
              width="14" height="14" viewBox="0 0 14 14"
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="5 2.5 9.5 7 5 11.5" />
            </svg>
          </button>
        </footer>
      )}
    </div>
  );
}