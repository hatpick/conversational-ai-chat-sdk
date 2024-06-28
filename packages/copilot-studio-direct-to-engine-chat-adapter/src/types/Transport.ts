/**
 * Transport to use for Direct-to-Engine connection.
 *
 * - `auto` will establish via Server-Sent Events when possible, and fallback to REST API
 * - `rest` will force using REST API
 */
export type Transport = 'auto' | 'rest';
