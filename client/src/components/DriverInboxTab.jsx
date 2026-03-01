import React, { useState, useEffect, useCallback } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";

/* ── Constants & Helpers ───────────────────────────────────────────────── */

const ROLE_TABS = ["Customer", "EV Driver"];
const CATEGORY_TABS = ["Convos", "Requests", "Alerts"];

/** Map wireframe categories → API threadType filters */
const CATEGORY_TO_TYPE = {
  Convos: "GENERAL",
  Requests: "REQUEST",
  Alerts: "APPROVAL",
};

/** Status badge styling keyed on thread status */
const STATUS_DISPLAY = {
  OPEN: { label: "OPEN", bg: "#00d4aa22", color: "#00d4aa", border: "#00d4aa55" },
  PENDING: { label: "LIVE", bg: "#ffa50022", color: "#ffa500", border: "#ffa50055" },
  APPROVED: { label: "DONE", bg: "#88888822", color: "#999", border: "#88888855" },
  REJECTED: { label: "CLOSED", bg: "#ff475722", color: "#ff4757", border: "#ff475755" },
  CLOSED: { label: "DONE", bg: "#88888822", color: "#999", border: "#88888855" },
};

/** Pretty thread title – uses subject or builds from threadType + relatedEntityType */
function threadTitle(t) {
  if (t.subject) return t.subject;
  const typeLabels = {
    REQUEST: "Request",
    APPROVAL: "Host",
    SUPPORT: "Support",
    GENERAL: "Conversation",
  };
  const label = typeLabels[t.threadType] || "Thread";
  if (t.relatedEntityType) {
    const entity = t.relatedEntityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${label} – ${entity}`;
  }
  return `${label} #${t.id}`;
}

/** Human-friendly relative time */
function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/** Build snippet text from the thread's last message or metadata */
function threadSnippet(t, lastMsg) {
  if (lastMsg?.body) return lastMsg.body;
  if (t.relatedEntityType === "CHARGER" && t.status === "APPROVED")
    return "Approved access";
  if (t.relatedEntityType === "BOOKING") return "Booking update";
  return t.threadType === "SUPPORT"
    ? `Ticket #${t.id} • ${t.status}`
    : "";
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
      Loading…
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: "center", padding: 48, color: "#666" }}>
      {text || "No messages yet."}
    </div>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        padding: 12,
        background: "#ff475715",
        border: "1px solid #ff475744",
        borderRadius: 8,
        color: "#ff4757",
        fontSize: 13,
        marginBottom: 12,
      }}
    >
      {message}
    </div>
  );
}

/* ── Status badge (LIVE / OPEN / DONE) ─────────────────────────────────── */

function StatusBadge({ status }) {
  const s = STATUS_DISPLAY[status] || STATUS_DISPLAY.OPEN;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 12px",
        borderRadius: 14,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

/* ── Pill toggle (role / category tabs) ────────────────────────────────── */

function PillGroup({ items, active, onChange, style: outerStyle }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid #333",
        ...outerStyle,
      }}
    >
      {items.map((item) => {
        const isActive = item === active;
        return (
          <button
            key={item}
            onClick={() => onChange(item)}
            style={{
              flex: 1,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              background: isActive
                ? "linear-gradient(135deg, #00d4aa, #00a8e8)"
                : "#1a1a1a",
              color: isActive ? "#000" : "#888",
              borderRight: "1px solid #333",
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

/* ── Thread card ───────────────────────────────────────────────────────── */

function ThreadCard({ thread, lastMessage, onClick }) {
  const title = threadTitle(thread);
  const snippet = threadSnippet(thread, lastMessage);
  const time = timeAgo(thread.lastMessageAt || thread.updatedAt || thread.createdAt);

  return (
    <div
      onClick={onClick}
      style={{
        background: "#111",
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#00d4aa44";
        e.currentTarget.style.background = "#161616";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#2a2a2a";
        e.currentTarget.style.background = "#111";
      }}
    >
      {/* Row 1: title + time */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: "#fff", flex: 1 }}>
          {title}
        </span>
        <span style={{ fontSize: 12, color: "#666", whiteSpace: "nowrap", marginLeft: 12 }}>
          {time}
        </span>
      </div>

      {/* Row 2: snippet + badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "#999",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginRight: 12,
          }}
        >
          {snippet}
        </span>
        <StatusBadge status={thread.status} />
      </div>
    </div>
  );
}

/* ── Thread detail / conversation view ─────────────────────────────────── */

function ThreadDetailView({ thread, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [senderAccountId] = useState("1"); // would come from auth context

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const res = await apiCall(
      "GET",
      `/api/messaging/threads/${thread.id}/messages`
    );
    setLoading(false);
    if (res.ok) {
      const d = res.data;
      setMessages(d.data || d.content || (Array.isArray(d) ? d : []));
    } else {
      setError(res.data?.error || `Error ${res.status}`);
    }
  }, [thread.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    const res = await apiCall(
      "POST",
      `/api/messaging/threads/${thread.id}/messages`,
      {
        senderAccountId: Number(senderAccountId),
        messageType: "TEXT",
        body: body.trim(),
      }
    );
    setSending(false);
    if (res.ok) {
      setBody("");
      fetchMessages();
    } else {
      setError(res.data?.error || "Send failed");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 14,
          borderBottom: "1px solid #222",
          marginBottom: 14,
        }}
      >
        <button
          onClick={onBack}
          style={{
            ...styles.buttonSecondary,
            fontSize: 16,
            padding: "6px 12px",
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>
            {threadTitle(thread)}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {thread.threadType} · {thread.status}
            {thread.priority !== "NORMAL" && ` · ${thread.priority}`}
          </div>
        </div>
        <StatusBadge status={thread.status} />
      </div>

      <ErrorBox message={error} />

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          marginBottom: 14,
          minHeight: 200,
          maxHeight: 420,
        }}
      >
        {loading ? (
          <Spinner />
        ) : messages.length === 0 ? (
          <Empty text="No messages in this thread yet." />
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                marginBottom: 8,
                background:
                  m.messageType === "SYSTEM" ? "#1a1a2e" : "#1a1a1a",
                border: "1px solid #222",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "#00d4aa" }}
                >
                  Account #{m.senderAccountId}
                </span>
                <span style={{ fontSize: 11, color: "#555" }}>
                  {timeAgo(m.createdAt)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#ddd",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.body}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compose */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderTop: "1px solid #222",
          paddingTop: 12,
        }}
      >
        <input
          style={{ ...styles.input, flex: 1, marginBottom: 0 }}
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          style={{ ...styles.button, whiteSpace: "nowrap" }}
          onClick={send}
          disabled={sending || !body.trim()}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

/* ── Request Mobile Charge dialog ──────────────────────────────────────── */

function RequestMobileChargeForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({
    subject: "Mobile Charge Request",
    location: "",
    notes: "",
    createdByAccountId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!form.createdByAccountId) {
      setError("Your account ID is required");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      threadType: "REQUEST",
      subject: form.subject,
      status: "OPEN",
      priority: "NORMAL",
      createdByAccountId: Number(form.createdByAccountId),
      relatedEntityType: "CHARGER",
    };
    const res = await apiCall("POST", "/api/messaging/threads", body);
    setSaving(false);
    if (res.ok) {
      // Optionally post an initial message with details
      const threadId = res.data?.id || res.data?.data?.id;
      if (threadId && (form.location || form.notes)) {
        const msgBody = [
          form.location && `📍 Location: ${form.location}`,
          form.notes && `📝 ${form.notes}`,
        ]
          .filter(Boolean)
          .join("\n");
        await apiCall("POST", `/api/messaging/threads/${threadId}/messages`, {
          senderAccountId: Number(form.createdByAccountId),
          messageType: "TEXT",
          body: msgBody,
        });
      }
      onCreated();
    } else {
      setError(res.data?.error || res.data?.message || `Error ${res.status}`);
    }
  };

  return (
    <div style={{ ...styles.card, border: "1px solid #00d4aa44" }}>
      <div style={styles.cardTitle}>⚡ Request Mobile Charge</div>
      <ErrorBox message={error} />

      <div style={{ marginBottom: 8 }}>
        <label style={styles.label}>Your Account ID *</label>
        <input
          style={styles.input}
          type="number"
          placeholder="e.g. 1"
          value={form.createdByAccountId}
          onChange={(e) =>
            setForm((f) => ({ ...f, createdByAccountId: e.target.value }))
          }
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={styles.label}>Location / Address</label>
        <input
          style={styles.input}
          placeholder="Where do you need the charger?"
          value={form.location}
          onChange={(e) =>
            setForm((f) => ({ ...f, location: e.target.value }))
          }
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={styles.label}>Notes</label>
        <input
          style={styles.input}
          placeholder="Any special instructions"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button style={styles.button} onClick={submit} disabled={saving}>
          {saving ? "Sending…" : "Submit Request"}
        </button>
        <button style={styles.buttonSecondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Bottom nav bar ────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { id: "inbox", label: "Inbox", icon: "📥" },
  { id: "request", label: "Request", icon: "📋" },
  { id: "home", label: "Home", icon: "🏠" },
  { id: "community", label: "Community", icon: "👥" },
  { id: "account", label: "Account", icon: "👤" },
];

function BottomNav({ active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        borderTop: "1px solid #333",
        paddingTop: 10,
        marginTop: 16,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color: isActive ? "#00d4aa" : "#666",
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              transition: "color 0.15s",
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Component: DriverInboxTab
   ══════════════════════════════════════════════════════════════════════════ */

export default function DriverInboxTab() {
  /* ── state ──────────────────────────────────────────────────────────── */
  const [role, setRole] = useState("EV Driver");
  const [category, setCategory] = useState("Convos");
  const [navTab, setNavTab] = useState("inbox");
  const [threads, setThreads] = useState([]);
  const [lastMessages, setLastMessages] = useState({}); // threadId → msg
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);

  /* ── fetch threads ──────────────────────────────────────────────────── */
  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    const threadType = CATEGORY_TO_TYPE[category] || "";
    const params = new URLSearchParams();
    if (threadType) params.set("threadType", threadType);
    params.set("sort", "lastMessageAt");
    params.set("order", "desc");
    params.set("pageSize", "20");

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await apiCall("GET", `/api/messaging/threads${qs}`);
    setLoading(false);

    if (res.ok) {
      const d = res.data;
      const list = d.data || d.content || (Array.isArray(d) ? d : []);
      setThreads(list);

      // Fetch latest message for each thread (for snippet preview)
      const msgMap = {};
      await Promise.all(
        list.slice(0, 15).map(async (t) => {
          const mRes = await apiCall(
            "GET",
            `/api/messaging/threads/${t.id}/messages?pageSize=1&sort=createdAt&order=desc`
          );
          if (mRes.ok) {
            const msgs =
              mRes.data?.data ||
              mRes.data?.content ||
              (Array.isArray(mRes.data) ? mRes.data : []);
            if (msgs.length) msgMap[t.id] = msgs[0];
          }
        })
      );
      setLastMessages(msgMap);
    } else {
      setError(res.data?.error || `Error ${res.status}`);
    }
  }, [category]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  /* ── event handlers ─────────────────────────────────────────────────── */
  const openThread = (t) => setSelectedThread(t);
  const closeThread = () => {
    setSelectedThread(null);
    fetchThreads(); // refresh list when returning
  };

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        maxWidth: 440,
        margin: "0 auto",
        background: "#0f0f0f",
        borderRadius: 20,
        border: "1px solid #2a2a2a",
        padding: "20px 16px 12px",
        minHeight: 680,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Viewing a thread ─────────────────────────────────────────── */}
      {selectedThread ? (
        <ThreadDetailView thread={selectedThread} onBack={closeThread} />
      ) : (
        <>
          {/* Header */}
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#fff",
              margin: "0 0 14px",
            }}
          >
            Driver Inbox
          </h2>

          {/* Role pills */}
          <PillGroup
            items={ROLE_TABS}
            active={role}
            onChange={setRole}
            style={{ marginBottom: 10 }}
          />

          {/* Category pills */}
          <PillGroup
            items={CATEGORY_TABS}
            active={category}
            onChange={(c) => {
              setCategory(c);
              setShowRequestForm(false);
            }}
            style={{ marginBottom: 14 }}
          />

          {/* Action button */}
          <button
            style={{
              ...styles.button,
              width: "100%",
              textAlign: "center",
              marginBottom: 14,
              fontSize: 14,
              padding: "12px 0",
              borderRadius: 10,
            }}
            onClick={() => setShowRequestForm((v) => !v)}
          >
            + Request Mobile Charge
          </button>

          {/* Request form (collapsible) */}
          {showRequestForm && (
            <RequestMobileChargeForm
              onCreated={() => {
                setShowRequestForm(false);
                fetchThreads();
              }}
              onCancel={() => setShowRequestForm(false)}
            />
          )}

          <ErrorBox message={error} />

          {/* Thread list */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading ? (
              <Spinner />
            ) : threads.length === 0 ? (
              <Empty text={`No ${category.toLowerCase()} found.`} />
            ) : (
              threads.map((t) => (
                <ThreadCard
                  key={t.id}
                  thread={t}
                  lastMessage={lastMessages[t.id]}
                  onClick={() => openThread(t)}
                />
              ))
            )}
          </div>

          {/* Bottom navigation bar */}
          <BottomNav active={navTab} onChange={setNavTab} />
        </>
      )}
    </div>
  );
}
