/** @clever/fiscal-engine — public API */

// SYSCOHADA
export {
  SYSCOHADA_ACCOUNTS,
  SYSCOHADA_LIST,
  SYSCOHADA_CLASSES,
  type SysohadaAccount,
  type SysohadaCode,
} from "./syscohada/accounts";
export { matchDescription, normalize, type MatchResult } from "./syscohada/matcher";
export { isValidSysohadaCode, getAccount } from "./syscohada/validator";

// Tax
export { TVA_RATES, tvaRate, tvaFromTTC, ttcFromHT, DEFAULT_COUNTRY } from "./tax/tva";
export {
  IRPP_BRACKETS_CM,
  computeIRPP,
  type TaxBracket,
  type IrppResult,
} from "./tax/irpp";
export { IS_CONFIG, computeIS, type CorporateTaxConfig, type IsResult } from "./tax/is";

// QBO bridge
export { QBO_TO_SYSCOHADA, qboTypeToSysohada } from "./qbo-bridge/account-map";
export {
  documentToQboPurchase,
  type ApprovedDocument,
  type QboPurchasePayload,
} from "./qbo-bridge/push-transformer";
