import { BarChart } from 'winesnob-design-system';

export const ByRegion = () => (
  <div style={{ maxWidth: 460, padding: 16 }}>
    <BarChart
      data={[
        { label: 'Bordeaux', value: 84 },
        { label: 'Burgundy', value: 56 },
        { label: 'Piedmont', value: 38 },
        { label: 'Tuscany', value: 31 },
        { label: 'Champagne', value: 22 },
      ]}
    />
  </div>
);
