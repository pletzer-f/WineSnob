import { AppHeader, Button } from 'winesnob-design-system';

export const Default = () => (
  <AppHeader
    actions={
      <>
        <Button variant="ghost" size="sm">Cellar</Button>
        <Button variant="primary" size="sm">Add a bottle</Button>
      </>
    }
  />
);
