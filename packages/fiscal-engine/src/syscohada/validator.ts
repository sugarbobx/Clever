/** Validates that a SYSCOHADA code exists in the plan. */
import { SYSCOHADA_ACCOUNTS, type SysohadaCode } from "./accounts";

export function isValidSysohadaCode(code: string): code is SysohadaCode {
  return Object.prototype.hasOwnProperty.call(SYSCOHADA_ACCOUNTS, code);
}

export function getAccount(code: string) {
  if (!isValidSysohadaCode(code)) return null;
  return { code, ...SYSCOHADA_ACCOUNTS[code] };
}
