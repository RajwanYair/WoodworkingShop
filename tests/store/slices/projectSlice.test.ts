import { beforeEach, describe, expect, it } from 'vitest';
import { createProjectSlice, type ProjectSlice } from '../../../src/store/slices/projectSlice';

describe('project slice', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('initializes project identity and updates notes independently', () => {
    let state: ProjectSlice;
    const set = (patch: Partial<ProjectSlice>) => {
      state = { ...state, ...patch };
    };
    state = createProjectSlice(set, 'My Kitchen', 'Build notes');

    expect(state.projectName).toBe('My Kitchen');
    expect(state.projectNotes).toBe('Build notes');
    state.setProjectNotes('Updated notes');
    expect(state.projectNotes).toBe('Updated notes');
  });

  it('updates the URL when the project name changes', () => {
    let state: ProjectSlice;
    const set = (patch: Partial<ProjectSlice>) => {
      state = { ...state, ...patch };
    };
    state = createProjectSlice(set, '', '');

    state.setProjectName('My Kitchen');

    expect(state.projectName).toBe('My Kitchen');
    expect(new URL(window.location.href).searchParams.get('pn')).toBe('My Kitchen');
  });
});
