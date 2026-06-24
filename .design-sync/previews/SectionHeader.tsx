import { SectionHeader, SegmentedControl } from 'winesnob-design-system';

export const Cellar = () => (
  <div style={{ maxWidth: 520, padding: 16 }}>
    <SectionHeader
      title="Cellar"
      count={248}
      action={<SegmentedControl options={[{ key: 'list', label: 'List' }, { key: 'grid', label: 'Grid' }]} value="list" />}
    />
  </div>
);
