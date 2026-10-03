"use client";

import DashboardError from "./dashboard/error";

export default function GlobalError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <html lang="tr"><body><DashboardError {...props} /></body></html>;
}
