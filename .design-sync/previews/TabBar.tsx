import { TabBar } from 'winesnob-design-system';

const items = [
  { key: 'cellar', label: 'Cellar' },
  { key: 'add', label: 'Add' },
  { key: 'stats', label: 'Stats' },
];

export const Cellar = () => (
  <div
    style={{
      maxWidth: 420,
      paddingTop: 'var(--ws-space-4)',
      background: 'var(--ws-bg)',
      border: '0.5px solid var(--ws-border)',
      borderRadius: 'var(--ws-radius-lg)',
      overflow: 'hidden',
    }}
  >
    <TabBar items={items} activeKey="cellar" />
  </div>
);
