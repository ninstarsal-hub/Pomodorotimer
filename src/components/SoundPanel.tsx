import { useEffect, useState } from 'react';
import { Pause, Play, Plus, Trash2, Volume2 } from 'lucide-react';
import { useStore } from '../store';
import { engine, SOUND_PRESETS, type NoiseType, type PadKey, type SoundParams } from '../lib/audio';
import { CURATED_MEDIA, toEmbed } from '../lib/content';
import { uid } from '../lib/storage';

export function SoundPanel() {
  const { soundParams, setSoundParams, soundPresetId, setSoundPresetId, soundPlaying, setSoundPlaying, customMedia, setCustomMedia, nowPlaying, setNowPlaying, settings, setSettings } =
    useStore();
  const [advanced, setAdvanced] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');

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

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmbed(linkUrl)) {
      setLinkError('Paste a YouTube, Spotify or SoundCloud link.');
      return;
    }
    setCustomMedia((m) => [...m, { id: uid(), name: linkName.trim() || 'My playlist', url: linkUrl.trim() }]);
    setLinkName('');
    setLinkUrl('');
    setLinkError('');
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
          {customMedia.map((m) => (
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
        <form className="stack-sm" onSubmit={addLink}>
          <input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Name (e.g. My study playlist)" aria-label="Link name" />
          <div className="row">
            <input className="grow" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="YouTube / Spotify / SoundCloud link" aria-label="Link URL" />
            <button className="btn primary" type="submit" aria-label="Add link">
              <Plus size={16} />
            </button>
          </div>
          {linkError && <p className="error small">{linkError}</p>}
        </form>
        <p className="muted small">Spotify plays 30-second previews unless you’re logged in to Spotify in this browser.</p>
      </section>
    </div>
  );
}
