type AliceErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type AliceEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: AliceErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __aliceEvents?: AliceEvents;
  }
}

export function reportAliceError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__aliceEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
