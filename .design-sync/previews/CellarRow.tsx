import { CellarRow } from 'winesnob-design-system';

export const InCellar = () => (
  <div
    style={{
      background: 'var(--ws-surface)',
      border: '0.5px solid var(--ws-border)',
      borderRadius: 'var(--ws-radius-lg)',
      padding: '8px 16px',
      maxWidth: 520,
    }}
  >
    <CellarRow
      name="Château Margaux"
      producer="Premier Grand Cru Classé"
      vintage={2015}
      region="Margaux, Bordeaux"
      quantity={6}
      status="ready"
    />
    <CellarRow
      name="Barolo Monfortino Riserva"
      producer="Giacomo Conterno"
      vintage={2017}
      region="Piedmont"
      quantity={3}
      status="cellaring"
    />
    <CellarRow
      name="Brunello di Montalcino"
      producer="Biondi-Santi"
      vintage={2016}
      region="Tuscany"
      quantity={2}
      status="ready"
    />
    <CellarRow
      name="Puligny-Montrachet 1er Cru"
      producer="Domaine Leflaive"
      vintage={2011}
      region="Burgundy"
      quantity={1}
      status="past"
    />
  </div>
);

export const Single = () => (
  <div style={{ maxWidth: 520 }}>
    <CellarRow
      name="Brunello di Montalcino"
      producer="Biondi-Santi"
      vintage={2016}
      region="Tuscany"
      quantity={2}
      status="ready"
    />
  </div>
);
