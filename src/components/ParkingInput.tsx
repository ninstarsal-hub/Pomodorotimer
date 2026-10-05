import { useState } from 'react';
import { SquareParking } from 'lucide-react';
import { useStore } from '../store';
import { uid } from '../lib/storage';

/** Quick capture for stray thoughts so they don't pull you out of focus. */
export function ParkingInput({ onOpen }: { onOpen: () => void }) {
  const { distractions, setDistractions } = useStore();
  const [text, setText] = useState('');
  const [flash, setFlash] = useState(false);
  const count = distractions.filter((d) => !d.done).length;

  return (
    <form
      className={`parking ${flash ? 'is-flash' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setDistractions((ds) => [...ds, { id: uid(), text: text.trim(), at: Date.now(), done: false }]);
        setText('');
        setFlash(true);
        window.setTimeout(() => setFlash(false), 600);
      }}
    >
      <button type="button" className="parking-icon" onClick={onOpen} aria-label="Open parking lot" title="Parking lot">
        <SquareParking size={16} strokeWidth={1.6} />
        {count > 0 && <span className="badge">{count}</span>}
      </button>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Distracting thought? Park it here and keep going…" aria-label="Park a distracting thought" />
    </form>
  );
}
