import { SideNav, Logo } from 'winesnob-design-system';

const icon = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d={d} />
  </svg>
);

const items = [
  { key: 'cellar', label: 'Cellar', icon: icon('M4 7h16M4 12h16M4 17h16') },
  { key: 'add', label: 'Add', icon: icon('M12 5v14M5 12h14') },
  { key: 'stats', label: 'Stats', icon: icon('M5 19v-7M12 19V5M19 19v-10') },
];

export const Rail = () => (
  <div
    style={{
      height: 380,
      display: 'inline-flex',
      border: '0.5px solid var(--ws-border)',
      borderRadius: 'var(--ws-radius-lg)',
      overflow: 'hidden',
    }}
  >
    <SideNav
      items={items}
      activeKey="cellar"
      header={<Logo variant="stacked" />}
      footer={
        <span style={{ fontSize: 13, color: 'var(--ws-muted)', padding: '0 12px' }}>
          Fabian’s cellar
        </span>
      }
    />
  </div>
);
