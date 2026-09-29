import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TemplatePicker } from '../../src/components/configurator/TemplatePicker';
import { TEMPLATES } from '../../src/engine/templates';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('TemplatePicker', () => {
  it('applies the selected template, updates the URL, and closes the picker', async () => {
    const user = userEvent.setup();
    const template = TEMPLATES[0];
    const onClose = vi.fn();

    render(<TemplatePicker onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: new RegExp(template.name.en) }));

    expect(useCabinetStore.getState().config).toEqual(template.config);
    expect(new URLSearchParams(window.location.search).get('tpl')).toBe(template.id);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
