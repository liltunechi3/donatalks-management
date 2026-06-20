"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TaskStats {
  total: number;
  done: number;
}

interface Event {
  id: string;
  name: string;
  status: "planned" | "on_progress" | "done";
  event_date: string | null;
  event_time: string | null;
  format: "online" | "offline";
  theme: string | null;
  key_points: string | null;
  target_count: number | null;
  folder_link: string | null;
  created_at: string;
  task_stats: TaskStats;
}

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  on_progress: "On Progress",
  done: "Done",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  planned: { bg: "#e5e7eb", color: "#374151" },
  on_progress: { bg: "#fef3c7", color: "#b45309" },
  done: { bg: "#d1fae5", color: "#065f46" },
};

function Spinner({ small }: { small?: boolean }) {
  const size = small ? 18 : 28;
  return (
    <svg
      style={{ animation: "spin 1s linear infinite", height: size, width: size, display: "block", color: "#E8231A" }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export default function ManagementDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    status: "planned",
    event_date: "",
    event_time: "",
    format: "online",
    theme: "",
    target_count: "",
    folder_link: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Long press action sheet
  const [actionEvent, setActionEvent] = useState<Event | null>(null);
  const [pressing, setPressing] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/management/events");
      if (!res.ok) throw new Error("Gagal mengambil data event");
      const data = await res.json();
      setEvents(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  const pendingTasks = events.reduce((sum, e) => sum + (e.task_stats.total - e.task_stats.done), 0);
  const doneTasks = events.reduce((sum, e) => sum + e.task_stats.done, 0);

  const startPress = useCallback((event: Event) => {
    didLongPress.current = false;
    setPressing(event.id);
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPressing(null);
      setActionEvent(event);
    }, 500);
  }, []);

  const cancelPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setPressing(null);
  }, []);

  const handleCardClick = useCallback((event: Event) => {
    if (didLongPress.current) return;
    router.push(`/management/events/${event.id}`);
  }, [router]);

  async function handleDuplicate() {
    if (!actionEvent) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/management/events/${actionEvent.id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal menduplikat event");
      }
      const created = await res.json();
      setActionEvent(null);
      router.push(`/management/events/${created.id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    if (!actionEvent) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/management/events/${actionEvent.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal menghapus event");
      }
      setActionEvent(null);
      setEvents((prev) => prev.filter((e) => e.id !== actionEvent.id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Nama event wajib diisi");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/management/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          target_count: form.target_count ? parseInt(form.target_count) : null,
          event_date: form.event_date || null,
          event_time: form.event_time || null,
          theme: form.theme || null,
          folder_link: form.folder_link || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal membuat event");
      }
      const created = await res.json();
      setShowModal(false);
      setForm({ name: "", status: "planned", event_date: "", event_time: "", format: "online", theme: "", target_count: "", folder_link: "" });
      router.push(`/management/events/${created.id}`);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F0E8" }}>
      <style>{`
        @media (max-width: 600px) {
          .mc { padding: 20px 16px 48px !important; }
          .msg { gap: 10px !important; }
          .msc { padding: 14px 14px !important; }
          .msv { font-size: 1.5rem !important; }
          .meg { grid-template-columns: 1fr !important; }
          .mwrap { align-items: flex-end !important; padding: 0 !important; }
          .mmi { border-radius: 16px 16px 0 0 !important; max-width: 100% !important; padding: 24px 18px !important; }
          .mfg { grid-template-columns: 1fr !important; }
        }
        .ev-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.11), 0 0 1px rgba(0,0,0,0.05) !important; }
      `}</style>
      {/* Navbar */}
      <header style={{ backgroundColor: "#E8231A", borderBottom: "1px solid rgba(245,240,232,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: 8, padding: "3px 8px", display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Dona Talks" style={{ height: 30, width: "auto", display: "block" }} />
            </div>
          </Link>
          <button
            onClick={async () => { await fetch("/api/management/auth", { method: "DELETE" }); window.location.href = "/management/login"; }}
            style={{ background: "none", border: "1px solid rgba(245,240,232,0.2)", borderRadius: 6, padding: "4px 12px", color: "rgba(245,240,232,0.5)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="mc" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#E8231A", marginBottom: 5, letterSpacing: "-0.02em" }}>Dashboard</h1>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Kelola semua event DonaTalks</p>
        </div>

        {/* Stats row */}
        {!loading && !error && (
          <div className="msg" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total Event", value: events.length },
              { label: "Task Selesai", value: doneTasks },
              { label: "Belum Selesai", value: pendingTasks },
            ].map((stat) => (
              <div key={stat.label} className="msc" style={{ backgroundColor: "#fff", borderRadius: 16, padding: "22px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(232,35,26,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#E8231A" }} />
                </div>
                <div className="msv" style={{ fontSize: "2rem", fontWeight: 800, color: "#E8231A", lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: 6, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Events header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a1a1a" }}>Semua Event</h2>
            <p style={{ fontSize: "0.73rem", color: "#9ca3af", marginTop: 2 }}>Tahan kartu untuk hapus atau duplikat</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: "#E8231A", color: "#F5F0E8", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
          >
            + Tambah Event
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Spinner />
          </div>
        ) : error ? (
          <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 8, fontSize: "0.88rem" }}>
            {error}
            <button onClick={fetchEvents} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", color: "#991b1b", cursor: "pointer" }}>Coba lagi</button>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(232,35,26,0.4)", fontSize: "0.9rem" }}>
            Belum ada event. Buat event pertama!
          </div>
        ) : (
          <div className="meg" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {events.map((event) => {
              const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.planned;
              const taskPct = event.task_stats.total > 0
                ? Math.round((event.task_stats.done / event.task_stats.total) * 100)
                : 0;
              const isPressed = pressing === event.id;
              return (
                <div
                  key={event.id}
                  className="ev-card"
                  onClick={() => handleCardClick(event)}
                  onMouseDown={() => startPress(event)}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={() => startPress(event)}
                  onTouchEnd={cancelPress}
                  onTouchCancel={cancelPress}
                  onContextMenu={(e) => { e.preventDefault(); setActionEvent(event); }}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    padding: "22px",
                    cursor: "pointer",
                    transition: "box-shadow 0.2s, transform 0.15s",
                    transform: isPressed ? "scale(0.98)" : "scale(1)",
                    opacity: isPressed ? 0.8 : 1,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    boxShadow: isPressed ? "0 1px 4px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a1a", flex: 1, marginRight: 10, lineHeight: 1.3 }}>{event.name}</h3>
                    <span style={{ ...statusStyle, fontSize: "0.72rem", fontWeight: 600, padding: "3px 8px", borderRadius: 5, whiteSpace: "nowrap" }}>
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </div>

                  {event.theme && (
                    <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: 8 }}>
                      {event.theme}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                    {event.event_date && (
                      <span style={{ fontSize: "0.76rem", color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: "0.7rem" }}>📅</span>
                        {new Date(event.event_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    <span style={{ fontSize: "0.72rem", color: "#9ca3af", backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: 4, textTransform: "capitalize" }}>
                      {event.format}
                    </span>
                  </div>

                  {/* Task progress */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", color: "#9ca3af", marginBottom: 5 }}>
                      <span>Jobdesk</span>
                      <span style={{ fontWeight: 600, color: taskPct === 100 ? "#059669" : "#6b7280" }}>{event.task_stats.done}/{event.task_stats.total}</span>
                    </div>
                    <div style={{ height: 5, backgroundColor: "#f3f4f6", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${taskPct}%`, backgroundColor: taskPct === 100 ? "#059669" : "#E8231A", borderRadius: 3, transition: "width 0.3s" }} />
                    </div>
                  </div>

                  {event.target_count && (
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      Target: <strong style={{ color: "#E8231A", fontWeight: 700 }}>{event.target_count}</strong> peserta
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action sheet — long press */}
      {actionEvent && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => { if (!duplicating && !deleting) setActionEvent(null); }}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, padding: "20px 20px 32px", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, backgroundColor: "rgba(232,35,26,0.15)", borderRadius: 2, margin: "0 auto 20px" }} />
            <p style={{ fontSize: "0.78rem", color: "rgba(232,35,26,0.45)", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Event</p>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#E8231A", marginBottom: 20 }}>{actionEvent.name}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleDuplicate}
                disabled={duplicating || deleting}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: "#F5F0E8", border: "none", borderRadius: 10, cursor: duplicating ? "not-allowed" : "pointer", opacity: duplicating ? 0.6 : 1 }}
              >
                <span style={{ fontSize: "1.2rem" }}>⧉</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#E8231A" }}>
                  {duplicating ? "Menduplikat..." : "Duplikat Event"}
                </span>
                {duplicating && <span style={{ marginLeft: "auto" }}><Spinner small /></span>}
              </button>

              <button
                onClick={handleDelete}
                disabled={duplicating || deleting}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: "#fee2e2", border: "none", borderRadius: 10, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}
              >
                <span style={{ fontSize: "1.2rem" }}>🗑</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#991b1b" }}>
                  {deleting ? "Menghapus..." : "Hapus Event"}
                </span>
                {deleting && <span style={{ marginLeft: "auto" }}><Spinner small /></span>}
              </button>

              <button
                onClick={() => setActionEvent(null)}
                disabled={duplicating || deleting}
                style={{ padding: "13px 16px", backgroundColor: "transparent", border: "1px solid rgba(232,35,26,0.2)", borderRadius: 10, cursor: "pointer", fontSize: "0.9rem", color: "rgba(232,35,26,0.6)", fontWeight: 500 }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showModal && (
        <div
          className="mwrap" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setFormError(null); } }}
        >
          <div className="mmi" style={{ backgroundColor: "#fff", borderRadius: 12, padding: "32px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#E8231A", marginBottom: 20 }}>Tambah Event</h2>

            {formError && (
              <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 7, fontSize: "0.83rem", marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nama Event *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="cth. DonaTalks Vol. 5"
                  style={inputStyle}
                />
              </div>

              <div className="mfg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    <option value="planned">Planned</option>
                    <option value="on_progress">On Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Format</label>
                  <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} style={inputStyle}>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div className="mfg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Tanggal</label>
                  <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Waktu</label>
                  <input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tema</label>
                <input
                  type="text"
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  placeholder="Tema event"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Target Peserta</label>
                <input
                  type="number"
                  value={form.target_count}
                  onChange={(e) => setForm({ ...form, target_count: e.target.value })}
                  placeholder="cth. 100"
                  min="0"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Link Folder Drive</label>
                <input
                  type="url"
                  value={form.folder_link}
                  onChange={(e) => setForm({ ...form, folder_link: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null); }}
                  style={{ flex: 1, padding: "10px", border: "1px solid rgba(232,35,26,0.3)", borderRadius: 7, backgroundColor: "transparent", color: "#E8231A", fontSize: "0.88rem", cursor: "pointer", fontWeight: 500 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ flex: 1, padding: "10px", border: "none", borderRadius: 7, backgroundColor: "#E8231A", color: "#F5F0E8", fontSize: "0.88rem", cursor: creating ? "not-allowed" : "pointer", fontWeight: 600, opacity: creating ? 0.7 : 1 }}
                >
                  {creating ? "Membuat..." : "Buat Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#E8231A",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid rgba(232,35,26,0.25)",
  borderRadius: 7,
  fontSize: "0.88rem",
  color: "#E8231A",
  backgroundColor: "#fff",
  outline: "none",
  boxSizing: "border-box",
};
