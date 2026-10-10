export function PreviewPane({
  title,
  sourceUrl,
  fallback,
}: {
  title: string | null;
  sourceUrl: string | null;
  fallback: string | null;
}) {
  return (
    <section className="card" aria-label="Preview">
      <h2>Preview</h2>
      {title ? <p className="preview">{title}</p> : <p className="preview">Nothing selected</p>}
      {sourceUrl ? (
        <video className="player" controls src={sourceUrl} />
      ) : (
        <p className="note">{fallback ?? 'Select a log row to play it.'}</p>
      )}
      {sourceUrl ? <p className="note">{sourceUrl}</p> : null}
    </section>
  );
}
