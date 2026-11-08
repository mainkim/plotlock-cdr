/**
 * SDK 2.x looked for granite.config.ts. SDK 3.x reads apps-in-toss.config.ts.
 * Re-export the same config so either filename resolves to one definition.
 * https://developers-apps-in-toss.toss.im/documentation/api-and-sdk-en/integration/sdk-3.x
 *
 * appName haebomstudio. Display name stays 해봄 연구자.
 * https://haebomstudio.apps.tossmini.com
 * https://haebomstudio.private-apps.tossmini.com
 */
export { default } from "./apps-in-toss.config";
