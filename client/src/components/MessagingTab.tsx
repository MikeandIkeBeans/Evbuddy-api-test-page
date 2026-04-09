import React, { useState, useEffect, useCallback } from "react";
import styles from "../styles";
import { apiCall } from "../utils/api";
import type {
  Thread,
  Message,
  Participant,
  Attachment,
  StatusEvent,
  MessageTemplate,
} from "../types";
import { Button, Chip, Panel, SectionHeader, StatusPill } from "./primitives";

/* ── local type helpers ────────────────────────────────────────────────── */

/** Shape returned by most list endpoints after parsing. */
type ApiData = Record<string, unknown>;

interface PaginationInfo {
  page: number;
  totalPages?: number;
  [key: string]: unknown;
}

interface ThreadFilters {
  threadType: string;
  status: string;
  priority: string;
}

/* ── helpers ────────────────────────────────────────────────────────────── */

const THREAD_TYPES = ["REQUEST", "APPROVAL", "SUPPORT", "GENERAL"];
const STATUSES = ["OPEN", "PENDING", "APPROVED", "REJECTED", "CLOSED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const ENTITY_TYPES = ["HOST_SITE", "CHARGER", "BOOKING", "DRIVER", "OTHER"];
const MSG_TYPES = ["TEXT", "SYSTEM", "ACTION", "TEMPLATE"];
const TEMPLATE_CATEGORIES = ["SUPPORT", "APPROVAL", "REQUEST", "GENERAL"];

const priorityColor: Record<string, string> = {
  LOW: "var(--text-muted)",
  NORMAL: "var(--accent-primary)",
  HIGH: "var(--semantic-warning)",
  URGENT: "var(--semantic-error)",
};

const statusColor: Record<string, string> = {
  OPEN: "var(--accent-primary)",
  PENDING: "var(--semantic-warning)",
  APPROVED: "var(--semantic-success)",
  REJECTED: "var(--semantic-error)",
  CLOSED: "var(--text-muted)",
};

function Badge({ label, colorMap }: { label: string; colorMap: Record<string, string> }) {
  const color = colorMap?.[label] || "var(--text-muted)";
  return (
    <span
      style={{
        ...styles.badge,
        background: `${color}22`,
        color,
        textTransform: "capitalize",
      }}
    >
      {label}
    </span>
  );
}

function timeAgo(iso: string | undefined | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const filtered = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  return filtered.length ? "?" + new URLSearchParams(filtered as [string, string][]).toString() : "";
}

/* ── tiny sub-components ────────────────────────────────────────────────── */

function Spinner() {
  return <span style={{ color: "var(--text-muted)" }}>Loading…</span>;
}

function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      style={{
        padding: 12,
        background: "var(--semantic-error-soft)",
        border: "1px solid var(--semantic-error-line)",
        borderRadius: 8,
        color: "var(--semantic-error)",
        fontSize: 13,
        marginBottom: 12,
      }}
    >
      {message}
    </div>
  );
}

function EmptyState({ text }: { text?: string }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
      {text || "Nothing here yet."}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select style={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder || "All"}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/* ── Thread list panel ──────────────────────────────────────────────────── */

function ThreadList({
  threads,
  loading,
  selectedId,
  onSelect,
  onRefresh,
  filters,
  setFilters,
  pagination,
  onPage,
}: {
  threads: Thread[];
  loading: boolean;
  selectedId: number | undefined;
  onSelect: (t: Thread) => void;
  onRefresh: () => void;
  filters: ThreadFilters;
  setFilters: React.Dispatch<React.SetStateAction<ThreadFilters>>;
  pagination: PaginationInfo | null;
  onPage: (page: number) => void;
}) {
  return (
    <Panel style={{ ...styles.card, flex: "0 0 400px", overflow: "auto", maxHeight: "80vh" }}>
      <SectionHeader icon="💬" title="Threads" action={<Button variant="secondary" style={styles.buttonSecondary} onClick={onRefresh}>Refresh</Button>} />

      {/* Filters */}
      <div style={{ ...styles.row, marginBottom: 8, flexWrap: "wrap" }}>
        <Field label="Type">
          <Select
            value={filters.threadType}
            onChange={(v) => setFilters((f) => ({ ...f, threadType: v }))}
            options={THREAD_TYPES}
          />
        </Field>
        <Field label="Status">
          <Select
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={STATUSES}
          />
        </Field>
        <Field label="Priority">
          <Select
            value={filters.priority}
            onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
            options={PRIORITIES}
          />
        </Field>
      </div>

      {loading ? (
        <Spinner />
      ) : threads.length === 0 ? (
        <EmptyState text="No threads found." />
      ) : (
        <>
          {threads.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelect(t)}
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                marginBottom: 6,
                cursor: "pointer",
                ...(selectedId === t.id ? styles.chipSelected : styles.chipUnselected),
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                  {t.subject || `Thread #${t.id}`}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(t.lastMessageAt || t.createdAt)}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge label={t.threadType} colorMap={{ REQUEST: "var(--semantic-info)", APPROVAL: "var(--semantic-warning)", SUPPORT: "var(--semantic-error)", GENERAL: "var(--text-muted)" }} />
                <Badge label={t.status} colorMap={statusColor} />
                <Badge label={t.priority} colorMap={priorityColor} />
              </div>
              {t.relatedEntityType && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {t.relatedEntityType} #{t.relatedEntityId}
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {pagination && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <button
                style={styles.buttonSecondary}
                disabled={pagination.page <= 1}
                onClick={() => onPage(pagination.page - 1)}
              >
                ← Prev
              </button>
              <span style={{ alignSelf: "center", fontSize: 12, color: "var(--text-muted)" }}>
                Page {pagination.page} of {pagination.totalPages || "?"}
              </span>
              <button
                style={styles.buttonSecondary}
                disabled={pagination.page >= (pagination.totalPages || 1)}
                onClick={() => onPage(pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/* ── Create Thread form ─────────────────────────────────────────────────── */

function CreateThreadForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    threadType: "GENERAL",
    subject: "",
    status: "OPEN",
    priority: "NORMAL",
    relatedEntityType: "",
    relatedEntityId: "",
    assignedToAccountId: "",
    createdByAccountId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement> | string) =>
    setForm((f) => ({ ...f, [key]: typeof e === "string" ? e : e.target.value }));

  const submit = async () => {
    if (!form.createdByAccountId) {
      setError("Creator account ID is required");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      threadType: form.threadType,
      subject: form.subject || undefined,
      status: form.status,
      priority: form.priority,
      createdByAccountId: Number(form.createdByAccountId),
      relatedEntityType: form.relatedEntityType || undefined,
      relatedEntityId: form.relatedEntityId ? Number(form.relatedEntityId) : undefined,
      assignedToAccountId: form.assignedToAccountId ? Number(form.assignedToAccountId) : undefined,
    };
    const res = await apiCall("POST", "/api/messaging/threads", body);
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setForm({
        threadType: "GENERAL", subject: "", status: "OPEN", priority: "NORMAL",
        relatedEntityType: "", relatedEntityId: "", assignedToAccountId: "", createdByAccountId: form.createdByAccountId,
      });
      onCreated();
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || (d?.message as string) || `Error ${res.status}`);
    }
  };

  if (!open)
    return (
      <Button variant="primary" style={{ ...styles.button, marginBottom: 12, width: "100%" }} onClick={() => setOpen(true)}>
        + New Thread
      </Button>
    );

  return (
    <div style={{ ...styles.card, border: "1px solid var(--line-strong)", marginBottom: 12 }}>
      <div style={styles.cardTitle}>New Thread</div>
      <ErrorBox message={error} />

      <div style={styles.row}>
        <Field label="Type">
          <Select value={form.threadType} onChange={set("threadType")} options={THREAD_TYPES} placeholder="Select" />
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={set("priority")} options={PRIORITIES} placeholder="Select" />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={set("status")} options={STATUSES} placeholder="Select" />
        </Field>
      </div>

      <Field label="Subject">
        <input style={styles.input} value={form.subject} onChange={set("subject")} placeholder="Thread subject" />
      </Field>

      <div style={styles.row}>
        <Field label="Creator Account ID *">
          <input style={styles.input} type="number" value={form.createdByAccountId} onChange={set("createdByAccountId")} placeholder="e.g. 1" />
        </Field>
        <Field label="Assigned To Account ID">
          <input style={styles.input} type="number" value={form.assignedToAccountId} onChange={set("assignedToAccountId")} placeholder="Optional" />
        </Field>
      </div>

      <div style={styles.row}>
        <Field label="Related Entity Type">
          <Select value={form.relatedEntityType} onChange={set("relatedEntityType")} options={ENTITY_TYPES} placeholder="None" />
        </Field>
        <Field label="Related Entity ID">
          <input style={styles.input} type="number" value={form.relatedEntityId} onChange={set("relatedEntityId")} placeholder="Optional" />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button style={styles.button} onClick={submit} disabled={saving}>
          {saving ? "Creating…" : "Create Thread"}
        </button>
        <button style={styles.buttonSecondary} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Thread detail (edit / delete) ──────────────────────────────────────── */

function ThreadDetail({
  thread,
  onUpdated,
  onDeleted,
}: {
  thread: Thread;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{
    subject?: string;
    priority?: string;
    status?: string;
    assignedToAccountId?: string | number;
  }>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setError(null);
  }, [thread?.id]);

  const startEdit = () => {
    setForm({
      subject: thread.subject || "",
      priority: thread.priority || "NORMAL",
      status: thread.status || "OPEN",
      assignedToAccountId: thread.assignedToAccountId || "",
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const body = {
      subject: form.subject || undefined,
      priority: form.priority || undefined,
      status: form.status || undefined,
      assignedToAccountId: form.assignedToAccountId ? Number(form.assignedToAccountId) : undefined,
    };
    const res = await apiCall("PATCH", `/api/messaging/threads/${thread.id}`, body);
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      onUpdated();
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || `Error ${res.status}`);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete thread #${thread.id}?`)) return;
    const res = await apiCall("DELETE", `/api/messaging/threads/${thread.id}`);
    if (res.ok) onDeleted();
    else {
      const d = res.data as ApiData;
      setError((d?.error as string) || `Error ${res.status}`);
    }
  };

  return (
    <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--surface-panel)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
      <ErrorBox message={error} />
      {editing ? (
        <>
          <Field label="Subject">
            <input style={styles.input} value={form.subject ?? ""} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          </Field>
          <div style={styles.row}>
            <Field label="Status">
              <Select value={form.status ?? ""} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={STATUSES} placeholder="—" />
            </Field>
            <Field label="Priority">
              <Select value={form.priority ?? ""} onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={PRIORITIES} placeholder="—" />
            </Field>
            <Field label="Assignee ID">
              <input style={styles.input} type="number" value={form.assignedToAccountId ?? ""} onChange={(e) => setForm((f) => ({ ...f, assignedToAccountId: e.target.value }))} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.button} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button style={styles.buttonSecondary} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>{thread.subject || `Thread #${thread.id}`}</span>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Created {formatDate(thread.createdAt)} · by account #{thread.createdByAccountId}
              {thread.assignedToAccountId ? ` · assigned → #${thread.assignedToAccountId}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Badge label={thread.status} colorMap={statusColor} />
            <Badge label={thread.priority} colorMap={priorityColor} />
            <Button variant="secondary" style={styles.buttonSecondary} onClick={startEdit}>Edit</Button>
            <Button variant="destructive" style={{ ...styles.buttonSecondary, ...styles.buttonDanger }} onClick={remove}>Delete</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Messages list + compose ────────────────────────────────────────────── */

function MessagesPanel({ threadId }: { threadId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // compose
  const [body, setBody] = useState("");
  const [msgType, setMsgType] = useState("TEXT");
  const [senderAccountId, setSenderAccountId] = useState("");
  const [sending, setSending] = useState(false);

  // edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = qs({ messageType: filterType, page, pageSize: 20 });
    const res = await apiCall("GET", `/api/messaging/threads/${threadId}/messages${params}`);
    setLoading(false);
    if (res.ok) {
      const d = res.data as ApiData;
      setMessages((d.data || d.content || (Array.isArray(d) ? d : [])) as Message[]);
      setPagination((d.pagination || d.meta || null) as PaginationInfo | null);
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || `Error ${res.status}`);
    }
  }, [threadId, filterType, page]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const send = async () => {
    if (!body.trim() || !senderAccountId) return;
    setSending(true);
    const payload = {
      senderAccountId: Number(senderAccountId),
      messageType: msgType,
      body: body.trim(),
    };
    const res = await apiCall("POST", `/api/messaging/threads/${threadId}/messages`, payload);
    setSending(false);
    if (res.ok) {
      setBody("");
      fetchMessages();
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || `Error ${res.status}`);
    }
  };

  const updateMsg = async (msgId: number) => {
    const res = await apiCall("PATCH", `/api/messaging/threads/${threadId}/messages/${msgId}`, { body: editBody });
    if (res.ok) {
      setEditingId(null);
      fetchMessages();
    }
  };

  const deleteMsg = async (msgId: number) => {
    if (!window.confirm("Delete this message?")) return;
    const res = await apiCall("DELETE", `/api/messaging/threads/${threadId}/messages/${msgId}`);
    if (res.ok) fetchMessages();
  };

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardTitle, justifyContent: "space-between" }}>
        <span>💬 Messages</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Select value={filterType} onChange={setFilterType} options={MSG_TYPES} placeholder="All types" />
          <button style={styles.buttonSecondary} onClick={fetchMessages}>↻</button>
        </div>
      </div>

      <ErrorBox message={error} />

      {/* Message list */}
      <div style={{ maxHeight: 400, overflow: "auto", marginBottom: 16 }}>
        {loading ? (
          <Spinner />
        ) : messages.length === 0 ? (
          <EmptyState text="No messages yet." />
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 6,
                background: m.messageType === "SYSTEM" ? "var(--semantic-info-soft)" : "var(--surface-panel)",
                border: "1px solid var(--line-soft)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--accent-primary)", fontWeight: 600 }}>
                  Account #{m.senderAccountId}
                  <Badge
                    label={m.messageType}
                    colorMap={{ TEXT: "var(--accent-primary)", SYSTEM: "var(--semantic-warning)", ACTION: "var(--semantic-info)", TEMPLATE: "var(--text-muted)" }}
                  />
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(m.createdAt)}</span>
              </div>

              {editingId === m.id ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={{ ...styles.input, flex: 1, marginBottom: 0 }}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                  <button style={styles.button} onClick={() => updateMsg(m.id)}>Save</button>
                  <button style={styles.buttonSecondary} onClick={() => setEditingId(null)}>✕</button>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{m.body}</div>
              )}

              {/* Attachments inline */}
              <AttachmentList threadId={threadId} messageId={m.id} />

              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button
                  style={{ ...styles.buttonSecondary, fontSize: 11, padding: "3px 8px" }}
                  onClick={() => {
                    setEditingId(m.id);
                    setEditBody(m.body || "");
                  }}
                >
                  Edit
                </button>
                <button
                  style={{ ...styles.buttonDanger, fontSize: 11, padding: "3px 8px" }}
                  onClick={() => deleteMsg(m.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <button style={styles.buttonSecondary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span style={{ alignSelf: "center", fontSize: 12, color: "var(--text-muted)" }}>
            Page {page}{pagination.totalPages ? ` of ${pagination.totalPages}` : ""}
          </span>
          <button style={styles.buttonSecondary} disabled={page >= (pagination.totalPages || 999)} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}

      {/* Compose */}
      <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
        <div style={styles.row}>
          <Field label="Sender Account ID">
            <input style={styles.input} type="number" value={senderAccountId} onChange={(e) => setSenderAccountId(e.target.value)} placeholder="e.g. 1" />
          </Field>
          <Field label="Type">
            <Select value={msgType} onChange={setMsgType} options={MSG_TYPES} placeholder="TEXT" />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message…"
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button style={styles.button} onClick={send} disabled={sending}>
            {sending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Attachments (inline in message) ────────────────────────────────────── */

function AttachmentList({ threadId, messageId }: { threadId: number; messageId: number }) {
  const [items, setItems] = useState<Attachment[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fileName: "", contentType: "", fileSizeBytes: "", storageKey: "" });
  const [expanded, setExpanded] = useState(false);

  const fetch_ = async () => {
    const res = await apiCall("GET", `/api/messaging/threads/${threadId}/messages/${messageId}/attachments`);
    if (res.ok) {
      const d = res.data as ApiData;
      setItems((d.data || d.content || (Array.isArray(d) ? d : Object.values(d).flat())) as Attachment[]);
    }
  };

  const add = async () => {
    const payload = {
      fileName: form.fileName,
      contentType: form.contentType || "application/octet-stream",
      fileSizeBytes: form.fileSizeBytes ? Number(form.fileSizeBytes) : 0,
      storageKey: form.storageKey,
    };
    const res = await apiCall("POST", `/api/messaging/threads/${threadId}/messages/${messageId}/attachments`, payload);
    if (res.ok) {
      setShowAdd(false);
      setForm({ fileName: "", contentType: "", fileSizeBytes: "", storageKey: "" });
      fetch_();
    }
  };

  const remove = async (aId: number) => {
    if (!window.confirm("Delete attachment?")) return;
    await apiCall("DELETE", `/api/messaging/threads/${threadId}/messages/${messageId}/attachments/${aId}`);
    fetch_();
  };

  if (items === null) {
    return (
      <button
        style={{ fontSize: 11, color: "var(--semantic-info)", background: "none", border: "none", cursor: "pointer", padding: "2px 0", marginTop: 4 }}
        onClick={fetch_}
      >
        📎 Load attachments
      </button>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{ fontSize: 11, color: "var(--semantic-info)", cursor: "pointer", marginBottom: 4 }}
        onClick={() => setExpanded((e) => !e)}
      >
        📎 {items.length} attachment{items.length !== 1 ? "s" : ""} {expanded ? "▾" : "▸"}
      </div>
      {expanded && (
        <>
          {items.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "4px 8px", background: "var(--surface-elevated)", borderRadius: 4, marginBottom: 2, fontSize: 12,
              }}
            >
              <span>
                {a.fileName || "file"}{" "}
                <span style={{ color: "var(--text-muted)" }}>({a.contentType}, {a.fileSizeBytes ?? a.sizeBytes}B)</span>
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {(a.storageUrl || a.downloadUrl) && (
                  <a href={a.storageUrl || a.downloadUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)", fontSize: 11 }}>
                    ↓
                  </a>
                )}
                <button style={{ ...styles.buttonDanger, fontSize: 11, padding: "2px 8px" }} onClick={() => remove(a.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
          {showAdd ? (
            <div style={{ background: "var(--surface-elevated)", padding: 8, borderRadius: 6, marginTop: 4 }}>
              <input style={{ ...styles.input, fontSize: 12 }} value={form.fileName} onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.value }))} placeholder="File name" />
              <input style={{ ...styles.input, fontSize: 12 }} value={form.contentType} onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value }))} placeholder="Content type" />
              <input style={{ ...styles.input, fontSize: 12 }} value={form.storageKey} onChange={(e) => setForm((f) => ({ ...f, storageKey: e.target.value }))} placeholder="Storage key" />
              <input style={{ ...styles.input, fontSize: 12 }} type="number" value={form.fileSizeBytes} onChange={(e) => setForm((f) => ({ ...f, fileSizeBytes: e.target.value }))} placeholder="Size (bytes)" />
              <div style={{ display: "flex", gap: 4 }}>
                <button style={{ ...styles.button, fontSize: 11, padding: "4px 10px" }} onClick={add}>Add</button>
                <button style={{ ...styles.buttonSecondary, fontSize: 11, padding: "4px 10px" }} onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button style={{ ...styles.buttonSecondary, fontSize: 11, padding: "3px 8px", marginTop: 2 }} onClick={() => setShowAdd(true)}>
              + Attachment
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ── Participants panel ─────────────────────────────────────────────────── */

function ParticipantsPanel({ threadId }: { threadId: number }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ accountId: "", role: "MEMBER" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    role?: string;
    muted?: boolean;
    canPost?: boolean;
  }>({});

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiCall("GET", `/api/messaging/threads/${threadId}/participants`);
    setLoading(false);
    if (res.ok) {
      const d = res.data as ApiData;
      setParticipants((d.data || d.content || (Array.isArray(d) ? d : Object.values(d).flat())) as Participant[]);
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || `Error ${res.status}`);
    }
  }, [threadId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const addParticipant = async () => {
    if (!addForm.accountId) return;
    const res = await apiCall("POST", `/api/messaging/threads/${threadId}/participants`, {
      accountId: Number(addForm.accountId),
      role: addForm.role || "MEMBER",
    });
    if (res.ok) {
      setShowAdd(false);
      setAddForm({ accountId: "", role: "MEMBER" });
      fetchParticipants();
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || `Error ${res.status}`);
    }
  };

  const updateParticipant = async (accountId: number) => {
    const res = await apiCall("PATCH", `/api/messaging/threads/${threadId}/participants/${accountId}`, editForm);
    if (res.ok) {
      setEditId(null);
      fetchParticipants();
    }
  };

  const removeParticipant = async (accountId: number) => {
    if (!window.confirm(`Remove account #${accountId}?`)) return;
    const res = await apiCall("DELETE", `/api/messaging/threads/${threadId}/participants/${accountId}`);
    if (res.ok) fetchParticipants();
  };

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardTitle, justifyContent: "space-between" }}>
        <span>👥 Participants</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={styles.buttonSecondary} onClick={fetchParticipants}>↻</button>
          <button style={styles.buttonSecondary} onClick={() => setShowAdd((s) => !s)}>+ Add</button>
        </div>
      </div>
      <ErrorBox message={error} />

      {showAdd && (
        <div style={{ background: "var(--surface-elevated)", padding: 10, borderRadius: 6, marginBottom: 10 }}>
          <div style={styles.row}>
            <Field label="Account ID">
              <input style={styles.input} type="number" value={addForm.accountId} onChange={(e) => setAddForm((f) => ({ ...f, accountId: e.target.value }))} placeholder="e.g. 1" />
            </Field>
            <Field label="Role">
              <Select value={addForm.role} onChange={(v) => setAddForm((f) => ({ ...f, role: v }))} options={["OWNER", "ADMIN", "MEMBER", "OBSERVER"]} placeholder="MEMBER" />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={styles.button} onClick={addParticipant}>Add</button>
            <button style={styles.buttonSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : participants.length === 0 ? (
        <EmptyState text="No participants." />
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Account</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Muted</th>
              <th style={styles.th}>Can Post</th>
              <th style={styles.th}>Joined</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => {
              const acctId = p.accountId || p.account_id;
              return (
                <tr key={acctId}>
                  <td style={styles.td}>#{acctId}</td>
                  <td style={styles.td}>
                    {editId === acctId ? (
                      <Select value={editForm.role || p.role} onChange={(v) => setEditForm((f) => ({ ...f, role: v }))} options={["OWNER", "ADMIN", "MEMBER", "OBSERVER"]} placeholder="—" />
                    ) : (
                      <Badge label={p.role || "—"} colorMap={{ OWNER: "var(--semantic-error)", ADMIN: "var(--semantic-warning)", MEMBER: "var(--accent-primary)", OBSERVER: "var(--text-muted)" }} />
                    )}
                  </td>
                  <td style={styles.td}>{p.muted ? "🔇" : "🔔"}</td>
                  <td style={styles.td}>{p.canPost === false ? "❌" : "✅"}</td>
                  <td style={styles.td}>{timeAgo(p.joinedAt || p.createdAt)}</td>
                  <td style={styles.td}>
                    {editId === acctId ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={{ ...styles.button, fontSize: 11, padding: "3px 8px" }} onClick={() => updateParticipant(acctId!)}>Save</button>
                        <button style={{ ...styles.buttonSecondary, fontSize: 11, padding: "3px 8px" }} onClick={() => setEditId(null)}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          style={{ ...styles.buttonSecondary, fontSize: 11, padding: "3px 8px" }}
                          onClick={() => { setEditId(acctId!); setEditForm({ role: p.role, muted: p.muted, canPost: p.canPost }); }}
                        >
                          Edit
                        </button>
                        <button
                          style={{ ...styles.buttonDanger, fontSize: 11, padding: "3px 8px" }}
                          onClick={() => removeParticipant(acctId!)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Status Events panel ────────────────────────────────────────────────── */

function StatusEventsPanel({ threadId }: { threadId: number }) {
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ toStatus: "OPEN", actorAccountId: "", eventReason: "" });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiCall("GET", `/api/messaging/threads/${threadId}/status-events`);
    setLoading(false);
    if (res.ok) {
      const d = res.data as ApiData;
      setEvents((d.data || d.content || (Array.isArray(d) ? d : [])) as StatusEvent[]);
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || `Error ${res.status}`);
    }
  }, [threadId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async () => {
    if (!form.actorAccountId) return;
    const payload = {
      toStatus: form.toStatus,
      actorAccountId: Number(form.actorAccountId),
      eventReason: form.eventReason || undefined,
    };
    const res = await apiCall("POST", `/api/messaging/threads/${threadId}/status-events`, payload);
    if (res.ok) {
      setShowAdd(false);
      setForm({ toStatus: "OPEN", actorAccountId: form.actorAccountId, eventReason: "" });
      fetchEvents();
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || (d?.message as string) || `Error ${res.status}`);
    }
  };

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardTitle, justifyContent: "space-between" }}>
        <span>📋 Status History</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={styles.buttonSecondary} onClick={fetchEvents}>↻</button>
          <button style={styles.buttonSecondary} onClick={() => setShowAdd((s) => !s)}>+ Transition</button>
        </div>
      </div>
      <ErrorBox message={error} />

      {showAdd && (
        <div style={{ background: "var(--surface-elevated)", padding: 10, borderRadius: 6, marginBottom: 10 }}>
          <div style={styles.row}>
            <Field label="New Status">
              <Select value={form.toStatus} onChange={(v) => setForm((f) => ({ ...f, toStatus: v }))} options={STATUSES} placeholder="Select" />
            </Field>
            <Field label="Account ID *">
              <input style={styles.input} type="number" value={form.actorAccountId} onChange={(e) => setForm((f) => ({ ...f, actorAccountId: e.target.value }))} placeholder="e.g. 1" />
            </Field>
          </div>
          <Field label="Reason">
            <input style={styles.input} value={form.eventReason} onChange={(e) => setForm((f) => ({ ...f, eventReason: e.target.value }))} placeholder="Optional reason" />
          </Field>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={styles.button} onClick={addEvent}>Record Transition</button>
            <button style={styles.buttonSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : events.length === 0 ? (
        <EmptyState text="No status events recorded." />
      ) : (
        <div style={{ maxHeight: 300, overflow: "auto" }}>
          {events.map((ev) => (
            <div
              key={ev.id}
              style={{
                display: "flex", justifyContent: "space-between", padding: "8px 12px",
                background: "var(--surface-panel)", borderRadius: 6, marginBottom: 4, border: "1px solid var(--line-soft)", alignItems: "center",
              }}
            >
              <div>
                <Badge label={ev.fromStatus || "—"} colorMap={statusColor} />
                <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>→</span>
                <Badge label={ev.toStatus} colorMap={statusColor} />
                {ev.eventReason && <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>"{ev.eventReason}"</span>}
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                by #{ev.actorAccountId} · {formatDate(ev.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Templates panel ────────────────────────────────────────────────────── */

function TemplatesPanel() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ templateKey: "", category: "GENERAL", title: "", body: "", isActive: true });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    title?: string;
    body?: string;
    category?: string;
    isActive?: boolean;
  }>({});
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [lookupKey, setLookupKey] = useState("");
  const [lookupResult, setLookupResult] = useState<unknown>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = qs({ category: filterCat, page, pageSize: 20 });
    const res = await apiCall("GET", `/api/messaging/templates${params}`);
    setLoading(false);
    if (res.ok) {
      const d = res.data as ApiData;
      setTemplates((d.data || d.content || (Array.isArray(d) ? d : [])) as MessageTemplate[]);
      setPagination((d.pagination || d.meta || null) as PaginationInfo | null);
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || `Error ${res.status}`);
    }
  }, [filterCat, page]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const create = async () => {
    if (!form.templateKey.trim() || !form.title.trim()) {
      setError("Template key and title are required");
      return;
    }
    const payload = {
      templateKey: form.templateKey.trim(),
      category: form.category,
      title: form.title.trim(),
      body: form.body,
      isActive: form.isActive,
    };
    const res = await apiCall("POST", "/api/messaging/templates", payload);
    if (res.ok) {
      setShowCreate(false);
      setForm({ templateKey: "", category: "GENERAL", title: "", body: "", isActive: true });
      fetchTemplates();
    } else {
      const d = res.data as ApiData;
      const fe = d?.fieldErrors as Array<{ field: string; message: string }> | undefined;
      const msg = fe?.length ? fe.map((e) => `${e.field}: ${e.message}`).join("; ") : (d?.message as string) || (d?.error as string) || `Error ${res.status}`;
      setError(msg);
    }
  };

  const update = async (id: number) => {
    const res = await apiCall("PATCH", `/api/messaging/templates/${id}`, editForm);
    if (res.ok) {
      setEditId(null);
      fetchTemplates();
    } else {
      const d = res.data as ApiData;
      setError((d?.error as string) || `Error ${res.status}`);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete template?")) return;
    const res = await apiCall("DELETE", `/api/messaging/templates/${id}`);
    if (res.ok) fetchTemplates();
  };

  const lookupByKey = async () => {
    if (!lookupKey.trim()) return;
    setLookupResult(null);
    const res = await apiCall("GET", `/api/messaging/templates/key/${encodeURIComponent(lookupKey.trim())}`);
    setLookupResult(res.data);
  };

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardTitle, justifyContent: "space-between" }}>
        <span>📝 Message Templates</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={styles.buttonSecondary} onClick={fetchTemplates}>↻</button>
          <button style={styles.buttonSecondary} onClick={() => setShowCreate((s) => !s)}>+ New</button>
        </div>
      </div>
      <ErrorBox message={error} />

      {/* Key lookup */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input
          style={{ ...styles.input, flex: 1, marginBottom: 0 }}
          value={lookupKey}
          onChange={(e) => setLookupKey(e.target.value)}
          placeholder="Look up by key…"
          onKeyDown={(e) => e.key === "Enter" && lookupByKey()}
        />
        <button style={styles.buttonSecondary} onClick={lookupByKey}>🔍</button>
      </div>
      {lookupResult != null && (
        <div style={{ ...styles.response, marginBottom: 12, maxHeight: 150 }}>
          <pre style={{ margin: 0, color: "var(--text-secondary)" }}>{JSON.stringify(lookupResult, null, 2)}</pre>
        </div>
      )}

      {/* Filter */}
      <div style={{ marginBottom: 12, maxWidth: 200 }}>
        <Field label="Category">
          <Select value={filterCat} onChange={setFilterCat} options={TEMPLATE_CATEGORIES} />
        </Field>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: "var(--surface-elevated)", padding: 12, borderRadius: 6, marginBottom: 12 }}>
          <div style={styles.row}>
            <Field label="Key">
              <input style={styles.input} value={form.templateKey} onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value }))} placeholder="UPPERCASE_WITH_UNDERSCORES" />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={TEMPLATE_CATEGORIES} placeholder="Select" />
            </Field>
          </div>
          <Field label="Title">
            <input style={styles.input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Template title" />
          </Field>
          <Field label="Body">
            <textarea
              style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Template body text…"
            />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.button} onClick={create}>Create</button>
            <button style={styles.buttonSecondary} onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : templates.length === 0 ? (
        <EmptyState text="No templates found." />
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Key</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Active</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td style={styles.td}>{t.id}</td>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12 }}>{t.templateKey || "—"}</td>
                  <td style={styles.td}>
                    <Badge label={t.category || "—"} colorMap={{ SUPPORT: "var(--semantic-error)", APPROVAL: "var(--semantic-warning)", REQUEST: "var(--semantic-info)", GENERAL: "var(--text-muted)" }} />
                  </td>
                  <td style={styles.td}>
                    {editId === t.id ? (
                      <input style={{ ...styles.input, marginBottom: 0 }} value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                    ) : (
                      t.title || "—"
                    )}
                  </td>
                  <td style={styles.td}>{t.isActive !== false ? "✅" : "❌"}</td>
                  <td style={styles.td}>
                    {editId === t.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={{ ...styles.button, fontSize: 11, padding: "3px 8px" }} onClick={() => update(t.id)}>Save</button>
                        <button style={{ ...styles.buttonSecondary, fontSize: 11, padding: "3px 8px" }} onClick={() => setEditId(null)}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          style={{ ...styles.buttonSecondary, fontSize: 11, padding: "3px 8px" }}
                          onClick={() => { setEditId(t.id); setEditForm({ title: t.title, body: t.body, category: t.category, isActive: t.isActive }); }}
                        >
                          Edit
                        </button>
                        <button
                          style={{ ...styles.buttonDanger, fontSize: 11, padding: "3px 8px" }}
                          onClick={() => remove(t.id)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <button style={styles.buttonSecondary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span style={{ alignSelf: "center", fontSize: 12, color: "var(--text-muted)" }}>Page {page}{pagination.totalPages ? ` of ${pagination.totalPages}` : ""}</span>
              <button style={styles.buttonSecondary} disabled={page >= (pagination.totalPages || 999)} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Main tab ───────────────────────────────────────────────────────────── */

const SUB_TABS = [
  { id: "threads", label: "Threads" },
  { id: "templates", label: "Templates" },
];

export default function MessagingTab() {
  const [subTab, setSubTab] = useState("threads");

  // thread state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [filters, setFilters] = useState<ThreadFilters>({ threadType: "", status: "", priority: "" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // detail panel tab
  const [detailTab, setDetailTab] = useState("messages");

  const fetchThreads = useCallback(async () => {
    setThreadsLoading(true);
    setThreadsError(null);
    const params = qs({ ...filters, page, pageSize: 20 });
    const res = await apiCall("GET", `/api/messaging/threads${params}`);
    setThreadsLoading(false);
    if (res.ok) {
      const d = res.data as ApiData;
      setThreads((d.data || d.content || (Array.isArray(d) ? d : [])) as Thread[]);
      setPagination((d.pagination || d.meta || null) as PaginationInfo | null);
    } else {
      const d = res.data as ApiData;
      setThreadsError((d?.error as string) || `Error ${res.status}`);
    }
  }, [filters, page]);

  useEffect(() => {
    if (subTab === "threads") fetchThreads();
  }, [subTab, fetchThreads]);

  const handleSelectThread = (t: Thread) => {
    setSelectedThread(t);
    setDetailTab("messages");
  };

  return (
    <div>
      {/* sub-nav */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {SUB_TABS.map((st) => (
          <Chip
            key={st.id}
            selected={subTab === st.id}
            style={{ ...styles.buttonSecondary }}
            onClick={() => setSubTab(st.id)}
          >
            {st.label}
          </Chip>
        ))}
      </div>

      {subTab === "templates" ? (
        <TemplatesPanel />
      ) : (
        <>
          <ErrorBox message={threadsError} />
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Left: thread list */}
            <div style={{ flex: "0 0 420px" }}>
              <CreateThreadForm onCreated={fetchThreads} />
              <ThreadList
                threads={threads}
                loading={threadsLoading}
                selectedId={selectedThread?.id}
                onSelect={handleSelectThread}
                onRefresh={fetchThreads}
                filters={filters}
                setFilters={setFilters}
                pagination={pagination}
                onPage={setPage}
              />
            </div>

            {/* Right: detail */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {selectedThread ? (
                <>
                  <ThreadDetail
                    thread={selectedThread}
                    onUpdated={() => { fetchThreads(); }}
                    onDeleted={() => { setSelectedThread(null); fetchThreads(); }}
                  />

                  {/* Detail sub-tabs */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    {[
                      { id: "messages", label: "💬 Messages" },
                      { id: "participants", label: "👥 Participants" },
                      { id: "status", label: "📋 Status History" },
                    ].map((dt) => (
                      <Chip
                        key={dt.id}
                        selected={detailTab === dt.id}
                        style={{ ...styles.buttonSecondary }}
                        onClick={() => setDetailTab(dt.id)}
                      >
                        {dt.label}
                      </Chip>
                    ))}
                  </div>

                  {detailTab === "messages" && <MessagesPanel threadId={selectedThread.id} />}
                  {detailTab === "participants" && <ParticipantsPanel threadId={selectedThread.id} />}
                  {detailTab === "status" && <StatusEventsPanel threadId={selectedThread.id} />}
                </>
              ) : (
                <Panel style={{ ...styles.card, textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>Select a thread to view messages</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>Or create a new thread to get started</div>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}




