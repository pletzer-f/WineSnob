import { DrinkWindow } from 'winesnob-design-system';

export const States = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 420, padding: 8 }}>
    <DrinkWindow from={2025} to={2040} current={2031} />
    <DrinkWindow from={2030} to={2045} current={2027} />
    <DrinkWindow from={2010} to={2022} current={2027} />
  </div>
);
