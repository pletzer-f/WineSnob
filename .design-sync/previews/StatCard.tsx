import { StatCard } from 'winesnob-design-system';

export const CellarValue = () => (
  <StatCard label="Cellar value" value="€42,300" hint="248 bottles · 12 regions" />
);

export const BottleCount = () => <StatCard label="Bottles" value={248} />;

export const ReadyToDrink = () => (
  <StatCard label="Ready to drink" value={64} hint="In their window now" />
);
