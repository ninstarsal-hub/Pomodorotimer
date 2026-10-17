import { useState } from 'react';
import { ChevronDown, ExternalLink, Music, X } from 'lucide-react';
import { useStore } from '../store';

/** Keeps the embedded player alive while panels open and close. */
export function MediaDock() {
  const { nowPlaying, setNowPlaying } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  if (!nowPlaying) return null;
  // Some channels block playback on other sites — offer the original YouTube page as a fallback.
  const yt = nowPlaying.embed.match(/youtube\.com\/embed\/([\w-]{6,})/);
  const watchUrl = yt && yt[1] !== 'videoseries' ? `https://www.youtube.com/watch?v=${yt[1]}` : null;
  const tall = nowPlaying.embed.includes('spotify') ? 152 : nowPlaying.embed.includes('soundcloud') ? 120 : 158;
  return (
    <div className={`media-dock fade-zen ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="media-dock-head">
        <Music size={14} />
        <span className="truncate">{nowPlaying.name}</span>
        {watchUrl && (
          <a className="icon-btn small" href={watchUrl} target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube" title="Open on YouTube (if it won’t play here)">
            <ExternalLink size={13} />
          </a>
        )}
        <button className="icon-btn small" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand player' : 'Collapse player'}>
          <ChevronDown size={14} style={{ transform: collapsed ? 'rotate(180deg)' : undefined }} />
        </button>
        <button className="icon-btn small" onClick={() => setNowPlaying(null)} aria-label="Stop and close player">
          <X size={14} />
        </button>
      </div>
      <iframe
        key={nowPlaying.embed}
        src={nowPlaying.embed}
        title={nowPlaying.name}
        height={tall}
        allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
