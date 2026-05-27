import { describe, it, expect } from 'vitest';
import {
  createHistory,
  commit,
  createBranch,
  switchBranch,
  getLog,
  tagVersion,
  diffVersions,
  mergeBranches,
  listBranches,
  DEFAULT_BRANCH_NAME,
  MAX_VERSIONS,
  MAX_BRANCHES,
} from '../../src/engine/version-history';
import type { IdGenerator } from '../../src/engine/version-history';

let idCounter = 0;
const testIdGen: IdGenerator = () => `id-${++idCounter}`;

function resetIds() {
  idCounter = 0;
}

describe('version-history', () => {
  describe('createHistory', () => {
    it('creates history with initial version and main branch', () => {
      resetIds();
      const history = createHistory('{"width":800}', 'Initial', testIdGen);

      expect(history.versions.size).toBe(1);
      expect(history.branches.size).toBe(1);
      const branch = history.branches.values().next().value!;
      expect(branch.name).toBe(DEFAULT_BRANCH_NAME);
      expect(history.activeBranchId).toBe(branch.id);

      const version = history.versions.values().next().value!;
      expect(version.data).toBe('{"width":800}');
      expect(version.parentId).toBeNull();
    });

    it('throws on empty data', () => {
      expect(() => createHistory('', 'msg', testIdGen)).toThrow('must not be empty');
    });
  });

  describe('commit', () => {
    it('adds a new version linked to parent', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      const updated = commit(history, '{"v":2}', 'Second version', testIdGen);

      expect(updated.versions.size).toBe(2);
      const log = getLog(updated);
      expect(log[0].message).toBe('Second version');
      expect(log[0].parentId).toBe(log[1].id);
    });

    it('throws on empty message', () => {
      const history = createHistory('{"v":1}', 'init', testIdGen);
      expect(() => commit(history, '{"v":2}', '', testIdGen)).toThrow('message must not be empty');
    });

    it('throws when max versions exceeded', () => {
      resetIds();
      let history = createHistory('{"v":0}', 'init', testIdGen);
      // Fill to max
      for (let i = 1; i < MAX_VERSIONS; i++) {
        history = commit(history, `{"v":${i}}`, `v${i}`, testIdGen);
      }
      expect(() => commit(history, '{"v":x}', 'overflow', testIdGen)).toThrow('exceed maximum');
    });
  });

  describe('createBranch', () => {
    it('creates a new branch from a version', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      const headId = history.branches.values().next().value!.headId;
      const branched = createBranch(history, 'experiment', headId, testIdGen);

      expect(branched.branches.size).toBe(2);
      expect(branched.activeBranchId).not.toBe(history.activeBranchId);
      const newBranch = branched.branches.get(branched.activeBranchId)!;
      expect(newBranch.name).toBe('experiment');
      expect(newBranch.forkPointId).toBe(headId);
    });

    it('throws on duplicate branch name', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      const headId = history.branches.values().next().value!.headId;
      expect(() => createBranch(history, DEFAULT_BRANCH_NAME, headId, testIdGen)).toThrow('already exists');
    });

    it('throws on non-existent version', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      expect(() => createBranch(history, 'x', 'bad-id', testIdGen)).toThrow('not found');
    });

    it('throws on empty name', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      const headId = history.branches.values().next().value!.headId;
      expect(() => createBranch(history, '', headId, testIdGen)).toThrow('must not be empty');
    });

    it('throws when max branches exceeded', () => {
      resetIds();
      let history = createHistory('{"v":1}', 'init', testIdGen);
      const headId = history.branches.values().next().value!.headId;
      for (let i = 1; i < MAX_BRANCHES; i++) {
        history = createBranch(history, `branch-${i}`, headId, testIdGen);
      }
      expect(() => createBranch(history, 'overflow', headId, testIdGen)).toThrow('exceed maximum');
    });
  });

  describe('switchBranch', () => {
    it('changes active branch', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      const mainBranchId = history.activeBranchId;
      const headId = history.branches.values().next().value!.headId;
      const branched = createBranch(history, 'alt', headId, testIdGen);
      const switched = switchBranch(branched, mainBranchId);

      expect(switched.activeBranchId).toBe(mainBranchId);
    });

    it('throws on non-existent branch', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      expect(() => switchBranch(history, 'bad-id')).toThrow('not found');
    });
  });

  describe('getLog', () => {
    it('returns versions from head to root', () => {
      resetIds();
      let history = createHistory('{"v":1}', 'first', testIdGen);
      history = commit(history, '{"v":2}', 'second', testIdGen);
      history = commit(history, '{"v":3}', 'third', testIdGen);

      const log = getLog(history);
      expect(log).toHaveLength(3);
      expect(log[0].message).toBe('third');
      expect(log[1].message).toBe('second');
      expect(log[2].message).toBe('first');
    });
  });

  describe('tagVersion', () => {
    it('adds a tag to a version', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      const versionId = history.versions.keys().next().value!;
      const tagged = tagVersion(history, versionId, 'v1.0');

      expect(tagged.versions.get(versionId)!.tags).toContain('v1.0');
    });

    it('throws on empty tag', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      const versionId = history.versions.keys().next().value!;
      expect(() => tagVersion(history, versionId, '')).toThrow('must not be empty');
    });

    it('throws on non-existent version', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      expect(() => tagVersion(history, 'bad-id', 'tag')).toThrow('not found');
    });
  });

  describe('diffVersions', () => {
    it('detects added, removed, and modified fields', () => {
      resetIds();
      let history = createHistory('{"a":1,"b":2}', 'init', testIdGen);
      history = commit(history, '{"a":1,"c":3}', 'change', testIdGen);

      const log = getLog(history);
      const diff = diffVersions(history, log[1].id, log[0].id);

      expect(diff.changedFields).toBe(2);
      const types = diff.changes.map((c) => c.type).sort();
      expect(types).toEqual(['added', 'removed']);
    });

    it('detects modified values', () => {
      resetIds();
      let history = createHistory('{"width":800}', 'init', testIdGen);
      history = commit(history, '{"width":900}', 'widen', testIdGen);

      const log = getLog(history);
      const diff = diffVersions(history, log[1].id, log[0].id);

      expect(diff.changes[0].type).toBe('modified');
      expect(diff.changes[0].oldValue).toBe(800);
      expect(diff.changes[0].newValue).toBe(900);
    });

    it('throws on non-existent version', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      const vId = history.versions.keys().next().value!;
      expect(() => diffVersions(history, vId, 'bad')).toThrow('not found');
    });
  });

  describe('mergeBranches', () => {
    it('merges cleanly when no conflicts', () => {
      resetIds();
      let history = createHistory('{"a":1,"b":2}', 'init', testIdGen);
      const headId = history.branches.values().next().value!.headId;
      const mainBranchId = history.activeBranchId;

      // Create branch and modify "a"
      history = createBranch(history, 'feature', headId, testIdGen);
      history = commit(history, '{"a":10,"b":2}', 'change a', testIdGen);
      const featureBranchId = history.activeBranchId;

      // Switch back and modify "b"
      history = switchBranch(history, mainBranchId);
      history = commit(history, '{"a":1,"b":20}', 'change b', testIdGen);

      const result = mergeBranches(history, featureBranchId, mainBranchId);
      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      const merged = JSON.parse(result.mergedData!);
      expect(merged.a).toBe(10);
      expect(merged.b).toBe(20);
    });

    it('detects conflicts when both branches change same field differently', () => {
      resetIds();
      let history = createHistory('{"x":1}', 'init', testIdGen);
      const headId = history.branches.values().next().value!.headId;
      const mainBranchId = history.activeBranchId;

      history = createBranch(history, 'alt', headId, testIdGen);
      history = commit(history, '{"x":100}', 'alt change', testIdGen);
      const altBranchId = history.activeBranchId;

      history = switchBranch(history, mainBranchId);
      history = commit(history, '{"x":200}', 'main change', testIdGen);

      const result = mergeBranches(history, altBranchId, mainBranchId);
      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].path).toBe('x');
    });

    it('throws on non-existent branch', () => {
      resetIds();
      const history = createHistory('{"v":1}', 'init', testIdGen);
      expect(() => mergeBranches(history, 'bad', history.activeBranchId)).toThrow('not found');
    });
  });

  describe('listBranches', () => {
    it('lists all branches with active indicator', () => {
      resetIds();
      let history = createHistory('{"v":1}', 'init', testIdGen);
      const headId = history.branches.values().next().value!.headId;
      history = createBranch(history, 'dev', headId, testIdGen);

      const branches = listBranches(history);
      expect(branches).toHaveLength(2);
      expect(branches.filter((b) => b.isActive)).toHaveLength(1);
      expect(branches.find((b) => b.name === 'dev')!.isActive).toBe(true);
    });
  });
});
