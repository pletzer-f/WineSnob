import { NumberStepper } from 'winesnob-design-system';

export const Quantity = () => (
  <div style={{ padding: 20 }}>
    <NumberStepper value={6} min={0} />
  </div>
);
