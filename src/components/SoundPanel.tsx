import { useEffect, useState } from 'react';
import { Pause, Play, Plus, Trash2, Volume2 } from 'lucide-react';
import { useStore } from '../store';
import { engine, SOUND_PRESETS, type NoiseType, type PadKey, type SoundParams } from '../lib/audio';
import { BREAK_MEDIA, CURATED_MEDIA, PRODUCTIVITY_FM, PRODUCTIVITY_FM_CHANNEL, toEmbed } from '../lib/content';
import { usePersistentState } from '../lib/storage';
import { BEAT_STYLES, beats } from '../lib/beats';
import { BeatPicker } from './BreakCard';
import { uid } from '../lib/storage';

export function SoundPanel() {
  const { soundParams, setSoundParams, soundPresetId, setSoundPresetId, soundPlaying, setSoundPlaying, customMedia, setCustomMedia, nowPlaying, setNowPlaying, settings, setSettings } =
    useStore();
  const [advanced, setAdvanced] = useState(false);
  const [pfmOpen, setPfmOpen] = usePersistentState('pfmOpen', false);

  useEffect(() => {
    engine.update(soundParams);
  }, [soundParams]);

  const toggle = () => {
    if (soundPlaying) {
      engine.stop();
      setSoundPlaying(false);
    } else {
      void engine.play(soundParams);
      setSoundPlaying(true);
    }
  };

  const pickPreset = (id: string) => {
    const p = SOUND_PRESETS.find((x) => x.id === id)!;
    const params = { ...p.params, volume: soundParams.volume };
    setSoundPresetId(id);
    setSoundParams(params);
    if (!soundPlaying) {
      void engine.play(params);
      setSoundPlaying(true);
    }
  };

  const set = <K extends keyof SoundParams>(k: K, v: SoundParams[K]) => {
    setSoundParams((p) => ({ ...p, [k]: v }));
    setSoundPresetId('custom');
  };

  const playMedia = (name: string, url: string) => {
    const embed = toEmbed(url);
    if (embed) setNowPlaying({ name, embed });
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="row between">
          <div>
            <div className="eyebrow">Focus sounds</div>
            <h3 className="card-title">{SOUND_PRESETS.find((p) => p.id === soundPresetId)?.name ?? 'Custom mix'}</h3>
          </div>
          <button className={`play-btn ${soundPlaying ? 'is-playing' : ''}`} onClick={toggle} aria-label={soundPlaying ? 'Pause focus sounds' : 'Play focus sounds'}>
            {soundPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>
        <label className="slider-row">
          <Volume2 size={16} className="muted" />
          <input type="range" min={0} max={1} step={0.01} value={soundParams.volume} onChange={(e) => setSoundParams((p) => ({ ...p, volume: Number(e.target.value) }))} aria-label="Volume" />
        </label>
        <div className="preset-grid">
          {SOUND_PRESETS.map((p) => (
            <button key={p.id} className={`preset ${soundPresetId === p.id ? 'is-active' : ''}`} onClick={() => pickPreset(p.id)}>
              <strong>{p.name}</strong>
              <span>{p.blurb}</span>
            </button>
          ))}
        </div>
        <label className="toggle-row">
          <input type="checkbox" checked={settings.syncSoundWithTimer} onChange={(e) => setSettings((s) => ({ ...s, syncSoundWithTimer: e.target.checked }))} />
          <span>Play only during focus blocks (auto-pause on breaks)</span>
        </label>
        <button className="link-btn" onClick={() => setAdvanced((a) => !a)}>
          {advanced ? 'Hide mixer' : 'Open mixer'}
        </button>
        {advanced && (
          <div className="mixer">
            <label>
              <span>Noise</span>
              <select value={soundParams.noise} onChange={(e) => set('noise', e.target.value as NoiseType)}>
                <option value="off">Off</option>
                <option value="brown">Brown</option>
                <option value="pink">Pink</option>
                <option value="white">White</option>
                <option value="rain">Rain</option>
                <option value="cafe">Café</option>
                <option value="fire">Fireplace</option>
                <option value="ocean">Ocean</option>
              </select>
              <input type="range" min={0} max={1} step={0.01} value={soundParams.noiseLevel} onChange={(e) => set('noiseLevel', Number(e.target.value))} aria-label="Noise level" />
            </label>
            <label>
              <span>Pad</span>
              <select value={soundParams.pad} onChange={(e) => set('pad', e.target.value as PadKey)}>
                <option value="off">Off</option>
                <option value="calm">Calm (A minor)</option>
                <option value="bright">Bright (C major)</option>
                <option value="deep">Deep (D minor)</option>
              </select>
              <input type="range" min={0} max={1} step={0.01} value={soundParams.padLevel} onChange={(e) => set('padLevel', Number(e.target.value))} aria-label="Pad level" />
            </label>
            <label>
              <span>Modulation</span>
              <select value={soundParams.modRate} onChange={(e) => set('modRate', Number(e.target.value))}>
                <option value={0}>Off</option>
                <option value={6}>6 Hz · theta</option>
                <option value={10}>10 Hz · alpha</option>
                <option value={16}>16 Hz · beta</option>
                <option value={40}>40 Hz · gamma</option>
              </select>
              <input type="range" min={0} max={0.5} step={0.01} value={soundParams.modDepth} onChange={(e) => set('modDepth', Number(e.target.value))} aria-label="Modulation depth" />
            </label>
            <label>
              <span>Binaural</span>
              <select value={soundParams.binaural} onChange={(e) => set('binaural', Number(e.target.value))}>
                <option value={0}>Off</option>
                <option value={10}>10 Hz</option>
                <option value={15}>15 Hz</option>
                <option value={40}>40 Hz</option>
              </select>
              <input type="range" min={0} max={1} step={0.01} value={soundParams.binauralLevel} onChange={(e) => set('binauralLevel', Number(e.target.value))} aria-label="Binaural level" />
            </label>
          </div>
        )}
        <details className="research">
          <summary>What does the research say?</summary>
          <p>
            Steady noise masks unpredictable sounds (voices, traffic) that break concentration. Amplitude-modulated audio — the approach used by apps like brain.fm — has early evidence for improving sustained attention, especially for
            people who get distracted easily. Effects are modest and individual, so treat it as an experiment: try a preset for a week and check your Progress stats.
          </p>
          <p>Music with lyrics competes with reading and writing for language processing (the “irrelevant speech effect”), so prefer instrumental audio for verbal work. Keep the volume low — background, not foreground.</p>
        </details>
      </section>

      <section className="card">
        <div className="eyebrow">Music & streams</div>
        <p className="muted small">Focus sounds keep playing under music — e.g. Rain Room + a lofi stream. Turn the focus-sound volume down a little so the music stays on top.</p>
        {nowPlaying && (
          <p className="small">
            Now playing: <strong>{nowPlaying.name}</strong>{' '}
            <button className="link-btn" onClick={() => setNowPlaying(null)}>
              Stop
            </button>
          </p>
        )}
        <ul className="media-list">
          {CURATED_MEDIA.map((m) => (
            <li key={m.id}>
              <button className={`media-item ${nowPlaying?.name === m.name ? 'is-active' : ''}`} onClick={() => playMedia(m.name, m.url)}>
                <Play size={14} />
                <span>
                  <strong>{m.name}</strong>
                  <em>{m.note}</em>
                </span>
              </button>
            </li>
          ))}
          <li>
            <details className="media-group" open={pfmOpen} onToggle={(e) => setPfmOpen((e.target as HTMLDetailsElement).open)}>
              <summary>
                <span>
                  <strong>productivity.fm</strong>
                  <em>Minimal house & ambient mixes for deep work · {PRODUCTIVITY_FM.length} videos</em>
                </span>
              </summary>
              <ul className="media-list">
                {PRODUCTIVITY_FM.map((m) => (
                  <li key={m.id}>
                    <button className={`media-item ${nowPlaying?.name === m.name ? 'is-active' : ''}`} onClick={() => playMedia(m.name, m.url)}>
                      <Play size={14} />
                      <span>
                        <strong>{m.name}</strong>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <a className="link-btn small" href={PRODUCTIVITY_FM_CHANNEL} target="_blank" rel="noopener noreferrer">
                More on their YouTube channel →
              </a>
            </details>
          </li>
          {customMedia.filter((m) => m.kind !== 'break').map((m) => (
            <li key={m.id} className="row">
              <button className={`media-item grow ${nowPlaying?.name === m.name ? 'is-active' : ''}`} onClick={() => playMedia(m.name, m.url)}>
                <Play size={14} />
                <span>
                  <strong>{m.name}</strong>
                  <em>Your link</em>
                </span>
              </button>
              <button className="icon-btn small" onClick={() => setCustomMedia((ms) => ms.filter((x) => x.id !== m.id))} aria-label="Remove link">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <LinkForm placeholder="Name (e.g. My study playlist)" onAdd={(name, url) => setCustomMedia((m) => [...m, { id: uid(), name, url }])} />
        <p className="muted small">Spotify plays 30-second previews unless you’re logged in to Spotify in this browser.</p>
      </section>

      <BreakMusic playMedia={playMedia} />
    </div>
  );
}

function MediaRow({ name, note, url, active, onPlay, onRemove }: { name: string; note: string; url: string; active: boolean; onPlay: (name: string, url: string) => void; onRemove?: () => void }) {
  return (
    <li className="row">
      <button className={`media-item grow ${active ? 'is-active' : ''}`} onClick={() => onPlay(name, url)}>
        <Play size={14} />
        <span>
          <strong>{name}</strong>
          <em>{note}</em>
        </span>
      </button>
      {onRemove && (
        <button className="icon-btn small" onClick={onRemove} aria-label="Remove link">
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
}

function LinkForm({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string, url: string) => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmbed(url)) {
      setError('Paste a YouTube, Spotify or SoundCloud link.');
      return;
    }
    onAdd(name.trim() || 'My playlist', url.trim());
    setName('');
    setUrl('');
    setError('');
  };
  return (
    <form className="stack-sm" onSubmit={submit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} aria-label="Link name" />
      <div className="row">
        <input className="grow" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube / Spotify / SoundCloud link" aria-label="Link URL" />
        <button className="btn primary" type="submit" aria-label="Add link">
          <Plus size={16} />
        </button>
      </div>
      {error && <p className="error small">{error}</p>}
    </form>
  );
}

function BreakMusic({ playMedia }: { playMedia: (name: string, url: string) => void }) {
  const { settings, setSettings, customMedia, setCustomMedia, nowPlaying } = useStore();
  const mine = customMedia.filter((m) => m.kind === 'break');
  return (
    <section className="card">
      <div className="eyebrow">Break music</div>
      <p className="muted small">Something upbeat for your breaks — lyrics welcome here. Break beats are made live in your browser, so they’re free, endless and work offline.</p>
      <BeatPicker />
      <label className="slider-row">
        <Volume2 size={16} className="muted" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.beatVolume}
          onChange={(e) => {
            const v = Number(e.target.value);
            beats.setVolume(v);
            setSettings((s) => ({ ...s, beatVolume: v }));
          }}
          aria-label="Break beats volume"
        />
      </label>
      <label className="select-row">
        <span>Auto-play on breaks</span>
        <select value={settings.breakBeats} onChange={(e) => setSettings((s) => ({ ...s, breakBeats: e.target.value as typeof s.breakBeats }))} aria-label="Auto-play break beats">
          <option value="off">Off</option>
          {BEAT_STYLES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <p className="muted small">Break beats stop by themselves when your next focus block starts.</p>
      <ul className="media-list">
        {BREAK_MEDIA.map((m) => (
          <MediaRow key={m.id} name={m.name} note={m.note} url={m.url} active={nowPlaying?.name === m.name} onPlay={playMedia} />
        ))}
        {mine.map((m) => (
          <MediaRow key={m.id} name={m.name} note="Your break link" url={m.url} active={nowPlaying?.name === m.name} onPlay={playMedia} onRemove={() => setCustomMedia((ms) => ms.filter((x) => x.id !== m.id))} />
        ))}
      </ul>
      <LinkForm placeholder="Name (e.g. My hype playlist)" onAdd={(name, url) => setCustomMedia((m) => [...m, { id: uid(), name, url, kind: 'break' }])} />
      <details className="research">
        <summary>Why music on breaks?</summary>
        <p>
          Listening to music you enjoy raises mood and arousal, and that lift carries into the next task (the “arousal–mood” account of the so-called Mozart effect). On breaks there’s no reading to compete with, so songs with lyrics are fine — just
          switch back to instrumental audio when you focus again.
        </p>
      </details>
    </section>
  );
}
