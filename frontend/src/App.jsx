import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

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
      setError("Could not connect to the Document AI backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Document AI</h1>
          <p style={styles.subtitle}>
            Explore, search, and ask questions about your documents.
          </p>
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
            style={styles.uploadButton}
          >
            {uploading ? "Processing..." : "Upload PDF"}
          </button>
        </>{" "}
      </header>

      <main style={styles.main}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.heading}>Your Documents</h2>
            <p style={styles.description}>
              Documents processed by the Document AI system.
            </p>
          </div>

          <button onClick={fetchDocuments} style={styles.refreshButton}>
            Refresh
          </button>
        </div>

        {loading && <div style={styles.message}>Loading documents...</div>}

        {uploadError && <div style={styles.error}>{uploadError}</div>}
        
        {!loading && !error && documents.length === 0 && (
          <div style={styles.empty}>
            <h3>No documents yet</h3>
            <p>Upload a PDF to start exploring it.</p>
          </div>
        )}

        <div style={styles.grid}>
          {documents.map((document) => (
            <div key={document.document_id} style={styles.card}>
              <div style={styles.icon}>PDF</div>
              <h3 style={styles.filename}>{document.filename}</h3>
              <div style={styles.stats}>
                <span>{document.page_count} pages</span>
                <span>{document.section_count} sections</span>
                <span>{document.chunk_count} chunks</span>
              </div>
              <button
                onClick={() => navigate(`/documents/${document.document_id}`)}
                style={styles.viewButton}
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

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "28px 48px",
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },

  title: {
    margin: 0,
    fontSize: "30px",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#667085",
  },

  uploadButton: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 20px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },

  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 32px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },

  heading: {
    margin: 0,
    fontSize: "24px",
  },

  description: {
    marginTop: "6px",
    color: "#667085",
  },

  refreshButton: {
    padding: "9px 16px",
    border: "1px solid #d0d5dd",
    borderRadius: "7px",
    background: "#ffffff",
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "22px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
  },

  icon: {
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: "12px",
    fontWeight: "700",
  },

  filename: {
    margin: "18px 0 14px",
    fontSize: "17px",
    wordBreak: "break-word",
  },

  stats: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    color: "#667085",
    fontSize: "14px",
    marginBottom: "20px",
  },

  viewButton: {
    width: "100%",
    padding: "10px",
    border: "none",
    borderRadius: "7px",
    background: "#172033",
    color: "#ffffff",
    cursor: "pointer",
  },

  message: {
    padding: "30px",
    textAlign: "center",
    color: "#667085",
  },

  error: {
    padding: "16px",
    borderRadius: "8px",
    background: "#fef2f2",
    color: "#b42318",
    marginBottom: "20px",
  },

  empty: {
    padding: "60px 20px",
    textAlign: "center",
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px dashed #d0d5dd",
  },
};

export default App;
