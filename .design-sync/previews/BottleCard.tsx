import { BottleCard } from 'winesnob-design-system';

export const ReadyToDrink = () => (
  <BottleCard
    name="Château Margaux"
    producer="Premier Grand Cru Classé"
    vintage={2015}
    region="Margaux, Bordeaux"
    quantity={6}
    status="ready"
    value="€4,200"
  />
);

export const Cellaring = () => (
  <BottleCard
    name="Barolo Monfortino Riserva"
    producer="Giacomo Conterno"
    vintage={2017}
    region="Piedmont"
    quantity={3}
    status="cellaring"
    value="€1,150"
  />
);

export const PastWindow = () => (
  <BottleCard
    name="Puligny-Montrachet 1er Cru"
    producer="Domaine Leflaive"
    vintage={2011}
    region="Burgundy"
    quantity={1}
    status="past"
    value="€380"
  />
);
