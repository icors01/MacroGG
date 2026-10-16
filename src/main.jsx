import React from "react";
import ReactDOM from "react-dom/client";
import { StartupBoundary, StartupFailure } from "./components/StartupBoundary";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
// Demo is development-only and imports no Firebase configuration or services.
const appModule =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo")
    ? import("./DemoApp.jsx")
    : import("./App.jsx");

appModule
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <StartupBoundary>
          <App />
        </StartupBoundary>
      </React.StrictMode>,
    );
  })
  .catch((error) => {
    root.render(<StartupFailure error={error} />);
  });
