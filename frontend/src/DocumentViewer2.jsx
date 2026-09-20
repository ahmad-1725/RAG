import { useEffect, useId, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "./DocumentViewer.css";

const API_URL = "http://127.0.0.1:8000";

function formatSectionContent(content) {
  if (!content) return null;

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const elements = [];
  let currentList = [];
  let currentListType = null;

  const flushList = () => {
    if (!currentList.length) return;

    const ListTag = currentListType === "number" ? "ol" : "ul";

    elements.push(
      <ListTag className="section-list" key={`list-${elements.length}`}>
        {currentList.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ListTag>
    );

    currentList = [];
    currentListType = null;
  };

  lines.forEach((line, index) => {
    const bulletMatch = line.match(/^(?:[●•○▪◦‣⁃·])\s*(.+)$/);
    const numberMatch = line.match(/^\d+[\.)]\s+(.+)$/);

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
      <p className="section-paragraph" key={`paragraph-${index}`}>
        {line}
      </p>
    );
  });

  flushList();
  return elements;
}

function HeadingTree({ nodes, onSelect, activeTitle }) {
  return (
    <div className="heading-tree">
      {nodes.map((node, index) => {
        const nodeKey = `${node.text}-${node.page_number}-${index}`;
        const isActive = activeTitle === node.title || activeTitle === node.text;

        return (
          <div key={nodeKey}>
            <button
              type="button"
              className={`toc-item ${isActive ? "is-active" : ""}`}
              style={{ paddingLeft: `${12 + (node.level - 1) * 16}px` }}
              onClick={() => onSelect(node)}
              aria-current={isActive ? "location" : undefined}
            >
              <span className="toc-item-text">{node.text || node.title}</span>
              <span className="toc-page">{node.page_number}</span>
            </button>

            {node.children?.length > 0 && (
              <HeadingTree
                nodes={node.children}
                onSelect={onSelect}
                activeTitle={activeTitle}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="viewer-state">
      <div className="loading-spinner" aria-hidden="true" />
      <h2>Loading document</h2>
      <p>Preparing your document workspace...</p>
    </div>
  );
}

function ErrorState({ message, onBack }) {
  return (
    <div className="viewer-state">
      <div className="state-icon state-icon-error">!</div>
      <h2>Unable to load document</h2>
      <p>{message}</p>
      <button className="button button-primary" onClick={onBack}>
        Back to documents
      </button>
    </div>
  );
}

export default function DocumentViewer() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const questionId = useId();

  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [qaOpen, setQaOpen] = useState(true);


  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  async function fetchDocument() {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/documents/${documentId}`
      );

      setDocumentData(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Could not load the document."
      );
    } finally {
      setLoading(false);
    }
  }

  function getSectionDomId(section) {
    return `section-${section.page_start}-${section.title}`
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();
  }

  function scrollToSection(section) {
    const title = section.title || section.text;
    setSelectedSection(title);

    const element = document.getElementById(getSectionDomId(section));

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    setSidebarOpen(false);
  }

  function handleSourceClick(source) {
    scrollToSection({
      title: source.section_title,
      page_start: source.page_start,
    });
  }

  async function handleAsk(event) {
    event.preventDefault();

    if (!question.trim() || asking) return;

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
        err.response?.data?.detail || "Could not answer the question."
      );
    } finally {
      setAsking(false);
    }
  }

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <ErrorState
        message={error}
        onBack={() => navigate("/")}
      />
    );
  }

  if (!documentData) return null;

  const sectionCount = documentData.sections?.length || 0;
  const pageCount = documentData.page_count || 0;

  return (
    <div className="document-viewer">
      <header className="viewer-header">
        <div className="header-inner">
          <button
            type="button"
            className="back-link"
            onClick={() => navigate("/")}
          >
            <span aria-hidden="true">←</span>
            Documents
          </button>

          <div className="header-document">
            <div className="file-icon" aria-hidden="true">
              PDF
            </div>

            <div className="header-document-info">
              <h1 title={documentData.filename}>
                {documentData.filename}
              </h1>

              <div className="document-meta">
                <span>{pageCount} pages</span>
                <span className="meta-dot">•</span>
                <span>{sectionCount} sections</span>
                <span className="status-pill">
                  <span className="status-dot" />
                  Ready
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="Toggle document contents"
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>
        </div>
      </header>

      <div className="viewer-layout">
        <aside className={`contents-sidebar ${sidebarOpen ? "is-open" : ""}`}>
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">DOCUMENT MAP</p>
              <h2>Contents</h2>
            </div>
            <span className="count-badge">{sectionCount}</span>
          </div>

          <div className="sidebar-scroll">
            {documentData.heading_tree?.length > 0 ? (
              <HeadingTree
                nodes={documentData.heading_tree}
                onSelect={scrollToSection}
                activeTitle={selectedSection}
              />
            ) : (
              <div className="empty-state">
                <span aria-hidden="true">☷</span>
                <p>No headings found.</p>
              </div>
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close document contents"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="viewer-main">
          <div className="content-width">
            <section className="document-card">
              <div className="card-topbar">
                <div>
                  <p className="eyebrow">READING VIEW</p>
                  <h2>Document content</h2>
                </div>

                <span className="card-label">Extracted text</span>
              </div>

              <div className="document-content">
                {documentData.sections?.length ? (
                  documentData.sections.map((section, index) => {
                    const sectionId = getSectionDomId(section);
                    const isSelected = selectedSection === section.title;

                    return (
                      <article
                        key={`${section.title}-${section.page_start}-${index}`}
                        id={sectionId}
                        className={`document-section ${
                          isSelected ? "is-selected" : ""
                        }`}
                      >
                        <div className="section-heading-row">
                          <div className="section-heading-content">
                            <span className="section-index">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <h2
                              className={
                                section.level === 1
                                  ? "section-title section-title-primary"
                                  : "section-title"
                              }
                            >
                              {section.title}
                            </h2>
                          </div>

                          <span className="page-badge">
                            Page {section.page_start}
                            {section.page_end !== section.page_start &&
                              `–${section.page_end}`}
                          </span>
                        </div>

                        <div className="section-content">
                          {section.content ? (
                            formatSectionContent(section.content)
                          ) : (
                            <p className="empty-content">
                              No extracted content available for this section.
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="empty-state large">
                    <span aria-hidden="true">▤</span>
                    <h3>No document sections</h3>
                    <p>The document has not been structured yet.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="qa-card">
              <div className="qa-heading">
                <div className="ai-icon" aria-hidden="true">
                  ✦
                </div>
                <div>
                  <p className="eyebrow">AI ASSISTANT</p>
                  <h2>Explore this document</h2>
                  <p>
                    Ask a question and receive an answer grounded in the
                    document's extracted content.
                  </p>
                </div>
              </div>

              <form className="question-form" onSubmit={handleAsk}>
                <label className="sr-only" htmlFor={questionId}>
                  Ask a question about this document
                </label>

                <textarea
                  id={questionId}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about a concept, chapter, definition, or example..."
                  rows={3}
                  className="question-input"
                  disabled={asking}
                />

                <div className="question-footer">
                  <span className="input-hint">
                    Answers are generated from retrieved document sources.
                  </span>

                  <button
                    type="submit"
                    className="button button-primary ask-button"
                    disabled={asking || !question.trim()}
                  >
                    {asking ? (
                      <>
                        <span className="button-spinner" />
                        Thinking
                      </>
                    ) : (
                      <>
                        Ask question
                        <span aria-hidden="true">↗</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {askError && <div className="alert-error">{askError}</div>}

              {answer && (
                <div className="answer-area">
                  <div className="answer-heading">
                    <span className="answer-mark" aria-hidden="true">
                      ✓
                    </span>
                    <h3>Answer</h3>
                  </div>

                  <div className="answer-box">{answer}</div>

                  {sources.length > 0 && (
                    <div className="sources-area">
                      <div className="sources-heading">
                        <h3>Sources</h3>
                        <span>{sources.length} references</span>
                      </div>

                      <div className="sources-list">
                        {sources.map((source, index) => (
                          <button
                            type="button"
                            key={`${source.source_id}-${index}`}
                            className="source-item"
                            onClick={() => handleSourceClick(source)}
                          >
                            <span className="source-number">
                              {source.source_id || index + 1}
                            </span>

                            <span className="source-info">
                              <strong>{source.section_title}</strong>
                              <small>
                                Page {source.page_start}
                                {source.page_end !== source.page_start &&
                                  `–${source.page_end}`}
                              </small>
                            </span>

                            <span className="source-arrow" aria-hidden="true">
                              ↗
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
