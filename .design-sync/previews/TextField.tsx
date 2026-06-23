import { TextField } from 'winesnob-design-system';

export const Default = () => (
  <div style={{ maxWidth: 320 }}>
    <TextField label="Wine name" placeholder="e.g. Château Margaux" />
  </div>
);

export const WithHint = () => (
  <div style={{ maxWidth: 320 }}>
    <TextField
      label="Vintage"
      placeholder="2015"
      hint="Leave blank for non-vintage."
    />
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 320 }}>
    <TextField
      label="Quantity"
      defaultValue="-2"
      error="Enter a quantity of 1 or more."
    />
  </div>
);
