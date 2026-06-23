import { ReviewRow } from 'winesnob-design-system';

export const BatchReview = () => (
  <div
    style={{
      background: 'var(--ws-surface)',
      border: '0.5px solid var(--ws-border)',
      borderRadius: 'var(--ws-radius-lg)',
      padding: '8px 16px',
      maxWidth: 520,
    }}
  >
    <ReviewRow
      name="Château Margaux"
      producer="Premier Grand Cru Classé"
      vintage={2015}
      region="Margaux, Bordeaux"
      confidence="high"
    />
    <ReviewRow
      name="Barolo Monfortino Riserva"
      producer="Giacomo Conterno"
      vintage={2013}
      region="Piedmont"
      confidence="low"
    />
    <ReviewRow name="Champagne — label unclear" vintage="?" confidence="low" />
    <ReviewRow
      name="Brunello di Montalcino"
      producer="Biondi-Santi"
      vintage={2016}
      region="Tuscany"
      confidence="high"
    />
  </div>
);
