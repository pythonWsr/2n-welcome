/** Validate editable copy without manufacturing identities or achievements. */
export function normalizePeople(data) {
  const input = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const leaders = [], members = [], errors = [], ids = new Set();
  const source = input.source && typeof input.source === 'object' && !Array.isArray(input.source) ? {...input.source} : {};
  if (!Array.isArray(input.leaders)) errors.push('leaders 必须为数组。');
  else input.leaders.forEach((person, index) => {
    const label = `leaders[${index}]`;
    if (!person || typeof person !== 'object' || Array.isArray(person)) {
      errors.push(`${label} 必须为人物记录。`); return;
    }
    if (typeof person.id !== 'string' || !person.id.trim()) {
      errors.push(`${label} id 不能为空。`); return;
    }
    const id = person.id.trim();
    if (ids.has(id)) { errors.push(`${label} 重复 id：${id}。`); return; }
    if (typeof person.name !== 'string' || !person.name.trim()) {
      errors.push(`${label} 姓名不能为空。`); return;
    }
    const role = person.role ?? '', intro = person.intro ?? '';
    if (typeof role !== 'string' || typeof intro !== 'string') {
      errors.push(`${label} role 和 intro 必须为文字。`); return;
    }
    const normalizedIntro = intro.replace(/\r\n?/g, '\n').trim();
    if (normalizedIntro.split('\n').length > 2) {
      errors.push(`${label} 简介最多两行。`); return;
    }
    ids.add(id);
    leaders.push({id, name: person.name.trim(), role: role.trim(), intro: normalizedIntro});
  });
  if (!Array.isArray(input.members)) errors.push('members 必须为姓名字符串数组。');
  else input.members.forEach((name, index) => {
    if (typeof name !== 'string' || !name.trim()) errors.push(`members[${index}] 姓名不能为空，且必须为文字。`);
    else members.push(name.trim());
  });
  return {leaders, members, source, errors};
}
