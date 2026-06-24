import { Toast } from 'winesnob-design-system';

export const Variants = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start', padding: 12 }}>
    <Toast message="Added to the cellar." tone="success" />
    <Toast message="6 bottles imported." actionLabel="Undo" />
    <Toast message="Couldn’t read that label." tone="error" actionLabel="Retry" />
  </div>
);
