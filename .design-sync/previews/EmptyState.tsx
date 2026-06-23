import { EmptyState, Button } from 'winesnob-design-system';

export const Default = () => (
  <EmptyState
    title="Nothing to declare. Yet."
    message="Your cellar is waiting. Add your first bottle and we'll keep its counsel."
  />
);

export const WithAction = () => (
  <EmptyState
    title="Nothing to declare. Yet."
    message="Your cellar is waiting. Add your first bottle and we'll keep its counsel."
    action={<Button variant="primary">Add a bottle</Button>}
  />
);
