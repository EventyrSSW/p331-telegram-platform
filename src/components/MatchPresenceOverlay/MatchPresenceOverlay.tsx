import { useNakama, PresenceInfo } from '../../contexts/NakamaContext';
import styles from './MatchPresenceOverlay.module.css';

interface MatchPresenceOverlayProps {
  className?: string;
}

export function MatchPresenceOverlay({ className }: MatchPresenceOverlayProps) {
  const { match, session } = useNakama();

  // Only show when in a match
  if (!match.matchId || match.status === 'idle') {
    return null;
  }

  const presences = Object.values(match.presences);
  const myUserId = session?.user_id;

  // Sort: current user first, then others
  const sortedPresences = [...presences].sort((a, b) => {
    if (a.userId === myUserId) return -1;
    if (b.userId === myUserId) return 1;
    return 0;
  });

  // Always show 2 slots (for PVP)
  const slots: (PresenceInfo | null)[] = [
    sortedPresences[0] || null,
    sortedPresences[1] || null,
  ];

  return (
    <div className={`${styles.overlay} ${className || ''}`}>
      <div className={styles.presenceList}>
        {slots.map((presence, index) => (
          <div
            key={presence?.userId || `empty-${index}`}
            className={`${styles.presenceItem} ${presence?.isOnline === false ? styles.offline : ''}`}
          >
            {presence ? (
              <>
                <div className={styles.avatarWrapper}>
                  {presence.avatarUrl ? (
                    <img
                      src={presence.avatarUrl}
                      alt={presence.username}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {presence.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    className={`${styles.statusDot} ${presence.isOnline ? styles.online : styles.disconnected}`}
                  />
                </div>
                <span className={styles.username}>
                  {presence.userId === myUserId ? 'You' : presence.username}
                </span>
              </>
            ) : (
              <div className={styles.emptySlot}>
                <div className={styles.avatarPlaceholder}>?</div>
                <span className={styles.waitingText}>Waiting...</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.matchInfo}>
        <span className={styles.matchType}>{match.matchType || 'Match'}</span>
        <span className={styles.matchStatus}>{match.status}</span>
      </div>
    </div>
  );
}
