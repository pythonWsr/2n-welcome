// index.js – 模块统一入口
import color from './color.js';
import table from './table.js';
import media from './media.js';
import code from './code.js';

export const modules = [color, table, media, code];
export const moduleMap = Object.fromEntries(modules.map(m => [m.name, m]));
