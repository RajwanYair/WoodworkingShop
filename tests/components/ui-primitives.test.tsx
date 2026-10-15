import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Button } from '../../src/ui/Button';
import { Dialog } from '../../src/ui/Dialog';
import { EmptyState } from '../../src/ui/EmptyState';
import { Field } from '../../src/ui/Field';
import { IconButton } from '../../src/ui/IconButton';
import { Meter } from '../../src/ui/Meter';
import { NumberField } from '../../src/ui/NumberField';
import { Popover } from '../../src/ui/Popover';
import { Select } from '../../src/ui/Select';
import { Skeleton } from '../../src/ui/Skeleton';
import { Switch } from '../../src/ui/Switch';
import { Table } from '../../src/ui/Table';
import { Tabs } from '../../src/ui/Tabs';
import { Toast } from '../../src/ui/Toast';

async function expectNoSeriousAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
}

function TabsHarness() {
  const [value, setValue] = useState('one');
  return (
    <Tabs
      label="Sample"
      value={value}
      onChange={setValue}
      tabs={[
        { id: 'one', label: 'One', panel: 'First panel' },
        { id: 'two', label: 'Two', panel: 'Second panel' },
      ]}
    />
  );
}

const primitiveCases = {
  button: () => <Button>Save</Button>,
  'icon button': () => <IconButton label="Undo">U</IconButton>,
  field: () => <Field label="Name" />,
  'number field': () => <NumberField label="Width" value={25.4} units="imperial" onValueChange={() => undefined} />,
  select: () => (
    <Select label="Wood">
      <option>Oak</option>
    </Select>
  ),
  switch: () => <Switch label="Grain" checked={false} onCheckedChange={() => undefined} />,
  tabs: () => <TabsHarness />,
  dialog: () => (
    <Dialog title="Shortcuts" closeLabel="Close" onClose={() => undefined}>
      Keys
    </Dialog>
  ),
  popover: () => (
    <Popover label="Help" content="Tip">
      ?
    </Popover>
  ),
  toast: () => <Toast message="Saved" tone="success" />,
  table: () => <Table caption="Cuts" headers={['Part', 'Width']} rows={[['Side', '600']]} />,
  meter: () => <Meter label="Yield" value={80} />,
  empty: () => <EmptyState title="No parts" description="Add a cabinet." />,
  skeleton: () => <Skeleton label="Loading plans" />,
} as const;

describe('design-system primitives', () => {
  it.each(Object.entries(primitiveCases))('has no serious axe violations for %s', async (_name, renderCase) => {
    const view = render(<div dir="rtl">{renderCase()}</div>);
    await expectNoSeriousAxeViolations(view.container);
  });

  it('moves tab selection with the arrow keys and keeps one selected tab', async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);
    const first = screen.getByRole('tab', { name: 'One' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Two' })).toHaveTextContent('Second panel');
  });

  it('shows the fractional inch readout for a millimetre value', () => {
    render(<NumberField label="Width" value={25.4} units="imperial" onValueChange={() => undefined} />);
    expect(screen.getByText('1"')).toBeInTheDocument();
  });

  it('toggles the switch from the keyboard', async () => {
    const user = userEvent.setup();
    const calls: boolean[] = [];
    render(<Switch label="Grain" checked={false} onCheckedChange={(checked) => calls.push(checked)} />);
    await user.click(screen.getByRole('switch', { name: 'Grain' }));
    expect(calls).toEqual([true]);
  });
});
