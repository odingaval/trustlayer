declare module 'events' {
  export class EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
  }
}

declare module 'process' {
  const process: Record<string, any>;
  export default process;
}

interface Window {
  Buffer: typeof import('buffer').Buffer;
  global: Window & typeof globalThis;
  EventEmitter: any;
  process: Record<string, any>;
}
