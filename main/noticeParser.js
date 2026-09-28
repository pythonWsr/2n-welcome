// noticeParser.js – .notice 文件的宽松语法解析器
// 支持：
//   单引号 '...'  等价于双引号
//   无引号键      head: "普通"
//   尾逗号        最后一项后可有可无
//   行注释        // 或 #
//   多行字符串    反引号 `...` 包裹，保留内部换行
//   字段顺序自由
// 输出：{ head, title, summary, time, stamp, author, blocks: [...] }

export function parseNotice(text) {
  const tokens = tokenize(text);
  const parser = new Parser(tokens);
  const raw = parser.parse();
  return normalize(raw);
}

// ---------- 词法分析 ----------
function tokenize(text) {
  const tokens = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const c = text[i];

    // 空白
    if (/\s/.test(c)) { i++; continue; }

    // 行注释 // 或 #
    if ((c === '/' && text[i + 1] === '/') || c === '#') {
      while (i < len && text[i] !== '\n') i++;
      continue;
    }

    // 单字符标点
    if (c === '{' || c === '}' || c === ':' || c === ',' || c === '[' || c === ']') {
      tokens.push({ type: c, value: c });
      i++;
      continue;
    }

    // 引号字符串
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      let s = '';
      while (i < len && text[i] !== quote) {
        if (text[i] === '\\' && i + 1 < len) {
          const next = text[i + 1];
          if (next === 'n') s += '\n';
          else if (next === 't') s += '\t';
          else if (next === 'r') s += '\r';
          else s += next;
          i += 2;
        } else {
          s += text[i];
          i++;
        }
      }
      if (i >= len) throw new Error('字符串未闭合');
      i++;
      tokens.push({ type: 'string', value: s });
      continue;
    }

    // 反引号多行字符串
    if (c === '`') {
      i++;
      let s = '';
      while (i < len && text[i] !== '`') {
        s += text[i];
        i++;
      }
      if (i >= len) throw new Error('多行字符串未闭合');
      i++;
      tokens.push({ type: 'string', value: s });
      continue;
    }

    // 词（键或裸值）
    let start = i;
    while (i < len && !/[\s:,{}\[\]'"`]/.test(text[i])) i++;
    const word = text.slice(start, i);
    if (word) tokens.push({ type: 'word', value: word });
    else i++;
  }

  return tokens;
}

// ---------- 语法分析 ----------
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }

  expect(type) {
    const t = this.next();
    if (!t || t.type !== type) {
      throw new Error(`期望 ${type}，实际 ${t ? t.type : 'EOF'}`);
    }
    return t;
  }

  parse() {
    this.expect('{');
    const result = {};
    const order = [];

    while (this.peek() && this.peek().type !== '}') {
      const keyTok = this.next();
      if (keyTok.type !== 'string' && keyTok.type !== 'word') {
        throw new Error(`期望键，实际 ${keyTok.type}`);
      }
      const key = keyTok.value;
      this.expect(':');
      const value = this.parseValue();
      if (!(key in result)) order.push(key);
      result[key] = value;
      if (this.peek() && this.peek().type === ',') this.next();
    }

    this.expect('}');
    return { data: result, order };
  }

  parseValue() {
    const t = this.peek();
    if (!t) throw new Error('缺少值');
    if (t.type === 'string') { this.next(); return t.value; }
    if (t.type === 'word')   { this.next(); return t.value; }
    if (t.type === '{')      return this.parse();
    if (t.type === '[')      return this.parseArray();
    throw new Error(`未知值类型 ${t.type}`);
  }

  parseArray() {
    this.expect('[');
    const arr = [];
    while (this.peek() && this.peek().type !== ']') {
      arr.push(this.parseValue());
      if (this.peek() && this.peek().type === ',') this.next();
    }
    this.expect(']');
    return arr;
  }
}

// ---------- 规范化 ----------
function normalize({ data, order }) {
  const result = {
    head:    data.head    || '普通',
    title:   data.title   || '',
    summary: data.summary || '',
    time:    data.time    || '',
    stamp:   data.stamp   || 'blank',
    author:  data.author  || '',
    blocks:  []
  };

  if (!result.title) throw new Error('notice 缺少必填字段 title');

  // 把 author 统一成数组
  if (typeof result.author === 'string' && result.author) {
    result.author = [result.author];
  } else if (Array.isArray(result.author)) {
    result.author = result.author.slice();
  } else {
    result.author = [];
  }

  // 按源顺序遍历 main<num> / file<num>
  let lastMainNum = 0;

  for (const key of order) {
    const mainMatch = key.match(/^main(\d+)$/);
    const fileMatch = key.match(/^file(\d+)$/);

    if (mainMatch) {
      const num = parseInt(mainMatch[1], 10);
      // 数字跳跃 → 中间补空段（仅处理递增情况）
      if (num > lastMainNum + 1) {
        for (let i = lastMainNum + 1; i < num; i++) {
          result.blocks.push({ type: 'empty', num: i });
        }
      }
      result.blocks.push({ type: 'main', num, content: data[key] });
      if (num > lastMainNum) lastMainNum = num;

    } else if (fileMatch) {
      const num = parseInt(fileMatch[1], 10);
      const fileData = data[key];
      if (fileData && typeof fileData === 'object' && fileData.src) {
        result.blocks.push({ type: 'file', num, data: fileData });
      }
      // 缺 src 静默跳过
    }
  }

  return result;
}
