import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "../App";
import { AppErrorBoundary } from "./utils/AppErrorBoundary";
import "../index.css";

const el = document.getElementById("root");
if (!el) {
  console.error("#BOOT: #root not found");
  throw new Error("Root element missing");
}

createRoot(el).render(
  <StrictMode>
    <AppErrorBoundary>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </AppErrorBoundary>
  </StrictMode>
);

