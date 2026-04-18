import { useState } from "react";
import { useScribe } from "@elevenlabs/react";

// ── Config ────────────────────────────────────────────────────────────────────
// Your backend must expose this endpoint (see server.ts)
const TOKEN_URL = "/scribe-token";

async function fetchToken(): Promise<string> {
  const res = await fetch(TOKEN_URL);
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const data = await res.json();
  return data.token ?? data; // handle {token:"..."} or bare string
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ElevenLabsTranscriber() {
  const [error, setError] = useState<string>("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript:  (d) => { /* state managed by scribe hook */ },
    onCommittedTranscript:(d) => { /* state managed by scribe hook */ },
    onError: (e) => setError(String(e)),
  });

  const handleStart = async () => {
    setError("");
    try {
      const token = await fetchToken();
      await scribe.connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleStop = () => {
    scribe.disconnect();
  };

  const fullText = scribe.committedTranscripts.map((t) => t.text).join(" ");

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoMark}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#EAF0FF" />
            <path d="M8 20V8l4 4 2-6 2 6 4-4v12" stroke="#4060FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 style={styles.title}>Live Transcription</h1>
          <p style={styles.subtitle}>ElevenLabs Scribe v2 Realtime</p>
        </div>
        <StatusBadge connected={scribe.isConnected} />
      </header>

      {/* Error */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* Transcript */}
      <div style={styles.transcriptBox}>
        {scribe.committedTranscripts.length === 0 && !scribe.partialTranscript && (
          <p style={styles.placeholder}>
            {scribe.isConnected ? "Listening… start speaking." : "Press Start to begin."}
          </p>
        )}

        {/* Committed (final) */}
        {scribe.committedTranscripts.map((t) => (
          <span key={t.id} style={styles.committed}>{t.text} </span>
        ))}

        {/* Partial (in-flight) */}
        {scribe.partialTranscript && (
          <span style={styles.partial}>{scribe.partialTranscript}</span>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {!scribe.isConnected ? (
          <button style={{ ...styles.btn, ...styles.btnStart }} onClick={handleStart}>
            <MicIcon /> Start
          </button>
        ) : (
          <button style={{ ...styles.btn, ...styles.btnStop }} onClick={handleStop}>
            <StopIcon /> Stop
          </button>
        )}

        {scribe.committedTranscripts.length > 0 && (
          <>
            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={() => navigator.clipboard.writeText(fullText)}
            >
              Copy
            </button>
          </>
        )}
      </div>

      {fullText && (
        <p style={styles.wordCount}>
          {fullText.split(/\s+/).filter(Boolean).length} words
        </p>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600,
      background: connected ? "#ECFDF5" : "#F3F4F6",
      color:      connected ? "#059669"  : "#9CA3AF",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: connected ? "#10B981" : "#9CA3AF",
        boxShadow:  connected ? "0 0 0 3px #10B98144" : "none",
        animation:  connected ? "pulse 1.5s ease-in-out infinite" : "none",
      }} />
      {connected ? "Live" : "Idle"}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8"  y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    maxWidth: 720, margin: "48px auto", padding: "0 20px", color: "#111827",
  },
  header: { display: "flex", alignItems: "center", gap: 14, marginBottom: 24 },
  logoMark: { flexShrink: 0 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" },
  subtitle: { margin: "2px 0 0", fontSize: 13, color: "#6B7280" },
  errorBanner: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA",
    borderRadius: 10, padding: "10px 14px", fontSize: 14, marginBottom: 16,
  },
  transcriptBox: {
    minHeight: 260, maxHeight: 420, overflowY: "auto",
    background: "#F9FAFB", border: "1.5px solid #E5E7EB",
    borderRadius: 14, padding: "20px 22px",
    fontSize: 17, lineHeight: 1.75, marginBottom: 20,
  },
  placeholder: { color: "#9CA3AF", fontStyle: "italic", fontSize: 15, margin: 0 },
  committed:   { color: "#111827" },
  partial:     { color: "#6B7280", fontStyle: "italic" },
  controls:    { display: "flex", gap: 10, flexWrap: "wrap" },
  btn: {
    display: "inline-flex", alignItems: "center",
    padding: "10px 20px", borderRadius: 10, border: "none",
    cursor: "pointer", fontSize: 14, fontWeight: 600,
  },
  btnStart:     { background: "#4060FF", color: "#fff", boxShadow: "0 2px 8px #4060FF44" },
  btnStop:      { background: "#EF4444", color: "#fff", boxShadow: "0 2px 8px #EF444444" },
  btnSecondary: { background: "#F3F4F6", color: "#374151" },
  wordCount:    { marginTop: 10, fontSize: 12, color: "#9CA3AF", textAlign: "right" },
};

// Inject keyframes
if (typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = `
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
  `;
  document.head.appendChild(s);
}
