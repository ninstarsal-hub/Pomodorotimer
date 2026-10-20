import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useStore } from '../store';
import { ACCENTS, BACKGROUND_PRESETS } from '../lib/content';
import { putBlob } from '../lib/storage';
import { InstallSection } from './InstallUI';
import { AccountSection } from './Account';
import { WhatsNewSection } from './WhatsNew';
import { Scene, SCENES } from './Scenes';
import { exportBackup, lastBackupAt, readBackup, restoreBackup } from '../lib/backup';
import type { Settings } from '../lib/types';

export function SettingsPanel() {
  const { settings, setSettings, setUploadVersion } = useStore();
  const [url, setUrl] = useState(settings.background.kind === 'url' ? settings.background.url : '');
  const imgRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const bg = settings.background;

  const upload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert('Please choose an image under 15 MB.');
      return;
    }
    try {
      await putBlob('background', file);
      set('background', { ...bg, kind: 'upload' });
      setUploadVersion((v) => v + 1);
    } catch {
      alert('Could not save that image in this browser.');
    }
  };

  const [backupMsg, setBackupMsg] = useState('');
  const [last, setLast] = useState(lastBackupAt);

  const exportData = async () => {
    try {
      await exportBackup();
      setLast(lastBackupAt());
      setBackupMsg('Backup saved to your downloads.');
    } catch {
      setBackupMsg('Could not create the backup in this browser.');
    }
  };

  const importData = async (file: File) => {
    try {
      const { backup, summary } = await readBackup(file);
      const what = `${summary.notes} set${summary.notes === 1 ? '' : 's'} of notes, ${summary.exams} exam${summary.exams === 1 ? '' : 's'}, ${summary.sessions} focus session${summary.sessions === 1 ? '' : 's'}`;
      if (!confirm(`Restore this backup${summary.date ? ` from ${summary.date}` : ''}?\n\nIt contains ${what}.\n\nThis replaces everything currently in Stillpoint on this browser.`)) return;
      await restoreBackup(backup);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'That file is not a valid Stillpoint backup.');
    }
  };

  return (
    <div className="stack">
      <AccountSection />
      <section className="card">
        <div className="eyebrow">Timer</div>
        <div className="num-grid">
          <Num label="Focus" value={settings.focusMin} min={1} max={180} onChange={(v) => set('focusMin', v)} />
          <Num label="Short break" value={settings.shortMin} min={1} max={60} onChange={(v) => set('shortMin', v)} />
          <Num label="Long break" value={settings.longMin} min={1} max={90} onChange={(v) => set('longMin', v)} />
          <Num label="Long break every" value={settings.longEvery} min={2} max={8} unit="blocks" onChange={(v) => set('longEvery', v)} />
        </div>
        <Toggle label="Auto-start breaks" checked={settings.autoStartBreaks} onChange={(v) => set('autoStartBreaks', v)} />
        <Toggle label="Auto-start next focus block" checked={settings.autoStartFocus} onChange={(v) => set('autoStartFocus', v)} />
        <Toggle label="Recommended break plan (doodle → walk → rest → recharge)" checked={settings.breakPlan} onChange={(v) => set('breakPlan', v)} />
        <Toggle label="Notice time spent in other tabs during focus (you choose whether it was studying)" checked={settings.awayTracking} onChange={(v) => set('awayTracking', v)} />
        <Toggle label="Desktop notifications" checked={settings.notifications} onChange={(v) => set('notifications', v)} />
        <label className="slider-row">
          <span className="small">Chime</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.chimeVolume} onChange={(e) => set('chimeVolume', Number(e.target.value))} aria-label="Chime volume" />
        </label>
      </section>

      <section className="card">
        <div className="eyebrow">Goals</div>
        <div className="num-grid">
          <Num label="Daily focus goal" value={settings.dailyGoalMin} min={0} max={720} onChange={(v) => set('dailyGoalMin', v)} />
          <Num label="Weekly focus goal" value={settings.weeklyGoalMin} min={0} max={5000} onChange={(v) => set('weeklyGoalMin', v)} />
        </div>
        <p className="muted small">Your streak counts days you hit the daily goal. Set a goal to 0 to turn it off.</p>
      </section>

      <section className="card">
        <div className="eyebrow">Learning</div>
        <label className="select-row">
          <span>Recall checkpoint during focus</span>
          <select value={settings.checkpointMin} onChange={(e) => set('checkpointMin', Number(e.target.value))}>
            <option value={0}>Off</option>
            <option value={10}>After 10 min</option>
            <option value={12}>After 12 min</option>
            <option value={15}>After 15 min</option>
            <option value={20}>After 20 min</option>
            <option value={30}>After 30 min</option>
            <option value={45}>After 45 min</option>
          </select>
        </label>
        {settings.checkpointMin >= settings.focusMin && settings.checkpointMin > 0 && <p className="muted small">The checkpoint is longer than your focus block, so it won’t appear.</p>}
        <Toggle label="Warm-up questions when starting a block" checked={settings.warmupQuiz} onChange={(v) => set('warmupQuiz', v)} />
        <Toggle label="Reflect after each focus block" checked={settings.reflectAfterFocus} onChange={(v) => set('reflectAfterFocus', v)} />
      </section>

      <section className="card">
        <div className="eyebrow">Appearance</div>
        <div className="field-label">Theme</div>
        <div className="segmented three" role="radiogroup" aria-label="Theme">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button key={t} role="radio" aria-checked={settings.theme === t} className={settings.theme === t ? 'is-active' : ''} onClick={() => set('theme', t)}>
              {t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'Match my device'}
            </button>
          ))}
        </div>
        <div className="field-label">Text & interface size</div>
        <div className="segmented three" role="radiogroup" aria-label="Interface size">
          {[
            [1, 'Normal'],
            [1.1, 'Large'],
            [1.2, 'Larger'],
          ].map(([v, l]) => (
            <button key={v} role="radio" aria-checked={settings.textScale === v} className={settings.textScale === v ? 'is-active' : ''} onClick={() => set('textScale', v as number)}>
              {l}
            </button>
          ))}
        </div>
        <div className="field-label">Accent</div>
        <div className="swatches">
          {ACCENTS.map((a) => (
            <button key={a.id} className={`swatch ${settings.accent === a.value ? 'is-active' : ''}`} style={{ background: a.value }} onClick={() => set('accent', a.value)} aria-label={`Accent ${a.id}`} />
          ))}
        </div>
        <div className="field-label">Scenes</div>
        <div className="bg-grid scenes">
          {SCENES.map((p) => (
            <button key={p.id} className={`bg-thumb scene-thumb ${bg.kind === 'preset' && bg.preset === p.id ? 'is-active' : ''}`} onClick={() => set('background', { ...bg, kind: 'preset', preset: p.id })}>
              <Scene id={p.id} animate={false} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        <Toggle label="Gentle motion in scenes (drifting clouds, steam, twinkling)" checked={settings.sceneMotion} onChange={(v) => set('sceneMotion', v)} />
        <div className="field-label">Colours & ambience</div>
        <div className="bg-grid">
          {BACKGROUND_PRESETS.map((p) => (
            <button key={p.id} className={`bg-thumb thumb-${p.id} ${bg.kind === 'preset' && bg.preset === p.id ? 'is-active' : ''}`} onClick={() => set('background', { ...bg, kind: 'preset', preset: p.id })}>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) set('background', { ...bg, kind: 'url', url: url.trim() });
          }}
        >
          <input className="grow" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Image or GIF URL" aria-label="Background image URL" />
          <button className="btn" type="submit">
            Use
          </button>
        </form>
        <button className="btn" onClick={() => imgRef.current?.click()}>
          <Upload size={14} /> Upload your own image
        </button>
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = '';
          }}
        />
        <label className="slider-row">
          <span className="small">Dim</span>
          <input type="range" min={0} max={0.9} step={0.01} value={settings.dim} onChange={(e) => set('dim', Number(e.target.value))} aria-label="Background dim" />
        </label>
        <label className="slider-row">
          <span className="small">Blur</span>
          <input type="range" min={0} max={24} step={1} value={settings.blur} onChange={(e) => set('blur', Number(e.target.value))} aria-label="Background blur (images)" />
        </label>
      </section>

      <InstallSection />

      <section className="card">
        <div className="eyebrow">Your data</div>
        <p className="muted small">
          Everything is stored privately in this browser only — no account. If you clear your browser data or switch computers, it’s gone unless you have a backup. A backup is one file with your notes, progress, exams and settings;
          import it on another computer or browser to carry on there.
        </p>
        <p className="small">{last ? `Last backup: ${new Date(last).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'You haven’t made a backup yet.'}</p>
        <div className="row wrap">
          <button className="btn primary" onClick={() => void exportData()}>
            <Download size={14} /> Export backup
          </button>
          <button className="btn" onClick={() => importRef.current?.click()}>
            <Upload size={14} /> Import backup
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importData(f);
              e.target.value = '';
            }}
          />
        </div>
        {backupMsg && <p className="small accent">{backupMsg}</p>}
      </section>

      <WhatsNewSection />
    </div>
  );
}

function Num({ label, value, min, max, unit = 'min', onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="num">
      <span className="muted small">{label}</span>
      <span className="num-input">
        <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Math.round(Number(e.target.value)) || min)))} />
        <em>{unit}</em>
      </span>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
