import type { Card, Deck, Diagram } from './types';

export const diagramBlobKey = (id: string) => `diagram:${id}`;

/** One "name the hidden part" question per labelled box. */
export function diagramCards(diagrams: Diagram[], decks: Deck[]): Card[] {
  const ids = new Set(decks.map((d) => d.id));
  return diagrams
    .filter((d) => ids.has(d.deckId))
    .flatMap((d) =>
      d.boxes
        .filter((b) => b.label.trim())
        .map(
          (b): Card => ({
            id: `${d.deckId}:img-${d.id}-${b.id}`,
            deckId: d.deckId,
            kind: 'qa',
            front: `${d.title}: name the highlighted part`,
            back: b.label.trim(),
            section: d.section,
            ask: true,
            image: { diagramId: d.id, boxId: b.id },
          }),
        ),
    );
}
