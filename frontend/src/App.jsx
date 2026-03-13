import { useState, useEffect } from "react";

const CONTENT_TYPES = [
    {
        id: "blog",
        label: "Blog Post",
        icon: "✍️",
        desc: "Long-form article with structure",
        placeholder: "e.g. The future of remote work in 2025",
    },
    {
        id: "product",
        label: "Product Description",
        icon: "🛍️",
        desc: "Compelling copy that converts",
        placeholder: "e.g. Wireless noise-cancelling headphones",
    },
    {
        id: "social",
        label: "Social Media",
        icon: "📱",
        desc: "Engaging posts for any platform",
        placeholder: "e.g. Announcing our new app launch",
    },
    {
        id: "email",
        label: "Email Campaign",
        icon: "📧",
        desc: "Professional email that gets opened",
        placeholder: "e.g. Black Friday sale promotion",
    },
];

const TONES = [
    "Professional",
    "Casual",
    "Persuasive",
    "Inspirational",
    "Witty",
];

const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://your-api-gateway.execute-api.us-east-1.amazonaws.com/prod";

async function generateContent({ type, topic, tone, keywords }) {
    const response = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, topic, tone, keywords }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
    }
    return response.json();
}

async function fetchHistory() {
    const response = await fetch(`${API_URL}/history`);
    if (!response.ok) throw new Error("Failed to fetch history");
    return response.json();
}

export default function App() {
    const [step, setStep] = useState(1);
    const [contentType, setContentType] = useState(null);
    const [topic, setTopic] = useState("");
    const [tone, setTone] = useState("Professional");
    const [keywords, setKeywords] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState("generate");
    const [dots, setDots] = useState("");
    const [toast, setToast] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        if (!loading) return;
        const interval = setInterval(
            () => setDots((d) => (d.length >= 3 ? "" : d + ".")),
            400,
        );
        return () => clearInterval(interval);
    }, [loading]);

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const data = await fetchHistory();
            setHistory(data.items || []);
        } catch (e) {
            console.error("Failed to load history:", e);
        }
        setHistoryLoading(false);
    };

    // Fetch history from DynamoDB when history tab is opened
    useEffect(() => {
        if (activeTab === "history") {
            loadHistory();
        }
    }, [activeTab]);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const askDelete = (id) => {
        setConfirmDelete(id);
    };

    const confirmDeleteItem = async () => {
        const id = confirmDelete;
        setConfirmDelete(null);
        setHistory((h) => h.filter((item) => item.id !== id));
        try {
            await fetch(`${API_URL}/history/${id}`, { method: "DELETE" });
            showToast("Item removed from history", "success");
        } catch (e) {
            showToast("Failed to delete item", "error");
            loadHistory();
        }
    };

    const cancelDelete = () => setConfirmDelete(null);

    const handleGenerate = async () => {
        if (!contentType || !topic.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const data = await generateContent({
                type: contentType,
                topic,
                tone,
                keywords,
            });
            setResult(data);
        } catch (e) {
            setResult({
                error: "Generation failed. Check your API configuration.",
            });
        }
        setLoading(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result?.content || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setResult(null);
        setTopic("");
        setKeywords("");
        setContentType(null);
        setStep(1);
    };

    const selectedType = CONTENT_TYPES.find((t) => t.id === contentType);

    return (
        <div className="app">
            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.type === "success" ? "✓" : "✕"} {toast.msg}
                </div>
            )}
            {confirmDelete && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <p className="confirm-title">🗑 Remove this item?</p>
                        <p className="confirm-sub">
                            This will permanently delete it from history.
                        </p>
                        <div className="confirm-actions">
                            <button
                                className="confirm-cancel"
                                onClick={cancelDelete}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-ok"
                                onClick={confirmDeleteItem}
                            >
                                Yes, delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <nav className="nav">
                <div className="nav-inner">
                    <div className="logo">
                        <span className="logo-icon">◆</span>
                        <span className="logo-text">ContentAI</span>
                    </div>
                    <div className="nav-tabs">
                        <button
                            className={`nav-tab ${activeTab === "generate" ? "active" : ""}`}
                            onClick={() => setActiveTab("generate")}
                        >
                            Generate
                        </button>
                        <button
                            className={`nav-tab ${activeTab === "history" ? "active" : ""}`}
                            onClick={() => setActiveTab("history")}
                        >
                            History{" "}
                            {history.length > 0 && (
                                <span className="badge">{history.length}</span>
                            )}
                        </button>
                    </div>
                    <div className="nav-status">
                        <span className="status-dot" />
                        <span className="status-text">API Connected</span>
                    </div>
                </div>
            </nav>

            <main className="main">
                {activeTab === "generate" ? (
                    <div className="generator">
                        {!result ? (
                            <>
                                <header className="hero">
                                    <div className="hero-tag">
                                        Powered by Llama 3.3 · Serverless
                                    </div>
                                    <h1 className="hero-title">
                                        Create content that
                                        <br />
                                        <span className="hero-accent">
                                            actually converts
                                        </span>
                                    </h1>
                                    <p className="hero-sub">
                                        Blog posts, product descriptions, social
                                        media — generated in seconds.
                                    </p>
                                </header>

                                <div className="card-main">
                                    <div className="section">
                                        <div className="section-label">
                                            <span className="step-num">01</span>
                                            <span>Choose content type</span>
                                        </div>
                                        <div className="type-grid">
                                            {CONTENT_TYPES.map((t) => (
                                                <button
                                                    key={t.id}
                                                    className={`type-card ${contentType === t.id ? "selected" : ""}`}
                                                    onClick={() => {
                                                        setContentType(t.id);
                                                        setStep(2);
                                                    }}
                                                >
                                                    <span className="type-icon">
                                                        {t.icon}
                                                    </span>
                                                    <span className="type-label">
                                                        {t.label}
                                                    </span>
                                                    <span className="type-desc">
                                                        {t.desc}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div
                                        className={`section ${step < 2 ? "dimmed" : ""}`}
                                    >
                                        <div className="section-label">
                                            <span className="step-num">02</span>
                                            <span>Describe your topic</span>
                                        </div>
                                        <textarea
                                            className="textarea"
                                            rows={3}
                                            placeholder={
                                                selectedType?.placeholder ||
                                                "What should we write about?"
                                            }
                                            value={topic}
                                            onChange={(e) => {
                                                setTopic(e.target.value);
                                                if (e.target.value) setStep(3);
                                            }}
                                            disabled={step < 2}
                                        />
                                    </div>

                                    <div
                                        className={`section ${step < 3 ? "dimmed" : ""}`}
                                    >
                                        <div className="section-label">
                                            <span className="step-num">03</span>
                                            <span>
                                                Customize tone & keywords
                                            </span>
                                        </div>
                                        <div className="options-row">
                                            <div className="option-group">
                                                <label className="option-label">
                                                    Tone
                                                </label>
                                                <div className="tone-chips">
                                                    {TONES.map((t) => (
                                                        <button
                                                            key={t}
                                                            className={`chip ${tone === t ? "active" : ""}`}
                                                            onClick={() =>
                                                                setTone(t)
                                                            }
                                                            disabled={step < 3}
                                                        >
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="option-group">
                                                <label className="option-label">
                                                    Keywords (optional)
                                                </label>
                                                <input
                                                    className="input"
                                                    placeholder="SEO, innovation, growth..."
                                                    value={keywords}
                                                    onChange={(e) =>
                                                        setKeywords(
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={step < 3}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        className={`generate-btn ${loading ? "loading" : ""} ${!contentType || !topic ? "disabled" : ""}`}
                                        onClick={handleGenerate}
                                        disabled={
                                            loading || !contentType || !topic
                                        }
                                    >
                                        {loading ? (
                                            <span>Generating{dots}</span>
                                        ) : (
                                            <span>
                                                <span className="generate-icon">
                                                    ◆
                                                </span>
                                                Generate Content
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="result-view">
                                <div className="result-header">
                                    <button
                                        className="back-btn"
                                        onClick={reset}
                                    >
                                        ← New generation
                                    </button>
                                    <div className="result-meta">
                                        <span className="meta-chip">
                                            {selectedType?.icon}{" "}
                                            {selectedType?.label}
                                        </span>
                                        <span className="meta-chip">
                                            🎯 {tone}
                                        </span>
                                    </div>
                                </div>

                                <div className="result-card">
                                    <div className="result-toolbar">
                                        <span className="result-title">
                                            Generated Content
                                        </span>
                                        <div className="toolbar-actions">
                                            <button
                                                className="tool-btn"
                                                onClick={copyToClipboard}
                                            >
                                                {copied ? "✓ Copied!" : "Copy"}
                                            </button>
                                            <button
                                                className="tool-btn"
                                                onClick={() => {
                                                    const blob = new Blob(
                                                        [result.content],
                                                        { type: "text/plain" },
                                                    );
                                                    const url =
                                                        URL.createObjectURL(
                                                            blob,
                                                        );
                                                    const a =
                                                        document.createElement(
                                                            "a",
                                                        );
                                                    a.href = url;
                                                    a.download = `content-${Date.now()}.txt`;
                                                    a.click();
                                                }}
                                            >
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                    {result.error ? (
                                        <div className="error-msg">
                                            {result.error}
                                        </div>
                                    ) : (
                                        <div className="result-content">
                                            {result.content
                                                .split("\n")
                                                .map((line, i) =>
                                                    line.startsWith("# ") ? (
                                                        <h1 key={i}>
                                                            {line.slice(2)}
                                                        </h1>
                                                    ) : line.startsWith(
                                                          "## ",
                                                      ) ? (
                                                        <h2 key={i}>
                                                            {line.slice(3)}
                                                        </h2>
                                                    ) : line.startsWith(
                                                          "### ",
                                                      ) ? (
                                                        <h3 key={i}>
                                                            {line.slice(4)}
                                                        </h3>
                                                    ) : line.startsWith("**") &&
                                                      line.endsWith("**") ? (
                                                        <p key={i}>
                                                            <strong>
                                                                {line.slice(
                                                                    2,
                                                                    -2,
                                                                )}
                                                            </strong>
                                                        </p>
                                                    ) : line.trim() === "" ? (
                                                        <br key={i} />
                                                    ) : (
                                                        <p key={i}>{line}</p>
                                                    ),
                                                )}
                                        </div>
                                    )}
                                </div>

                                <div className="result-actions">
                                    <button
                                        className="gen-again-btn"
                                        onClick={handleGenerate}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? `Regenerating${dots}`
                                            : "↻ Regenerate"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="history-view">
                        <div className="history-header">
                            <h2 className="history-title">
                                Generation History
                            </h2>
                            <button
                                className="refresh-btn"
                                onClick={loadHistory}
                                disabled={historyLoading}
                            >
                                {historyLoading ? "Loading..." : "↻ Refresh"}
                            </button>
                        </div>
                        {historyLoading ? (
                            <div className="empty-state">
                                <span className="empty-icon">⏳</span>
                                <p>Loading history...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">📂</span>
                                <p>
                                    No generations yet. Create your first piece
                                    of content!
                                </p>
                                <button
                                    className="empty-btn"
                                    onClick={() => setActiveTab("generate")}
                                >
                                    Start Generating
                                </button>
                            </div>
                        ) : (
                            <div className="history-list">
                                {history.map((item) => (
                                    <div key={item.id} className="history-card">
                                        <div className="history-card-header">
                                            <div className="history-meta">
                                                <span className="h-chip">
                                                    {
                                                        CONTENT_TYPES.find(
                                                            (t) =>
                                                                t.id ===
                                                                item.type,
                                                        )?.icon
                                                    }{" "}
                                                    {item.type}
                                                </span>
                                                <span className="h-chip">
                                                    {item.tone}
                                                </span>
                                            </div>
                                            <span className="h-date">
                                                {new Date(
                                                    item.createdAt,
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="h-topic">{item.topic}</p>
                                        <p className="h-preview">
                                            {item.content?.slice(0, 120)}...
                                        </p>
                                        <div className="h-actions">
                                            <button
                                                className="h-copy-btn"
                                                onClick={() =>
                                                    navigator.clipboard.writeText(
                                                        item.content,
                                                    )
                                                }
                                            >
                                                Copy content
                                            </button>
                                            <button
                                                className="h-delete-btn"
                                                onClick={() =>
                                                    askDelete(item.id)
                                                }
                                            >
                                                🗑 Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #050509; --surface:rgb(13, 6, 16); --surface2: #15101f; --border: #221832;
          --accent:rgb(69, 26, 134); --accent2: #b91c5a; --text: #e8e8f0; --text2: #9b9bb5;
          --text3: #5f6074; --green: #34d399;
          --font-display: 'Syne', sans-serif; --font-body: 'DM Sans', sans-serif;
        }
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        html, body { width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: hidden; }
        body {
          background: radial-gradient(circle at top left, rgba(90,0,36,0.45) 0, transparent 55%),
            radial-gradient(circle at bottom right, rgba(26,23,124,0.55) 0, transparent 55%),
            radial-gradient(circle at center, #050509 0, #020109 60%, #000 100%);
          color: var(--text); font-family: var(--font-body); min-height: 100vh;
        }
        #root { width: 100%; max-width: 100%; margin: 0; padding: 0; }
        .app { width: 100%; min-height: 100vh; }
        .nav { border-bottom: 1px solid var(--border); position: fixed; top: 0; left: 0; right: 0; background: #050016; backdrop-filter: blur(18px); z-index: 120; }
        .nav-inner { width: 100%; padding: 0 60px; height: 60px; display: flex; align-items: center; gap: 32px; box-sizing: border-box; }
        .logo { display: flex; align-items: center; gap: 8px; }
        .logo-icon { color: var(--accent); font-size: 28px; }
        .logo-text { font-family: var(--font-display); font-weight: 700; font-size: 17px; letter-spacing: -0.3px; }
        .nav-tabs { display: flex; gap: 4px; flex: 1; }
        .nav-tab { background: none; border: none; color: var(--text2); font-family: var(--font-body); font-size: 14px; padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: all 0.18s ease-out; display: flex; align-items: center; gap: 6px; }
        .nav-tab:hover { color: var(--text); background: rgba(21,16,31,0.85); }
        .nav-tab.active { color: #fdf2f8; background: radial-gradient(circle at top left, var(--accent2), var(--accent)); box-shadow: 0 0 0 1px rgba(185,28,90,0.7), 0 0 18px rgba(185,28,90,0.55); }
        .badge { background: var(--accent); color: white; font-size: 10px; padding: 1px 5px; border-radius: 10px; font-weight: 600; }
        .nav-status { display: flex; align-items: center; gap: 6px; margin-left: auto; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px var(--green); }
        .status-text { font-size: 12px; color: var(--text2); }
        .main { width: 100%; padding: 108px 60px 80px; box-sizing: border-box; }
        .generator, .card-main, .result-view, .history-view { width: 100%; }
        @media (max-width: 900px) { .main { padding: 100px 24px 60px; } }
        @media (max-width: 600px) { .nav { position: static; } .nav-inner { padding: 0 16px; gap: 12px; } .main { padding: 32px 16px 48px; } }
        .hero { text-align: center; margin-bottom: 48px; }
        .hero-tag { display: inline-block; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--accent2); background: rgba(124,106,247,0.1); border: 1px solid rgba(124,106,247,0.2); padding: 5px 14px; border-radius: 20px; margin-bottom: 24px; }
        .hero-title { font-family: var(--font-display); font-size: clamp(36px,5vw,58px); font-weight: 800; line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 16px; }
        .hero-accent { background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-sub { color: var(--text2); font-size: 17px; font-weight: 300; line-height: 1.6; }
        .card-main { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .section { padding: 28px 32px; border-bottom: 1px solid var(--border); transition: opacity 0.3s; }
        .section:last-of-type { border-bottom: none; }
        .section.dimmed { opacity: 0.35; pointer-events: none; }
        .section-label { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; font-family: var(--font-display); font-weight: 600; font-size: 14px; color: var(--text); }
        .step-num { font-size: 10px; font-weight: 700; color: var(--accent); background: rgba(124,106,247,0.15); border: 1px solid rgba(124,106,247,0.25); padding: 2px 7px; border-radius: 4px; letter-spacing: 0.5px; font-family: monospace; }
        .type-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
        @media (max-width: 600px) { .type-grid { grid-template-columns: 1fr; } }
        .type-card { background: var(--surface2); border: 1.5px solid var(--border); border-radius: 10px; padding: 16px; cursor: pointer; text-align: left; transition: all 0.15s; display: flex; flex-direction: column; gap: 4px; }
        .type-card:hover { border-color: var(--accent); background: rgba(124,106,247,0.06); }
        .type-card.selected { border-color: var(--accent); background: rgba(124,106,247,0.1); }
        .type-icon { font-size: 20px; margin-bottom: 4px; }
        .type-label { font-family: var(--font-display); font-weight: 600; font-size: 14px; color: var(--text); }
        .type-desc { font-size: 12px; color: var(--text2); }
        .textarea, .input { width: 100%; background: var(--surface2); border: 1.5px solid var(--border); border-radius: 8px; color: var(--text); font-family: var(--font-body); font-size: 15px; padding: 12px 14px; resize: none; transition: border-color 0.15s; }
        .textarea:focus, .input:focus { outline: none; border-color: var(--accent); }
        .textarea::placeholder, .input::placeholder { color: var(--text3); }
        .options-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 600px) { .options-row { grid-template-columns: 1fr; } }
        .option-label { display: block; font-size: 12px; color: var(--text2); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.8px; }
        .tone-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { background: var(--surface2); border: 1.5px solid var(--border); color: var(--text2); border-radius: 6px; padding: 6px 12px; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: var(--font-body); }
        .chip:hover { border-color: var(--accent2); color: var(--text); }
        .chip.active { border-color: var(--accent); color: var(--accent2); background: rgba(124,106,247,0.12); }
        .generate-btn { width: 100%; padding: 18px; background: linear-gradient(135deg, var(--accent), #9d8bf0); border: none; border-radius: 0 0 14px 14px; color: white; font-family: var(--font-display); font-weight: 700; font-size: 15px; letter-spacing: 0.3px; cursor: pointer; transition: all 0.2s; }
        .generate-btn:hover:not(.disabled):not(.loading) { opacity: 0.9; transform: translateY(-1px); }
        .generate-btn.disabled { opacity: 0.35; cursor: not-allowed; }
        .generate-btn.loading { background: var(--surface2); color: var(--text2); cursor: wait; }
        .generate-icon { font-size: 20px; margin-right: 8px; vertical-align: middle; }
        .result-view { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .back-btn { background: none; border: 1px solid var(--border); color: var(--text2); border-radius: 7px; padding: 7px 14px; cursor: pointer; font-size: 13px; font-family: var(--font-body); transition: all 0.15s; }
        .back-btn:hover { color: var(--text); border-color: var(--accent); }
        .result-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .meta-chip { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; font-size: 12px; color: var(--text2); }
        .result-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
        .result-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); background: var(--surface2); }
        .result-title { font-family: var(--font-display); font-weight: 600; font-size: 13px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.8px; }
        .toolbar-actions { display: flex; gap: 8px; }
        .tool-btn { background: none; border: 1px solid var(--border); color: var(--text2); border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: var(--font-body); transition: all 0.15s; }
        .tool-btn:hover { color: var(--text); border-color: var(--accent); }
        .result-content { padding: 28px 32px; line-height: 1.8; font-size: 15px; }
        .result-content h1 { font-family: var(--font-display); font-size: 24px; font-weight: 700; margin-bottom: 16px; color: var(--text); }
        .result-content h2 { font-family: var(--font-display); font-size: 18px; font-weight: 600; margin: 20px 0 10px; color: var(--text); }
        .result-content h3 { font-family: var(--font-display); font-size: 15px; font-weight: 600; margin: 16px 0 8px; color: var(--accent2); }
        .result-content p { color: var(--text2); margin-bottom: 8px; }
        .result-content strong { color: var(--text); }
        .result-actions { margin-top: 16px; display: flex; justify-content: center; }
        .gen-again-btn { background: none; border: 1.5px solid var(--border); color: var(--text2); border-radius: 8px; padding: 10px 24px; cursor: pointer; font-size: 14px; font-family: var(--font-body); transition: all 0.15s; }
        .gen-again-btn:hover { border-color: var(--accent); color: var(--accent2); }
        .error-msg { padding: 24px 32px; color: #f87171; font-size: 14px; }
        .history-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        .history-title { font-family: var(--font-display); font-size: 28px; font-weight: 700; }
        .refresh-btn { background: none; border: 1px solid var(--border); color: var(--text2); border-radius: 7px; padding: 7px 14px; cursor: pointer; font-size: 13px; font-family: var(--font-body); transition: all 0.15s; }
        .refresh-btn:hover { color: var(--text); border-color: var(--accent); }
        .history-list { display: flex; flex-direction: column; gap: 12px; }
        .history-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; transition: border-color 0.15s; }
        .history-card:hover { border-color: var(--accent); }
        .history-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .history-meta { display: flex; gap: 6px; }
        .h-chip { background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 3px 8px; font-size: 11px; color: var(--text2); text-transform: capitalize; }
        .h-date { font-size: 11px; color: var(--text3); }
        .h-topic { font-weight: 500; font-size: 15px; margin-bottom: 6px; }
        .h-preview { color: var(--text2); font-size: 13px; line-height: 1.5; margin-bottom: 12px; }
        .h-copy-btn { background: none; border: 1px solid var(--border); color: var(--text2); border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: var(--font-body); transition: all 0.15s; }
        .h-copy-btn:hover { border-color: var(--accent); color: var(--accent2); }
        .empty-state { text-align: center; padding: 80px 0; color: var(--text2); }
        .empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
        .empty-btn { margin-top: 20px; background: var(--accent); border: none; color: white; border-radius: 8px; padding: 10px 24px; cursor: pointer; font-family: var(--font-body); font-size: 14px; }
        .h-actions { display: flex; gap: 8px; }
        .h-delete-btn { background: none; border: 1px solid rgba(248,113,113,0.3); color: #f87171; border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: var(--font-body); transition: all 0.15s; }
        .h-delete-btn:hover { background: rgba(248,113,113,0.1); border-color: #f87171; }
        .toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: #1a1a2e; border: 1px solid var(--border); border-radius: 10px; padding: 12px 24px; font-size: 14px; z-index: 999; animation: slideUp 0.3s ease; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .toast-success { border-color: var(--green); color: var(--green); }
        .toast-error { border-color: #f87171; color: #f87171; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 998; display: flex; align-items: center; justify-content: center; }
        .confirm-box { background: #0d0618; border: 1px solid #3b1f5e; border-radius: 14px; padding: 28px 32px; max-width: 340px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: fadeIn 0.2s ease; }
        .confirm-title { font-family: var(--font-display); font-size: 17px; font-weight: 700; margin-bottom: 8px; color: var(--text); }
        .confirm-sub { font-size: 13px; color: var(--text2); margin-bottom: 24px; }
        .confirm-actions { display: flex; gap: 10px; justify-content: center; }
        .confirm-cancel { background: none; border: 1px solid var(--border); color: var(--text2); border-radius: 8px; padding: 9px 20px; cursor: pointer; font-family: var(--font-body); font-size: 13px; transition: all 0.15s; }
        .confirm-cancel:hover { border-color: var(--accent); color: var(--text); }
        .confirm-ok { background: rgba(248,113,113,0.15); border: 1px solid #f87171; color: #f87171; border-radius: 8px; padding: 9px 20px; cursor: pointer; font-family: var(--font-body); font-size: 13px; font-weight: 600; transition: all 0.15s; }
        .confirm-ok:hover { background: rgba(248,113,113,0.25); }
      `}</style>
        </div>
    );
}
