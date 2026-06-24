import { AppShell, SideNav, TabBar, Logo, BottleCard } from 'winesnob-design-system';

const items = [
  { key: 'cellar', label: 'Cellar' },
  { key: 'add', label: 'Add' },
  { key: 'stats', label: 'Stats' },
];

export const Responsive = () => (
  <div
    style={{
      height: 440,
      border: '0.5px solid var(--ws-border)',
      borderRadius: 'var(--ws-radius-lg)',
      overflow: 'hidden',
    }}
  >
    <AppShell
      sidebar={<SideNav items={items} activeKey="cellar" header={<Logo variant="stacked" />} />}
      tabbar={<TabBar items={items} activeKey="cellar" />}
    >
      <div style={{ padding: 'var(--ws-space-6)' }}>
        <h1
          style={{
            fontFamily: 'var(--ws-font-display)',
            fontWeight: 500,
            fontSize: 28,
            color: 'var(--ws-ink)',
            margin: '0 0 16px',
          }}
        >
          Cellar
        </h1>
        <BottleCard
          name="Château Margaux"
          producer="Premier Grand Cru Classé"
          vintage={2015}
          region="Margaux, Bordeaux"
          quantity={6}
          status="ready"
          value="€4,200"
        />
      </div>
    </AppShell>
  </div>
);
