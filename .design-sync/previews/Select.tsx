import { Select } from 'winesnob-design-system';

const regions = [
  { label: 'Bordeaux', value: 'bordeaux' },
  { label: 'Burgundy', value: 'burgundy' },
  { label: 'Piedmont', value: 'piedmont' },
  { label: 'Tuscany', value: 'tuscany' },
];

export const Default = () => (
  <div style={{ maxWidth: 320 }}>
    <Select label="Region" placeholder="Choose a region" options={regions} />
  </div>
);

export const WithValue = () => (
  <div style={{ maxWidth: 320 }}>
    <Select label="Region" options={regions} defaultValue="burgundy" />
  </div>
);

export const WithHint = () => (
  <div style={{ maxWidth: 320 }}>
    <Select
      label="Drink window"
      placeholder="Select status"
      options={[
        { label: 'Ready to drink', value: 'ready' },
        { label: 'Cellaring', value: 'cellaring' },
        { label: 'Past peak', value: 'past' },
      ]}
      hint="When the bottle is at its best."
    />
  </div>
);
