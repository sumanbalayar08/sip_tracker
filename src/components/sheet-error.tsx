export function SheetError({ error }: { error: string }) {
  return (
    <section role="alert" className="rounded-lg border border-bad/40 bg-surface p-5">
      <h2 className="font-semibold text-bad">Couldn&apos;t read your Google Sheet</h2>
      <p className="mt-2 font-mono text-sm break-words text-ink-muted">{error}</p>
      <p className="mt-2 text-sm text-ink-muted">
        Check the env vars in <code>.env.local</code> (or Vercel), and that the sheet is shared with the service-account
        email as Editor. Run <code>pnpm sheet:init</code> to create the tabs.
      </p>
    </section>
  );
}
