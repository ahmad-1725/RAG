import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

function HeadingTree({ headings, onSelect }) {
  return (
    <div>
      {headings.map((heading, index) => (
        <div key={index}>
          <button
            onClick={() => onSelect(heading)}
            style={{
              ...styles.tocItem,
              paddingLeft: `${12 + (heading.level - 1) * 18}px`,
            }}
          >
            <span>{heading.text}</span>

            <span style={styles.pageNumber}>p. {heading.page_number}</span>
          </button>

          {heading.children?.length > 0 && (
            <HeadingTree headings={heading.children} onSelect={onSelect} />
          )}
        </div>
      ))}
    </div>
  );
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
    return <div style={styles.center}>Loading document...</div>;
  }

  if (error) {
    return (
      <div style={styles.center}>
        <p>{error}</p>

        <button onClick={() => navigate("/")} style={styles.button}>
          Back to Documents
        </button>
      </div>
    );
  }

  if (!documentData) {
    return <div style={styles.center}>No document data found.</div>;
  }

  const sections = documentData.sections || [];

  return (
    <div style={styles.app}>
      {/* HEADER */}

      <header style={styles.header}>
        <button onClick={() => navigate("/")} style={styles.backButton}>
          ← Documents
        </button>

        <div>
          <h1 style={styles.title}>{documentData.filename}</h1>

          <p style={styles.subtitle}>{documentData.page_count} pages</p>
        </div>
      </header>

      {/* MAIN */}

      <main style={styles.main}>
        {/* TOC */}

        <aside style={styles.sidebar}>
          <h2 style={styles.sidebarTitle}>Table of Contents</h2>

          {sections.length === 0 ? (
            <p style={styles.noSections}>No sections found.</p>
          ) : (
            <HeadingTree
              headings={documentData.heading_tree || []}
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

        <section style={styles.content}>
          <div style={styles.documentHeader}>
            <h2>{documentData.filename}</h2>

            <div style={styles.metadata}>
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
                style={{
                  ...styles.section,

                  ...(isSelected ? styles.selectedSection : {}),
                }}
              >
                <div style={styles.sectionTitleRow}>
                  <h2
                    style={{
                      ...styles.sectionTitle,

                      fontSize:
                        section.level === 1
                          ? "24px"
                          : section.level === 2
                            ? "20px"
                            : "18px",
                    }}
                  >
                    {section.title}
                  </h2>

                  <span style={styles.sectionPage}>
                    Pages {section.page_start}
                    {section.page_end !== section.page_start
                      ? `–${section.page_end}`
                      : ""}
                  </span>
                </div>

                {section.content ? (
                  <div style={styles.sectionContent}>
                    {section.content
                      .split("\n")
                      .map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>{paragraph}</p>
                      ))}
                  </div>
                ) : (
                  <p style={styles.noContent}>
                    No extracted content available for this section.
                  </p>
                )}
              </article>
            );
          })}
          <div style={styles.qaPanel}>
            <div style={styles.qaHeader}>
              <h2 style={styles.qaTitle}>Ask about this document</h2>

              <button
                onClick={() => setQaOpen((open) => !open)}
                style={styles.hideButton}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: qaOpen ? "rotate(90deg)" : "rotate(270deg)",
                    transition: "transform 0.2s ease",
                    fontSize: "20px",
                  }}
                >
                  &gt;
                </span>
              </button>
            </div>

            {qaOpen && (
              <>
                <p style={styles.qaDescription}>
                  Ask a question and get an answer based only on this document.
                </p>

                <div style={styles.questionRow}>
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
                    style={styles.questionInput}
                  />

                  <button
                    onClick={handleAsk}
                    disabled={asking}
                    style={styles.askButton}
                  >
                    {asking ? "Thinking..." : "Ask"}
                  </button>
                </div>

                {askError && <p style={styles.askError}>{askError}</p>}

                {answer && (
                  <div style={styles.answerBox}>
                    <h3>Answer</h3>
                    <p style={styles.answer}>{answer}</p>
                  </div>
                )}

                {sources.length > 0 && (
                  <div style={styles.sources}>
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
                        style={styles.source}
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

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 10,

    display: "flex",
    alignItems: "center",
    gap: "25px",

    padding: "20px 40px",

    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },

  backButton: {
    padding: "9px 14px",
    border: "1px solid #d0d5dd",
    borderRadius: "7px",
    background: "#ffffff",
    cursor: "pointer",
  },

  title: {
    margin: 0,
    fontSize: "21px",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#667085",
    fontSize: "14px",
  },

  main: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    minHeight: "calc(100vh - 90px)",
  },

  sidebar: {
    position: "sticky",
    top: "90px",

    height: "calc(100vh - 90px)",

    overflowY: "auto",

    padding: "28px 18px",

    background: "#ffffff",

    borderRight: "1px solid #e5e7eb",
  },

  sidebarTitle: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "18px",
  },

  tocItem: {
    width: "100%",

    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",

    gap: "10px",

    border: "none",
    background: "transparent",

    textAlign: "left",

    paddingTop: "9px",
    paddingBottom: "9px",
    paddingRight: "5px",

    borderRadius: "6px",

    cursor: "pointer",

    color: "#344054",

    fontSize: "14px",
  },

  pageNumber: {
    flexShrink: 0,

    color: "#98a2b3",

    fontSize: "12px",
  },

  noSections: {
    color: "#98a2b3",
    fontSize: "14px",
  },

  content: {
    padding: "40px 55px 220px",
    maxWidth: "1000px",
  },

  documentHeader: {
    marginBottom: "35px",

    paddingBottom: "20px",

    borderBottom: "1px solid #e5e7eb",
  },

  metadata: {
    color: "#667085",
    fontSize: "14px",
    marginTop: "8px",
  },

  section: {
    scrollMarginTop: "110px",

    marginBottom: "40px",

    padding: "5px 0 25px",

    borderBottom: "1px solid #eaecf0",
  },

  selectedSection: {
    background: "#f8fafc",

    padding: "15px",

    borderRadius: "8px",
  },

  sectionTitleRow: {
    display: "flex",

    justifyContent: "space-between",

    alignItems: "flex-start",

    gap: "20px",
  },

  sectionTitle: {
    margin: "0 0 15px",

    lineHeight: 1.4,
  },

  sectionPage: {
    flexShrink: 0,

    color: "#98a2b3",

    fontSize: "13px",

    paddingTop: "5px",
  },

  sectionContent: {
    color: "#475467",

    lineHeight: 1.8,

    fontSize: "16px",
  },

  noContent: {
    color: "#98a2b3",

    fontStyle: "italic",
  },

  button: {
    padding: "10px 16px",

    border: "none",

    borderRadius: "7px",

    background: "#2563eb",

    color: "#ffffff",

    cursor: "pointer",
  },

  center: {
    minHeight: "100vh",

    display: "flex",

    flexDirection: "column",

    alignItems: "center",

    justifyContent: "center",
  },

  qaPanel: {
    position: "fixed",
    bottom: "20px",
    left: "375px",
    right: "55px",
    maxWidth: "900px",

    padding: "18px 25px",

    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",

    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",

    zIndex: 20,
  },

  qaHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  qaTitle: {
    margin: 0,
  },

  hideButton: {
    padding: "6px 12px",
    border: "1px solid #d0d5dd",
    borderRadius: "6px",
    background: "#ffffff",
    color: "#344054",
    cursor: "pointer",
    fontSize: "13px",
  },

  qaDescription: {
    color: "#667085",
    fontSize: "14px",
  },

  questionRow: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },

  questionInput: {
    flex: 1,
    padding: "12px 14px",
    border: "1px solid #d0d5dd",
    borderRadius: "7px",
    fontSize: "15px",
    outline: "none",
  },

  askButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "7px",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: "600",
    cursor: "pointer",
  },

  answerBox: {
    marginTop: "25px",
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "8px",
  },
  source: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",

    padding: "12px 10px",

    border: "none",
    borderBottom: "1px solid #eaecf0",

    background: "transparent",

    textAlign: "left",

    fontSize: "14px",

    color: "#344054",

    cursor: "pointer",
  },
};

export default DocumentViewer;
