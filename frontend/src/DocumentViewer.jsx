import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

function HeadingTree({ headings, onSelect, activeText }) {
  return (
    <div>
      {headings.map((heading, index) => {
        const isActive = activeText === heading.text;

        return (
          <div key={index}>
            <button
              onClick={() => onSelect(heading)}
              className={`dlv-toc-item${heading.level === 1 ? " is-top" : ""}${
                isActive ? " is-active" : ""
              }`}
              aria-current={isActive ? "true" : undefined}
              style={{
                paddingLeft: `${12 + (heading.level - 1) * 18}px`,
              }}
            >
              <span className="dlv-toc-text">{heading.text}</span>

              <span className="dlv-toc-page">p. {heading.page_number}</span>
            </button>

            {heading.children?.length > 0 && (
              <HeadingTree
                headings={heading.children}
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

function DocumentViewer() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  const [qaOpen, setQaOpen] = useState(true);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await axios.get(`${API_URL}/documents/${documentId}`);

        console.log("Document response:", response.data);

        setDocumentData(response.data);
      } catch (err) {
        console.error(err);
        setError("Could not load the document.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  const handleSectionSelect = (section) => {
    setSelectedSection(section.title);

    const element = window.document.getElementById(
      `section-${section.page_start}-${section.title}`,
    );

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleAsk = async () => {
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
      setAskError("Could not get an answer.");
    } finally {
      setAsking(false);
    }
  };

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
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12.5" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
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

  const sections = documentData.sections || [];

  return (
    <div className="dlv-root">
      <Styles />

      {/* HEADER */}

      <header className="dlv-header">
        <button onClick={() => navigate("/")} className="dlv-back">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Documents
        </button>

        <div className="dlv-header-text">
          <h1 className="dlv-title" title={documentData.filename}>
            {documentData.filename}
          </h1>

          <p className="dlv-subtitle">{documentData.page_count} pages</p>
        </div>
      </header>

      {/* MAIN */}

      <main className="dlv-main">
        {/* TOC */}

        <aside className="dlv-sidebar" aria-label="Table of contents">
          <h2 className="dlv-sidebar-title">Table of Contents</h2>

          {sections.length === 0 ? (
            <p className="dlv-no-sections">No sections found.</p>
          ) : (
            <HeadingTree
              headings={documentData.heading_tree || []}
              activeText={selectedSection}
              onSelect={(heading) => {
                const section = sections.find(
                  (item) => item.title === heading.text,
                );

                if (section) {
                  handleSectionSelect(section);
                }
              }}
            />
          )}
        </aside>

        {/* DOCUMENT */}

        <section className="dlv-content">
          <div className="dlv-sheet">
            <div className="dlv-doc-header">
              <h2 className="dlv-doc-title">{documentData.filename}</h2>

              <div className="dlv-metadata">
                {documentData.page_count} pages
                {" • "}
                {sections.length} sections
              </div>
            </div>

            {sections.map((section, index) => {
              const sectionId = `section-${section.page_start}-${section.title}`;

              const isSelected = selectedSection === section.title;

              return (
                <article
                  id={sectionId}
                  key={index}
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
                      Pages {section.page_start}
                      {section.page_end !== section.page_start
                        ? `–${section.page_end}`
                        : ""}
                    </span>
                  </div>

                  {section.content ? (
                    <div className="dlv-section-content">
                      {section.content
                        .split("\n")
                        .map((paragraph, paragraphIndex) => (
                          <p key={paragraphIndex}>{paragraph}</p>
                        ))}
                    </div>
                  ) : (
                    <p className="dlv-no-content">
                      No extracted content available for this section.
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <div className="dlv-qa">
            <div className="dlv-qa-header">
              <h2 className="dlv-qa-title">Ask about this document</h2>

              <button
                onClick={() => setQaOpen((open) => !open)}
                className={`dlv-toggle${qaOpen ? "" : " is-collapsed"}`}
                aria-expanded={qaOpen}
                aria-label={qaOpen ? "Collapse question panel" : "Expand question panel"}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {qaOpen && (
              <>
                <p className="dlv-qa-description">
                  Ask a question and get an answer based only on this document.
                </p>

                <div className="dlv-question-row">
                  <input
                    type="text"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleAsk();
                      }
                    }}
                    placeholder="Ask something about this document..."
                    aria-label="Your question"
                    className="dlv-question-input"
                  />

                  <button
                    onClick={handleAsk}
                    disabled={asking}
                    className="dlv-btn dlv-btn-primary dlv-ask-button"
                  >
                    {asking && (
                      <span className="dlv-spinner" aria-hidden="true" />
                    )}
                    {asking ? "Thinking..." : "Ask"}
                  </button>
                </div>

                {askError && (
                  <p className="dlv-ask-error" role="alert">
                    {askError}
                  </p>
                )}

                {answer && (
                  <div className="dlv-answer">
                    <h3>Answer</h3>
                    <p className="dlv-answer-text">{answer}</p>
                  </div>
                )}

                {sources.length > 0 && (
                  <div className="dlv-sources">
                    <h3>Sources</h3>

                    {sources.map((source) => (
                      <button
                        key={source.source_id}
                        onClick={() => {
                          const element = window.document.getElementById(
                            `section-${source.page_start}-${source.section_title}`,
                          );

                          if (element) {
                            element.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }

                          setSelectedSection(source.section_title);
                        }}
                        className="dlv-source"
                      >
                        <strong>{source.section_title}</strong>

                        <span>
                          Page {source.page_start}
                          {source.page_end !== source.page_start
                            ? `–${source.page_end}`
                            : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
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
.dlv-root input {
  font-family: inherit;
}

.dlv-root :focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---------- Shared: buttons, spinner, states ---------- */

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
  opacity: 0.75;
  cursor: progress;
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

/* ---------- Table of contents ---------- */

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
  margin: 0 0 14px 12px;
  font-size: 15px;
  font-weight: 600;
}

.dlv-no-sections {
  margin: 0 0 0 12px;
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
  font-size: 14px;
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

/* ---------- Document ---------- */

.dlv-content {
  min-width: 0;
  padding: 32px var(--gutter) 320px;
}

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

.dlv-section-content p {
  margin: 0 0 0.85em;
}

.dlv-section-content p:empty {
  display: none;
}

.dlv-section-content p:last-child {
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

.dlv-question-row {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.dlv-question-input {
  flex: 1;
  min-width: 0;
  padding: 11px 14px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 15px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.dlv-question-input::placeholder {
  color: var(--ink-3);
}

.dlv-question-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(36, 86, 214, 0.18);
}

.dlv-question-input:focus-visible {
  outline: none;
}

.dlv-ask-button {
  flex-shrink: 0;
  min-width: 104px;
  padding: 11px 20px;
}

.dlv-ask-error {
  margin: 14px 0 0;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 14px;
}

.dlv-qa h3 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
}

.dlv-answer {
  margin-top: 18px;
  padding: 16px 18px;
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  background: #f5f8fd;
}

.dlv-answer-text {
  margin: 0;
  color: #2a3545;
  font-size: 15px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.dlv-sources {
  margin-top: 18px;
}

.dlv-source {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
  padding: 11px 10px;
  border: 0;
  border-bottom: 1px solid var(--line-2);
  border-radius: 6px;
  background: transparent;
  color: var(--ink-2);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.dlv-source:hover {
  background: var(--accent-tint);
}

.dlv-source:focus-visible {
  outline-offset: -2px;
}

.dlv-source strong {
  min-width: 0;
  color: var(--ink);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.dlv-source span {
  flex-shrink: 0;
  color: var(--ink-3);
  font-size: 13px;
  white-space: nowrap;
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
    padding: 16px var(--gutter) 320px;
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
  .dlv-question-row {
    flex-direction: column;
  }

  .dlv-ask-button {
    width: 100%;
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

export default DocumentViewer;