import { defineConfig } from "@apps-in-toss/web-framework/config";

/**
 * Apps in Toss SDK 3.x config.
 * granite.config.ts re-exports this file for the SDK 2.x filename.
 * https://developers-apps-in-toss.toss.im/documentation/api-and-sdk-en/integration/sdk-3.x
 *
 * Console listing:
 * display name 해봄 연구자 / English Haebom Lab / appName haebomlab
 * tagline 대학원생을 위한 실험설문 설계
 * No ads, no payments, no Toss login.
 */
export default defineConfig({
  appName: "haebomlab",
  brand: {
    primaryColor: "#2F6BFF"
  },
  webView: {},
  permissions: [],
  webBundleDir: "dist"
});
