import React from "react";

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err?: Error }
> {
  constructor(p: { children: React.ReactNode }) {
    super(p);
    this.state = {};
  }
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[BOOT] Error boundary caught error:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ 
          padding: 24, 
          fontFamily: "Inter, sans-serif",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f4f6",
          color: "#15383c"
        }}>
          <div style={{
            maxWidth: 600,
            padding: 32,
            backgroundColor: "white",
            borderRadius: 12,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <h1 style={{ 
              fontSize: "24px", 
              fontWeight: "bold",
              marginBottom: 16,
              color: "#e35e25"
            }}>
              Something went wrong
            </h1>
            <pre style={{ 
              padding: 16,
              backgroundColor: "#f9fafb",
              borderRadius: 8,
              overflow: "auto",
              fontSize: "14px",
              marginBottom: 24,
              border: "1px solid #e5e7eb"
            }}>
              {this.state.err.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 24px",
                backgroundColor: "#e35e25",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#d14a1f"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#e35e25"}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

