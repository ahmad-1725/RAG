import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

function formatSectionContent(content) {
  if (!content) {
    return null;
  }

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const elements = [];
  let currentList = [];
  let currentListType = null;

  const flushList = () => {
    if (currentList.length === 0) {
      return;
    }

    elements.push(
      currentListType === "number" ? (
        <ol key={`list-${elements.length}`} className="dlv-list">
          {currentList.map((item, index) => (
            <li key={index} className="dlv-list-item">
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={`list-${elements.length}`} className="dlv-list">
          {currentList.map((item, index) => (
            <li key={index} className="dlv-list-item">
              {item}
            </li>
          ))}
        </ul>
      ),
    );

    currentList = [];
    currentListType = null;
  };

  lines.forEach((line, index) => {
    const bulletMatch = line.match(/^(?:[●•○▪◦‣⁃·])\s*(.+)$/);

    const numberMatch = line.match(/^\d+[\.\)]\s+(.+)$/);

    if (bulletMatch) {
      if (currentListType !== "bullet") {
        flushList();
        currentListType = "bullet";
      }

      currentList.push(bulletMatch[1]);
      return;
    }

    if (numberMatch) {
      if (currentListType !== "number") {
        flushList();
        currentListType = "number";
      }

      currentList.push(numberMatch[1]);
      return;
    }

    flushList();

    elements.push(
      <p key={`paragraph-${index}`} className="dlv-paragraph">
        {line}
      </p>,
    );
  });

  flushList();

  return elements;
}

function Icon({ size = 18, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HeadingTree({ nodes, onSelect, activeText }) {
  return (
    <div>
      {nodes.map((node, index) => {
        const isActive = activeText === node.text;

        return (
          <div key={`${node.text}-${index}`}>
            <button
              onClick={() => onSelect(node)}
              className={`dlv-toc-item${node.level === 1 ? " is-top" : ""}${
                isActive ? " is-active" : ""
              }`}
              aria-current={isActive ? "true" : undefined}
              style={{
                paddingLeft: `${16 + (node.level - 1) * 18}px`,
              }}
            >
              <span className="dlv-toc-text">{node.text}</span>

              <span className="dlv-toc-page">{node.page_number}</span>
            </button>

            {node.children?.length > 0 && (
              <HeadingTree
                nodes={node.children}
                onSelect={onSelect}
                activeText={activeText}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Styles() {
  return <style>{css}</style>;
}

export default function DocumentViewer() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSection, setSelectedSection] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // RAG state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  // UI state (Q&A panel collapse)
  const [qaOpen, setQaOpen] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/documents/${documentId}`);

      setDocumentData(response.data);
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.detail || "Could not load the document.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Section Navigation
  // ============================================================

  const scrollToSection = (sectionTitle, pageStart) => {
    setSelectedSection(sectionTitle);

    const element = window.document.getElementById(
      `section-${pageStart}-${sectionTitle}`,
    );

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleSectionSelect = (section) => {
    scrollToSection(section.text, section.page_number);
  };

  const handleSourceClick = (source) => {
    scrollToSection(source.section_title, source.page_start);
  };

  // ============================================================
  // Document Search
  // ============================================================

  const handleSearch = async (event) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setSearchError("");

      const response = await axios.post(`${API_URL}/documents/search`, {
        document_id: documentId,
        query: query,
        top_k: 5,
      });

      setSearchResults(response.data.results || []);
    } catch (err) {
      console.error(err);

      setSearchError(
        err.response?.data?.detail || "Could not search the document.",
      );

      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
  };

  // ============================================================
  // RAG Question Answering
  // ============================================================

  const handleAsk = async (event) => {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    try {
      setAsking(true);
      setAskError("");
      setAnswer("");
      setSources([]);

      const response = await axios.post(`${API_URL}/documents/ask`, {
        document_id: documentId,
        question: question.trim(),
        top_k: 5,
      });

      setAnswer(response.data.answer);
      setSources(response.data.sources || []);
    } catch (err) {
      console.error(err);

      setAskError(
        err.response?.data?.detail || "Could not answer the question.",
      );
    } finally {
      setAsking(false);
    }
  };

  // ============================================================
  // Loading / Error States
  // ============================================================

  if (loading) {
    return (
      <div className="dlv-root dlv-center" role="status">
        <Styles />

        <div className="dlv-spinner dlv-spinner-lg" aria-hidden="true" />

        <p className="dlv-state-text">Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dlv-root dlv-center">
        <Styles />

        <div className="dlv-state-icon" aria-hidden="true">
          <Icon size={22}>
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12.5" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </Icon>
        </div>

        <p className="dlv-state-text" role="alert">
          {error}
        </p>

        <button
          onClick={() => navigate("/")}
          className="dlv-btn dlv-btn-primary"
        >
          Back to Documents
        </button>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="dlv-root dlv-center">
        <Styles />

        <p className="dlv-state-text">No document data found.</p>
      </div>
    );
  }

  // ============================================================
  // Main UI
  // ============================================================

  const searchDisabled = searching || !searchQuery.trim();
  const askDisabled = asking || !question.trim();

  return (
    <div className="dlv-root">
      <Styles />

      {/* Header */}
      <header className="dlv-header">
        <button onClick={() => navigate("/")} className="dlv-back">
          <Icon>
            <polyline points="15 18 9 12 15 6" />
          </Icon>
          Documents
        </button>

        <div className="dlv-header-text">
          <h1 className="dlv-title" title={documentData.filename}>
            {documentData.filename}
          </h1>

          <p className="dlv-subtitle">{documentData.page_count} pages</p>
        </div>
      </header>

      <div className="dlv-main">
        {/* Sidebar */}
        <aside className="dlv-sidebar" aria-label="Contents">
          <h2 className="dlv-sidebar-title">Contents</h2>

          {documentData.heading_tree?.length > 0 ? (
            <HeadingTree
              nodes={documentData.heading_tree}
              onSelect={handleSectionSelect}
              activeText={selectedSection}
            />
          ) : (
            <p className="dlv-no-sections">No headings found.</p>
          )}
        </aside>

        {/* Main */}
        <main className="dlv-content">
          {/* Search */}
          <div className="dlv-search">
            <form onSubmit={handleSearch} className="dlv-search-form">
              <div className="dlv-search-field">
                <span className="dlv-search-icon">
                  <Icon size={17}>
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" />
                  </Icon>
                </span>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search this document..."
                  aria-label="Search this document"
                  className="dlv-input dlv-search-input"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="dlv-search-clear"
                    aria-label="Clear search"
                  >
                    <Icon size={16}>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </Icon>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={searchDisabled}
                className={`dlv-btn dlv-btn-primary dlv-search-button${
                  searching ? " is-busy" : ""
                }`}
              >
                {searching && (
                  <span className="dlv-spinner" aria-hidden="true" />
                )}
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {searchError && (
              <div className="dlv-alert" role="alert">
                {searchError}
              </div>
            )}

            {/* Search Results */}
            {searchQuery.trim() && !searching && !searchError && (
              <div className="dlv-results">
                <div className="dlv-results-header">
                  {searchResults.length > 0
                    ? `${searchResults.length} result${
                        searchResults.length !== 1 ? "s" : ""
                      }`
                    : "No results found"}
                </div>

                {searchResults.map((result, index) => (
                  <button
                    key={`${result.chunk_id}-${index}`}
                    onClick={() => handleSourceClick(result)}
                    className="dlv-result"
                  >
                    <span className="dlv-result-top">
                      <span className="dlv-result-title">
                        {result.section_title}
                      </span>

                      <span className="dlv-result-page">
                        Page {result.page_start}
                        {result.page_end !== result.page_start &&
                          `–${result.page_end}`}
                      </span>
                    </span>

                    <span className="dlv-result-snippet">{result.snippet}</span>

                    <span className="dlv-result-footer">
                      <span>Relevance: {(result.score * 100).toFixed(0)}%</span>

                      <span className="dlv-result-open">
                        Open section
                        <Icon size={14}>
                          <polyline points="9 18 15 12 9 6" />
                        </Icon>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Document */}
          <div className="dlv-sheet">
            <div className="dlv-doc-header">
              <h2 className="dlv-doc-title">{documentData.filename}</h2>

              <div className="dlv-metadata">
                {documentData.page_count} pages
                {" • "}
                {documentData.sections?.length || 0} sections
              </div>
            </div>

            {documentData.sections?.map((section, index) => {
              const sectionId = `section-${section.page_start}-${section.title}`;

              const isSelected = selectedSection === section.title;

              return (
                <section
                  key={`${section.title}-${index}`}
                  id={sectionId}
                  className={`dlv-section${isSelected ? " is-selected" : ""}`}
                >
                  <div className="dlv-section-title-row">
                    <h2
                      className="dlv-section-title"
                      style={{
                        fontSize:
                          section.level === 1
                            ? "26px"
                            : section.level === 2
                              ? "21px"
                              : "18px",
                      }}
                    >
                      {section.title}
                    </h2>

                    <span className="dlv-section-page">
                      Page {section.page_start}
                      {section.page_end !== section.page_start &&
                        `–${section.page_end}`}
                    </span>
                  </div>

                  <div className="dlv-section-content">
                    {section.content ? (
                      formatSectionContent(section.content)
                    ) : (
                      <p className="dlv-no-content">
                        No extracted content available for this section.
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* RAG Q&A */}
          <div className="dlv-qa">
            <div className="dlv-qa-header">
              <h2 className="dlv-qa-title">Ask about this document</h2>

              <button
                onClick={() => setQaOpen((open) => !open)}
                className={`dlv-toggle${qaOpen ? "" : " is-collapsed"}`}
                aria-expanded={qaOpen}
                aria-label={
                  qaOpen ? "Collapse question panel" : "Expand question panel"
                }
              >
                <Icon>
                  <polyline points="6 9 12 15 18 9" />
                </Icon>
              </button>
            </div>

            {qaOpen && (
              <>
                <p className="dlv-qa-description">
                  Ask a question and get an answer grounded in the document.
                </p>

                <form onSubmit={handleAsk} className="dlv-question-form">
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask something about this document..."
                    aria-label="Your question"
                    rows={3}
                    className="dlv-input dlv-textarea"
                  />

                  <button
                    type="submit"
                    disabled={askDisabled}
                    className={`dlv-btn dlv-btn-primary dlv-ask-button${
                      asking ? " is-busy" : ""
                    }`}
                  >
                    {asking && (
                      <span className="dlv-spinner" aria-hidden="true" />
                    )}
                    {asking ? "Thinking..." : "Ask Question"}
                  </button>
                </form>

                {askError && (
                  <div className="dlv-alert" role="alert">
                    {askError}
                  </div>
                )}

                {answer && (
                  <div className="dlv-answer-block">
                    <div className="dlv-answer">
                      <h3>Answer</h3>

                      <div className="dlv-answer-text">{answer}</div>
                    </div>

                    {sources.length > 0 && (
                      <div className="dlv-sources">
                        <h3>Sources</h3>

                        <div className="dlv-source-list">
                          {sources.map((source) => (
                            <button
                              key={source.source_id}
                              onClick={() => handleSourceClick(source)}
                              className="dlv-source"
                            >
                              <span className="dlv-source-number">
                                {source.source_id}
                              </span>

                              <span className="dlv-source-info">
                                <span className="dlv-source-title">
                                  {source.section_title}
                                </span>

                                <span className="dlv-source-page">
                                  Page {source.page_start}
                                </span>
                              </span>

                              <span className="dlv-source-arrow">
                                <Icon size={16}>
                                  <polyline points="9 18 15 12 9 6" />
                                </Icon>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const css = `
.dlv-root {
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
  --header-h: 72px;
  --sidebar-w: 320px;
  --gutter: 48px;
  --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --serif: Charter, "Bitstream Charter", "Iowan Old Style", "Palatino Linotype", Georgia, serif;

  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}

.dlv-root *,
.dlv-root *::before,
.dlv-root *::after {
  box-sizing: border-box;
}

.dlv-root button,
.dlv-root input,
.dlv-root textarea {
  font-family: inherit;
}

.dlv-root :focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---------- Shared: buttons, inputs, alerts, spinner, states ---------- */

.dlv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.dlv-btn-primary {
  background: var(--accent);
  color: #ffffff;
}

.dlv-btn-primary:hover:not(:disabled) {
  background: var(--accent-ink);
}

.dlv-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dlv-btn.is-busy:disabled {
  opacity: 0.85;
  cursor: progress;
}

.dlv-input {
  width: 100%;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 15px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.dlv-input::placeholder {
  color: var(--ink-3);
}

.dlv-input:focus,
.dlv-input:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(36, 86, 214, 0.18);
}

.dlv-alert {
  margin-top: 14px;
  padding: 10px 14px;
  border: 1px solid #f4c7c3;
  border-radius: 8px;
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 14px;
  line-height: 1.5;
}

.dlv-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: dlv-spin 0.75s linear infinite;
}

.dlv-spinner-lg {
  width: 30px;
  height: 30px;
  border-width: 3px;
  color: var(--accent);
}

@keyframes dlv-spin {
  to {
    transform: rotate(360deg);
  }
}

.dlv-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}

.dlv-state-text {
  margin: 0;
  color: var(--ink-2);
  font-size: 16px;
}

.dlv-state-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--danger-tint);
  color: var(--danger);
}

/* ---------- Header ---------- */

.dlv-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 20px;
  height: var(--header-h);
  padding: 0 40px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.dlv-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 8px 14px 8px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.dlv-back:hover {
  background: var(--bg);
  border-color: #b8c1ce;
}

.dlv-header-text {
  min-width: 0;
}

.dlv-title {
  margin: 0;
  overflow: hidden;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dlv-subtitle {
  margin: 3px 0 0;
  color: var(--ink-3);
  font-size: 13px;
}

/* ---------- Layout ---------- */

.dlv-main {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: calc(100vh - var(--header-h));
}

/* ---------- Contents (sidebar) ---------- */

.dlv-sidebar {
  position: sticky;
  top: var(--header-h);
  align-self: start;
  height: calc(100vh - var(--header-h));
  overflow-y: auto;
  padding: 24px 14px 32px;
  background: var(--surface);
  border-right: 1px solid var(--line);
}

.dlv-sidebar-title {
  margin: 0 0 14px 16px;
  font-size: 15px;
  font-weight: 600;
}

.dlv-no-sections {
  margin: 0 0 0 16px;
  color: var(--ink-3);
  font-size: 14px;
}

.dlv-toc-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding-top: 8px;
  padding-right: 8px;
  padding-bottom: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.dlv-toc-item:hover {
  background: var(--line-2);
  color: var(--ink);
}

.dlv-toc-item.is-top {
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
}

.dlv-toc-item.is-active {
  background: var(--accent-tint);
  color: var(--accent-ink);
  box-shadow: inset 3px 0 0 var(--accent);
}

.dlv-toc-item:focus-visible {
  outline-offset: -2px;
}

.dlv-toc-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.dlv-toc-page {
  flex-shrink: 0;
  color: var(--ink-3);
  font-size: 12px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.dlv-content {
  min-width: 0;
  padding: 32px var(--gutter) 340px;
}

/* ---------- Search ---------- */

.dlv-search {
  max-width: 820px;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.dlv-search-form {
  display: flex;
  gap: 10px;
}

.dlv-search-field {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.dlv-search-icon {
  position: absolute;
  left: 13px;
  display: flex;
  color: var(--ink-3);
  pointer-events: none;
}

.dlv-search-input {
  height: 42px;
  padding: 0 42px;
}

.dlv-search-clear {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.dlv-search-clear:hover {
  background: var(--line-2);
  color: var(--ink);
}

.dlv-search-button {
  flex-shrink: 0;
  min-width: 108px;
  height: 42px;
  padding: 0 20px;
}

.dlv-results {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.dlv-results-header {
  margin-bottom: 10px;
  color: var(--ink-3);
  font-size: 13px;
}

.dlv-result {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.dlv-result:last-child {
  margin-bottom: 0;
}

.dlv-result:hover {
  border-color: #b9c6e8;
  background: #f8faff;
}

.dlv-result-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dlv-result-title {
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.dlv-result-page {
  flex-shrink: 0;
  color: var(--ink-3);
  font-size: 12px;
  white-space: nowrap;
}

.dlv-result-snippet {
  display: block;
  margin-top: 6px;
  color: var(--ink-2);
  font-size: 13.5px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.dlv-result-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  color: var(--ink-3);
  font-size: 12px;
}

.dlv-result-open {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--accent-ink);
  font-weight: 600;
}

/* ---------- Document ---------- */

.dlv-sheet {
  max-width: 820px;
  padding: 40px 52px 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.dlv-doc-header {
  margin-bottom: 8px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}

.dlv-doc-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.dlv-metadata {
  margin-top: 8px;
  color: var(--ink-3);
  font-size: 14px;
}

.dlv-section {
  margin: 0 -20px;
  padding: 28px 20px;
  border-bottom: 1px solid var(--line-2);
  scroll-margin-top: calc(var(--header-h) + 24px);
  transition: background-color 0.25s ease, box-shadow 0.25s ease;
}

.dlv-section:last-child {
  border-bottom: 0;
}

.dlv-section.is-selected {
  background: #f4f7fe;
  box-shadow: inset 3px 0 0 var(--accent);
}

.dlv-section-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.dlv-section-title {
  margin: 0 0 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.dlv-section-page {
  flex-shrink: 0;
  margin-top: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--line-2);
  color: var(--ink-3);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dlv-section-content {
  max-width: 68ch;
  color: #2a3545;
  font-family: var(--serif);
  font-size: 17px;
  line-height: 1.75;
  overflow-wrap: break-word;
}

.dlv-paragraph {
  margin: 0 0 0.85em;
}

.dlv-list {
  margin: 4px 0 1em;
  padding-left: 28px;
}

.dlv-list-item {
  margin-bottom: 0.4em;
  padding-left: 6px;
  line-height: 1.7;
}

.dlv-section-content > :last-child {
  margin-bottom: 0;
}

.dlv-no-content {
  margin: 0;
  color: var(--ink-3);
  font-style: italic;
}

/* ---------- Q&A panel ---------- */

.dlv-qa {
  position: fixed;
  bottom: 20px;
  left: calc(var(--sidebar-w) + var(--gutter));
  right: var(--gutter);
  z-index: 20;
  max-width: 820px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 16px 20px 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(20, 32, 51, 0.16), 0 1px 3px rgba(20, 32, 51, 0.08);
}

.dlv-qa-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dlv-qa-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.dlv-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.dlv-toggle:hover {
  background: var(--bg);
}

.dlv-toggle svg {
  transition: transform 0.2s ease;
}

.dlv-toggle.is-collapsed svg {
  transform: rotate(180deg);
}

.dlv-qa-description {
  margin: 6px 0 0;
  color: var(--ink-3);
  font-size: 14px;
}

.dlv-question-form {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.dlv-textarea {
  flex: 1;
  min-width: 0;
  min-height: 76px;
  max-height: 200px;
  padding: 11px 14px;
  line-height: 1.5;
  resize: vertical;
}

.dlv-ask-button {
  flex-shrink: 0;
  min-width: 130px;
  padding: 11px 20px;
}

.dlv-qa h3 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
}

.dlv-answer-block {
  margin-top: 18px;
}

.dlv-answer {
  padding: 16px 18px;
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  background: #f5f8fd;
}

.dlv-answer-text {
  color: #2a3545;
  font-size: 15px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.dlv-sources {
  margin-top: 18px;
}

.dlv-source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dlv-source {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.dlv-source:hover {
  border-color: #b9c6e8;
  background: #f8faff;
}

.dlv-source-number {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent-tint);
  color: var(--accent-ink);
  font-size: 12px;
  font-weight: 700;
}

.dlv-source-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dlv-source-title {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.dlv-source-page {
  color: var(--ink-3);
  font-size: 12px;
}

.dlv-source-arrow {
  display: flex;
  flex-shrink: 0;
  color: var(--ink-3);
}

/* ---------- Responsive ---------- */

@media (max-width: 1100px) {
  .dlv-root {
    --sidebar-w: 280px;
    --gutter: 32px;
  }
}

@media (max-width: 900px) {
  .dlv-root {
    --header-h: 64px;
    --gutter: 16px;
  }

  .dlv-header {
    gap: 12px;
    padding: 0 16px;
  }

  .dlv-title {
    font-size: 17px;
  }

  .dlv-main {
    grid-template-columns: minmax(0, 1fr);
  }

  .dlv-sidebar {
    position: static;
    height: auto;
    max-height: 240px;
    padding: 16px 12px 20px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .dlv-content {
    padding: 16px var(--gutter) 360px;
  }

  .dlv-sheet {
    padding: 24px 20px 12px;
  }

  .dlv-doc-title {
    font-size: 24px;
  }

  .dlv-section {
    margin: 0 -8px;
    padding: 24px 8px;
  }

  .dlv-section-content {
    font-size: 16px;
  }

  .dlv-qa {
    left: 12px;
    right: 12px;
    bottom: 12px;
    max-width: none;
    max-height: 65vh;
    padding: 14px 16px 16px;
  }
}

@media (max-width: 480px) {
  .dlv-search-form,
  .dlv-question-form {
    flex-direction: column;
    align-items: stretch;
  }

  .dlv-search-button,
  .dlv-ask-button {
    width: 100%;
  }

  .dlv-result-top,
  .dlv-result-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .dlv-section-title-row {
    flex-direction: column;
    gap: 4px;
  }

  .dlv-section-page {
    margin-top: 0;
    margin-bottom: 12px;
  }

  .dlv-section-title {
    margin-bottom: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dlv-root *,
  .dlv-root *::before,
  .dlv-root *::after {
    transition: none !important;
  }

  .dlv-spinner {
    animation-duration: 2s;
  }
}
`;
