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
    console.error("#ERROR", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontFamily: "Inter" }}>
          <h1>Something went wrong</h1>
          <pre>{this.state.err.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

