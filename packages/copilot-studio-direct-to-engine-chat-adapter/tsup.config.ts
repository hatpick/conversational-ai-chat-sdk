import { defineConfig } from 'tsup';

export default defineConfig({
  noExternal: ['eventsource-parser', 'p-retry', 'powerva-turn-based-chat-adapter-framework', 'uuid'],
  platform: 'browser',
  target: ['chrome100', 'edge100', 'firefox100', 'safari16']
});
