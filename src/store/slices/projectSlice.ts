import { pushProjectNameToUrl } from '../../utils/url-state';

export type ProjectSlice = {
  projectName: string;
  projectNotes: string;
  setProjectName: (name: string) => void;
  setProjectNotes: (notes: string) => void;
};

type ProjectSet = (partial: Partial<ProjectSlice>) => void;

export function createProjectSlice(set: ProjectSet, initialName: string, initialNotes: string): ProjectSlice {
  return {
    projectName: initialName,
    projectNotes: initialNotes,
    setProjectName: (name) => {
      set({ projectName: name });
      pushProjectNameToUrl(name);
    },
    setProjectNotes: (notes) => set({ projectNotes: notes }),
  };
}
