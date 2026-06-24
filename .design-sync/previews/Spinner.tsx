import { Spinner } from 'winesnob-design-system';

export const ReadingLabel = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 20,
      fontFamily: 'var(--ws-font-ui)',
      color: 'var(--ws-muted)',
      fontSize: 14,
    }}
  >
    <Spinner size={22} />
    <span>Reading the label…</span>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 20 }}>
    <Spinner size={18} />
    <Spinner size={24} />
    <Spinner size={32} />
  </div>
);
