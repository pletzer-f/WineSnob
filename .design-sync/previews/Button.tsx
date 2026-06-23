import { Button } from 'winesnob-design-system';

export const Primary = () => <Button variant="primary">Add a bottle</Button>;

export const Secondary = () => <Button variant="secondary">Edit details</Button>;

export const Ghost = () => <Button variant="ghost">Cancel</Button>;

export const Small = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button variant="primary" size="sm">Add bottle</Button>
    <Button variant="secondary" size="sm">Filter</Button>
  </div>
);

export const Disabled = () => <Button variant="primary" disabled>Add a bottle</Button>;
