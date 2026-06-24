import { BottleDetail, Button } from 'winesnob-design-system';

export const Full = () => (
  <div style={{ padding: 16 }}>
    <BottleDetail
      name="Château Margaux"
      producer="Premier Grand Cru Classé"
      vintage={2015}
      region="Margaux"
      country="Bordeaux"
      grapes={['Cabernet Sauvignon', 'Merlot', 'Petit Verdot']}
      quantity={6}
      status="ready"
      value="€4,200"
      score={98}
      drinkFrom={2025}
      drinkTo={2050}
      notes="Opulent yet precise — cassis, violet and graphite, with a finish that won’t quit. A landmark vintage."
      actions={
        <>
          <Button variant="secondary">Edit</Button>
          <Button variant="primary">Mark a bottle drunk</Button>
        </>
      }
    />
  </div>
);
