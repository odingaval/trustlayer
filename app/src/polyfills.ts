import { Buffer } from 'buffer';
import { EventEmitter } from 'events';
import process from 'process';

window.Buffer = Buffer;
window.global = window;
window.EventEmitter = EventEmitter as any;
window.process = process;
