import { SegmentedControl } from 'winesnob-design-system';

export const Views = () => (
  <div style={{ padding: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
    <SegmentedControl options={[{ key: 'list', label: 'List' }, { key: 'grid', label: 'Grid' }]} value="list" />
    <SegmentedControl
      options={[{ key: 'all', label: 'All' }, { key: 'red', label: 'Red' }, { key: 'white', label: 'White' }]}
      value="red"
    />
  </div>
);
