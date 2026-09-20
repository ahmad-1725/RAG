import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

function Styles() {
  return <style>{css}</style>;
}

function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      setUploadError("Please select a PDF file.");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API_URL}/documents/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const documentId = response.data.document_id;

      await fetchDocuments();

      navigate(`/documents/${documentId}`);
    } catch (err) {
      console.error(err);

      setUploadError(
        err.response?.data?.detail || "Could not upload the document.",
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/documents`);

      setDocuments(response.data.documents);
    } catch (err) {
      console.error(err);
      setError("Could not connect to the DocLens backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="dlh-root">
      <Styles />

      <header className="dlh-header">
        <div className="dlh-brand">
          <div className="dlh-brand-mark" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </div>

          <div>
            <h1 className="dlh-title">DocLens</h1>
            <p className="dlh-subtitle">
              Explore, search, and ask questions about your documents.
            </p>
          </div>
        </div>
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            style={{ display: "none" }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="dlh-upload-button"
          >
            {uploading ? (
              <span className="dlh-spinner" aria-hidden="true" />
            ) : (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
            {uploading ? "Processing..." : "Upload PDF"}
          </button>
        </>
      </header>

      <main className="dlh-main">
        <div className="dlh-section-header">
          <div>
            <h2 className="dlh-heading">Your Documents</h2>
            <p className="dlh-description">
              Documents processed by the DocLens system.
            </p>
          </div>

          <button onClick={fetchDocuments} className="dlh-refresh-button">
            Refresh
          </button>
        </div>

        {loading && (
          <div className="dlh-message" role="status">
            <span className="dlh-spinner dlh-spinner-accent" aria-hidden="true" />
            Loading documents...
          </div>
        )}

        {uploadError && (
          <div className="dlh-alert" role="alert">
            {uploadError}
          </div>
        )}

        {error && (
          <div className="dlh-alert" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="dlh-empty">
            <div className="dlh-empty-icon" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <polyline points="14 3 14 8 19 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            <h3>No documents yet</h3>
            <p>Upload a PDF to start exploring it.</p>
          </div>
        )}

        <div className="dlh-grid">
          {documents.map((document) => (
            <div key={document.document_id} className="dlh-card">
              <div className="dlh-icon">PDF</div>
              <h3 className="dlh-filename">{document.filename}</h3>
              <div className="dlh-stats">
                <span>{document.page_count} pages</span>
                <span>{document.section_count} sections</span>
                <span>{document.chunk_count} chunks</span>
              </div>
              <button
                onClick={() => navigate(`/documents/${document.document_id}`)}
                className="dlh-view-button"
              >
                Open Document
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const css = `
.dlh-root {
  --ink: #142033;
  --ink-2: #435063;
  --ink-3: #66738a;
  --line: #e1e5eb;
  --line-2: #edf0f4;
  --line-strong: #cfd6e0;
  --bg: #f3f5f8;
  --surface: #ffffff;
  --accent: #2456d6;
  --accent-ink: #1b43a8;
  --accent-tint: #eaf0fd;
  --danger: #b42318;
  --danger-tint: #fdeceb;
  --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}

.dlh-root *,
.dlh-root *::before,
.dlh-root *::after {
  box-sizing: border-box;
}

.dlh-root button {
  font-family: inherit;
}

.dlh-root :focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---------- Header ---------- */

.dlh-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 48px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.dlh-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.dlh-brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--ink);
  color: #ffffff;
}

.dlh-title {
  margin: 0;
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.dlh-subtitle {
  margin: 5px 0 0;
  color: var(--ink-3);
  font-size: 15px;
}

.dlh-upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  padding: 12px 20px;
  border: 0;
  border-radius: 8px;
  background: var(--accent);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.dlh-upload-button:hover:not(:disabled) {
  background: var(--accent-ink);
}

.dlh-upload-button:disabled {
  opacity: 0.8;
  cursor: progress;
}

/* ---------- Main ---------- */

.dlh-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 32px 64px;
}

.dlh-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.dlh-heading {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.dlh-description {
  margin: 6px 0 0;
  color: var(--ink-3);
  font-size: 15px;
}

.dlh-refresh-button {
  flex-shrink: 0;
  padding: 9px 16px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.dlh-refresh-button:hover {
  background: var(--bg);
  border-color: #b8c1ce;
}

/* ---------- Spinner ---------- */

.dlh-spinner {
  display: inline-block;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: dlh-spin 0.75s linear infinite;
}

.dlh-spinner-accent {
  color: var(--accent);
}

@keyframes dlh-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- States ---------- */

.dlh-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px;
  color: var(--ink-3);
  font-size: 15px;
}

.dlh-alert {
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid #f4c7c3;
  border-radius: 8px;
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 14px;
  line-height: 1.5;
}

.dlh-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64px 20px;
  border: 1px dashed var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  text-align: center;
}

.dlh-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: var(--accent-tint);
  color: var(--accent-ink);
}

.dlh-empty h3 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
}

.dlh-empty p {
  margin: 0;
  color: var(--ink-3);
  font-size: 15px;
}

/* ---------- Document cards ---------- */

.dlh-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 20px;
}

.dlh-card {
  display: flex;
  flex-direction: column;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.dlh-card:hover {
  border-color: #b9c6e8;
  box-shadow: 0 6px 20px rgba(20, 32, 51, 0.08);
}

.dlh-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--accent-tint);
  color: var(--accent-ink);
  font-size: 12px;
  font-weight: 700;
}

.dlh-filename {
  flex: 1;
  margin: 16px 0 14px;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.dlh-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.dlh-stats span {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--line-2);
  color: var(--ink-2);
  font-size: 13px;
  white-space: nowrap;
}

.dlh-view-button {
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 8px;
  background: var(--ink);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.dlh-view-button:hover {
  background: #26374f;
}

/* ---------- Responsive ---------- */

@media (max-width: 720px) {
  .dlh-header {
    flex-wrap: wrap;
    padding: 20px 16px;
  }

  .dlh-title {
    font-size: 22px;
  }

  .dlh-subtitle {
    font-size: 14px;
  }

  .dlh-upload-button {
    width: 100%;
  }

  .dlh-main {
    padding: 24px 16px 48px;
  }

  .dlh-section-header {
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dlh-root *,
  .dlh-root *::before,
  .dlh-root *::after {
    transition: none !important;
  }

  .dlh-spinner {
    animation-duration: 2s;
  }
}
`;

export default App;