import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><App /></AuthProvider>
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#202024", color: "#fff", border: "1px solid #37373d" } }} />
    </BrowserRouter>
  </React.StrictMode>,
);
