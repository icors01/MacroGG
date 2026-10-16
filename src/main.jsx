import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Demo is development-only and imports no Firebase configuration or services.
const appModule =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo")
    ? import("./DemoApp.jsx")
    : import("./App.jsx");

appModule.then(({ default: App }) => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
