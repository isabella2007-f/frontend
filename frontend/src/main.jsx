import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./routes/AppRouter";

console.log("Root:", document.getElementById("root")); // <-- esto debe imprimir <div id="root"></div>

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);