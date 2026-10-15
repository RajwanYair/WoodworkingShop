import type { LocaleNode } from '../pseudo-locales';
import { collectNamespaces } from './collect';

const modules = import.meta.glob<LocaleNode>('../he/*.json', { eager: true, import: 'default' });

export const namespaces = collectNamespaces(modules);
