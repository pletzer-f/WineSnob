import { Sparkline } from 'winesnob-design-system';

export const Value = () => (
  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <span style={{ fontFamily: 'var(--ws-font-display)', fontSize: 28, color: 'var(--ws-ink)' }}>€42,300</span>
    <Sparkline points={[28, 30, 29, 34, 33, 38, 42]} />
  </div>
);
