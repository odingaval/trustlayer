import * as buffer from 'buffer';
const Buffer = (buffer as any).Buffer || buffer;
(window as any).Buffer = Buffer;
(window as any).global = window;
(window as any).process = { env: {} };
export { Buffer };
