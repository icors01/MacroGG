import React from "react";

export function StartupFailure({ error }) {
  const isDevelopment = import.meta.env.DEV;
  const isDemo = new URLSearchParams(window.location.search).has("demo");
  const missingFirebase = error?.code === "auth/invalid-api-key";
  return (
    <main className="startup-screen">
      <section className="surface startup-card" role="alert">
        <p className="eyebrow">MACROGG</p>
        <h1>
          {isDevelopment && missingFirebase
            ? "Open the sample-data preview."
            : "MacroGG couldn’t start."}
        </h1>
        <p className="muted">
          {isDevelopment && missingFirebase
            ? "This address opens the connected app, which needs Firebase settings. The demo lets you try the design and recommendations without any setup or real account data."
            : isDevelopment
              ? "Try reloading the page. If it still does not open, check the error details below or share them for troubleshooting."
              : "Try reloading the page. If this keeps happening, report that the app could not open."}
        </p>
        <div className="startup-actions">
          {isDevelopment && !isDemo && (
            <a
              className="button button-primary"
              href={`${window.location.pathname}?demo`}
            >
              Open demo
            </a>
          )}
          <button
            type="button"
            className="button button-secondary"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
        {isDevelopment && (
          <details>
            <summary>Technical details</summary>
            <pre>{error?.message || "Unknown startup error"}</pre>
            <p>
              For the connected app, configure <code>.env.local</code> using{" "}
              <code>.env.example</code>, then restart the development server.
            </p>
          </details>
        )}
      </section>
    </main>
  );
}

export class StartupBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <StartupFailure error={this.state.error} />
    ) : (
      this.props.children
    );
  }
}
