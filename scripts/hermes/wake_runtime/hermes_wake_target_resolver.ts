import { isIPv4 } from "node:net";
import { HERMES_WAKE_EXECUTION_POLICY } from "./hermes_wake_execution_policy";
import type { HermesWakeTarget } from "./hermes_wake_execution_contract";
export type HermesWakeEnvironmentPresence={wake_enabled_present:boolean;worker_id_present:boolean;mac_present:boolean;broadcast_present:boolean;port_present:boolean};
export function getHermesWakeEnvironmentPresence(env:Record<string,string|undefined>=process.env):HermesWakeEnvironmentPresence{return{
  wake_enabled_present:env.HERMES_RTX_WAKE_ENABLED!==undefined,worker_id_present:env.HERMES_RTX_WAKE_TARGET_WORKER_ID!==undefined,
  mac_present:env.HERMES_RTX_WAKE_MAC!==undefined,broadcast_present:env.HERMES_RTX_WAKE_BROADCAST!==undefined,port_present:env.HERMES_RTX_WAKE_PORT!==undefined}};
export function normalizeHermesWakeMac(value:string):string{const normalized=value.replace(/[:-]/gu,"").toLowerCase();if(!/^[0-9a-f]{12}$/u.test(normalized))throw new Error("wake_target_configuration_invalid");return normalized}
export function validateHermesWakeBroadcast(value:string):string{if(!isIPv4(value))throw new Error("wake_target_configuration_invalid");return value}
export function resolveHermesWakeTarget(workerId:string,env:Record<string,string|undefined>=process.env):HermesWakeTarget{
  if(env.HERMES_RTX_WAKE_ENABLED!=="true"||!env.HERMES_RTX_WAKE_TARGET_WORKER_ID||env.HERMES_RTX_WAKE_TARGET_WORKER_ID!==workerId||!env.HERMES_RTX_WAKE_MAC||!env.HERMES_RTX_WAKE_BROADCAST)throw new Error("wake_target_configuration_missing");
  const port=env.HERMES_RTX_WAKE_PORT===undefined?HERMES_WAKE_EXECUTION_POLICY.default_port:Number(env.HERMES_RTX_WAKE_PORT);if(!Number.isInteger(port)||port<1||port>65535)throw new Error("wake_target_configuration_invalid");
  return{worker_id:workerId,normalized_mac:normalizeHermesWakeMac(env.HERMES_RTX_WAKE_MAC),broadcast_address:validateHermesWakeBroadcast(env.HERMES_RTX_WAKE_BROADCAST),port};}
