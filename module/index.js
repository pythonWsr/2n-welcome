// index.js – 模块统一入口
import color from './color.js';
import table from './table.js';
import media from './media.js';

export const modules = [color, table, media];
export const moduleMap = Object.fromEntries(modules.map(m => [m.name, m]));
