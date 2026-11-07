// 两个录制阶段共用同一套画风和规则，功能通过 URL 显式选择。
const params = new URLSearchParams(location.search);
export const enhanced = params.get('version') !== 'basic';
document.documentElement.dataset.version = enhanced ? 'enhanced' : 'basic';
export const initialLevel = [1, 2, 3].includes(Number(params.get('level'))) ? Number(params.get('level')) : 1;
