// template/index.js
//
// ═══════════════════════════════════════════════════════════════
//  模板统一入口
// ═══════════════════════════════════════════════════════════════
//
//   所有 {{name|...}} 形式的模板在此注册。
//   wikiParser 通过 templateMap 查找模板定义并调用其 render()。
//
//   每个模板文件需导出：
//     default { name, isBlock, render() }
//
//   isBlock: true   独立成块，wikiParser 会单独处理为块级元素
//   isBlock: false  行内元素
//
// ═══════════════════════════════════════════════════════════════
//  已注册模板一览
// ═══════════════════════════════════════════════════════════════
//
//   {{color|前景色|文本}}              行内，文本着色
//   {{color|前景色|背景色|文本}}       行内，带背景
//   {{table|表头1,表头2|数据...}}      块级，渲染为表格
//   {{media|image|src|alt|width}}      块级，插入媒体
//   {{code|lang|"""代码"""}}           块级，代码块（含复制、高亮）
//   {{latex|strict|公式}}              行内，KaTeX 公式
//   {{latex|loose|公式}}               行内，宽松模式
//   {{base64|encode|内容}}             行内，Base64 编码
//   {{base64|decode|字符串}}           行内，Base64 解码
//   {{fold|类型|行数|状态|内容}}       块级，内容折叠
//
// ═══════════════════════════════════════════════════════════════

import color from './color.js';
import table from './table.js';
import media from './media.js';
import code from './code.js';
import latex from './latex.js';
import base64 from './base64.js';
import fold from './fold.js';

export const templates = [
  color,
  table,
  media,
  code,
  latex,
  base64,
  fold,
];

export const templateMap = Object.fromEntries(
  templates.map(t => [t.name, t])
);
