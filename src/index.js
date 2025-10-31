import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext";
import { QueryClientProvider } from "./providers/QueryClientProvider";
import { ToastProvider } from "./components/Toast";
import AppRouter from "./Router";
import "./tailwind-output.css";
import "./styles/animations.css";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <QueryClientProvider>
      <ToastProvider>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>
);
