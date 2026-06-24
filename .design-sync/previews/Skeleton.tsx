import { Skeleton } from 'winesnob-design-system';

export const BottlePlaceholder = () => (
  <div
    style={{
      background: 'var(--ws-surface)',
      border: '0.5px solid var(--ws-border)',
      borderRadius: 'var(--ws-radius-lg)',
      padding: 24,
      maxWidth: 360,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
  >
    <Skeleton width="65%" height={22} />
    <Skeleton width="45%" height={14} />
    <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
      <Skeleton width={70} height={14} />
      <Skeleton width={70} height={14} />
    </div>
    <Skeleton width={120} height={26} />
  </div>
);
