/**
 * Module type declarations for packages without bundled types
 */

declare module 'base64-arraybuffer' {
  export function decode(base64: string): ArrayBuffer;
  export function encode(arrayBuffer: ArrayBuffer): string;
}

// react-native-purchases types are bundled with the package but may need
// an explicit declaration if the tsconfig moduleResolution does not resolve them
declare module 'react-native-purchases' {
  const Purchases: any;
  export default Purchases;
  export const PRODUCT_CATEGORY: any;
  export const PACKAGE_TYPE: any;
  export const INTRO_ELIGIBILITY_STATUS: any;
  export const PRORATION_MODE: any;
  export const PURCHASES_ERROR_CODE: any;
  export type PurchasesOffering = any;
  export type PurchasesPackage = any;
  export type CustomerInfo = any;
  export type PurchasesProduct = any;
  export type PurchasesEntitlementInfo = any;
  export type PurchasesOfferings = any;
}

declare module 'react-native-fbsdk-next' {
  export const Settings: any;
  export const AppEventsLogger: any;
}
