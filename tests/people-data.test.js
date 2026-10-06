import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePeople} from '../src/people-data.js';

test('source leaders retain verified order and roles without numeric achievements', () => {
  const data = JSON.parse(readFileSync(new URL('../content/people.json', import.meta.url), 'utf8'));
  const result = normalizePeople(data);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.leaders.map(p => p.id), ['awdc', 'flowerwsr', 'CNFlyDream', 'sschara', '20180333']);
  assert.deepEqual(result.leaders.map(p => p.role), ['会长', '副会长', '副会长', '管理层', '管理层']);
  assert.deepEqual(result.leaders.map(p => p.intro), ['', '精通计算机，参与 Florr Wiki 维护。\n编写与维护公会成员表等资料。', '', '', '']);
  assert.ok(result.members.includes('LTJ'));
  assert.ok(result.members.every(name => typeof name === 'string'));
  assert.equal(result.source.commit, 'cc697d2a00402fd7176a6572169dab97d3f7518a');
  assert.equal(result.source.blob, '6aafb2de59fbe0ee67f6697fd5d295d1eb667d19');
  assert.equal(data.provenance.originalLeaderIntros.awdc, '拥有 2 个 Super。');
});

test('empty role and intro are valid, only public leader fields are returned', () => {
  const result = normalizePeople({leaders: [{id: 'a', name: ' Alice ', role: '', intro: '', score: 99}], members: [' LTJ '], source: {commit: 'abc'}});
  assert.deepEqual(result.leaders, [{id: 'a', name: 'Alice', role: '', intro: ''}]);
  assert.deepEqual(result.members, ['LTJ']);
  assert.deepEqual(result.source, {commit: 'abc'});
  assert.deepEqual(result.errors, []);
});

test('duplicate ids and blank names are reported while valid neighbors remain', () => {
  const result = normalizePeople({leaders: [{id: 'a', name: 'A'}, {id: 'a', name: 'Duplicate'}, {id: 'b', name: ' '}, null, {id: 'c', name: 'C'}], members: ['LTJ', '', null]});
  assert.deepEqual(result.leaders.map(p => p.name), ['A', 'C']);
  assert.deepEqual(result.members, ['LTJ']);
  assert.ok(result.errors.some(message => /leaders\[1\].*重复.*id/.test(message)));
  assert.ok(result.errors.some(message => /leaders\[2\].*姓名/.test(message)));
  assert.equal(result.errors.length, 5);
});

test('malformed collections never throw and produce readable errors', () => {
  for (const data of [null, undefined, [], {leaders: {}, members: 'LTJ'}]) {
    const result = normalizePeople(data);
    assert.deepEqual(result.leaders, []);
    assert.deepEqual(result.members, []);
    assert.equal(result.errors.length, 2);
    assert.ok(result.errors.every(message => /数组/.test(message)));
  }
});

test('invalid field types, blank ids, and three-line intros are not displayed', () => {
  const result = normalizePeople({leaders: [{id: '', name: 'A'}, {id: 'b', name: 'B', role: 5}, {id: 'c', name: 'C', intro: '一\n二\n三'}, {id: 'd', name: 'D', intro: {}}, {id: 'e', name: 'E', intro: '一\r\n二'}], members: []});
  assert.deepEqual(result.leaders, [{id: 'e', name: 'E', role: '', intro: '一\n二'}]);
  assert.equal(result.errors.length, 4);
  assert.ok(result.errors.some(message => /最多两行/.test(message)));
});
