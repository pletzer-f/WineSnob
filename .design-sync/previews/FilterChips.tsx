import { FilterChips } from 'winesnob-design-system';

const options = [
  { key: 'red', label: 'Red' },
  { key: 'white', label: 'White' },
  { key: 'sparkling', label: 'Sparkling' },
  { key: 'ready', label: 'Ready to drink' },
  { key: 'bordeaux', label: 'Bordeaux' },
  { key: 'burgundy', label: 'Burgundy' },
];

export const Filters = () => (
  <div style={{ maxWidth: 480, padding: 12 }}>
    <FilterChips options={options} selected={['red', 'ready']} />
  </div>
);
