export function DesignerShell() {
  return (
    <>
      <header className="top">
        <h1>Channel designer</h1>
        <span>frame only · Nest is still port 3000</span>
      </header>
      <main className="board">
        <section className="card" aria-label="Works">
          <h2>Works</h2>
          <p className="note">
            Playable URLs will list here. A work with no asset is unclassified,
            not a theme slot.
          </p>
        </section>
        <section className="card" aria-label="Clock">
          <h2>Clock</h2>
          <article className="slot">
            <strong>Theme slot</strong>
            <span>No work yet. The title is still undecided.</span>
          </article>
        </section>
        <section className="card" aria-label="Preview">
          <h2>Preview</h2>
          <p className="preview">Nothing selected</p>
          <p className="note">
            The pane follows the slot you are editing. It is not a player.
          </p>
        </section>
      </main>
    </>
  );
}
