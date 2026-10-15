/** Mark everything outside an open dialog inert so background controls are not tab stops. */
export function inertOutsideDialog(dialog: HTMLElement): () => void {
  const marked: HTMLElement[] = [];
  let current: HTMLElement | null = dialog;
  while (current !== null) {
    const parent: HTMLElement | null = current.parentElement;
    if (parent === null) break;
    for (const child of parent.children) {
      if (child === current || !(child instanceof HTMLElement) || child.hasAttribute('inert')) continue;
      child.setAttribute('inert', '');
      marked.push(child);
    }
    if (parent === document.body) break;
    current = parent;
  }
  return () => {
    for (const element of marked) element.removeAttribute('inert');
  };
}
