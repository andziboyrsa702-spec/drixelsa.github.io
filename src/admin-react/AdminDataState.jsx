import React from 'react';
export default function AdminDataState({loading, error, retry}) {
  if (error) return <section className="ra-panel ra-data-state" role="alert">
    <p className="ra-eyebrow">DATA CONNECTION</p><h2>Unable to load this workspace</h2>
    <p>{error}</p><button type="button" onClick={retry}>Try again</button>
  </section>;
  if (loading) return <section className="ra-panel ra-data-state" role="status" aria-live="polite">
    <span className="ra-loading-mark" aria-hidden="true"/><h2>Loading your workspace</h2>
    <p>Connecting to your store records…</p>
  </section>;
  return null;
}
