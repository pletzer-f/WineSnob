import { Rating } from 'winesnob-design-system';

export const Scores = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 8 }}>
    <Rating value={5} score={98} />
    <Rating value={4} score={93} />
    <Rating value={3} />
  </div>
);
