import type { FarmOsExecutionReservation,FarmOsExecutionReservationRequest } from "./farm_os_execution_reservation_contract";
import type { FarmOsExecutionGatewayResult } from "./farm_os_execution_gateway_contract";
export const FARM_OS_RESERVATION_REJECTION_CODES=["RESERVATION_SCHEMA_INVALID","RESERVATION_ALREADY_EXISTS","RESERVATION_NOT_FOUND","RESERVATION_OWNER_MISMATCH","RESERVATION_VERSION_MISMATCH","RESERVATION_EXPIRED","RESERVATION_ALREADY_COMPLETED","RESERVATION_FINALIZATION_FAILED","ATOMIC_RESERVATION_CONFLICT","EXECUTION_IN_PROGRESS","DUPLICATE_GATEWAY_REQUEST","DUPLICATE_COMMAND_EXECUTION","DUPLICATE_IDEMPOTENCY_KEY","COMMAND_IDENTITY_MISMATCH","APPROVAL_ALREADY_CONSUMED","APPROVAL_COMMAND_MISMATCH","APPROVAL_REUSE_DETECTED","EXPECTED_VERSION_MISMATCH","REPLAY_DETECTED","RETRY_NOT_ALLOWED","RETRY_REQUIRES_REVIEW","STALE_REQUEST","STALE_RESERVATION_VERSION","INVALID_RESERVATION_TRANSITION","UNKNOWN_REPOSITORY_RESULT"] as const;
export type FarmOsReservationRejectionCode=(typeof FARM_OS_RESERVATION_REJECTION_CODES)[number];
export type FarmOsReservationPortResult={status:"created"|"claimed"|"executing"|"completed"|"failed"|"expired"|"released";record:FarmOsExecutionReservation;reason:null}|{status:"existing";record:FarmOsExecutionReservation;reason:"RESERVATION_ALREADY_EXISTS"}|{status:"rejected";record:FarmOsExecutionReservation|null;reason:FarmOsReservationRejectionCode};
export type FarmOsReservationLookup={reservation_id?:string;gateway_request_id?:string;command_id?:string;command_hash?:string;approval_id?:string;idempotency_key?:string};
export interface FarmOsExecutionReservationPort{
  lookup(input:FarmOsReservationLookup):Promise<FarmOsExecutionReservation|null>;
  tryReserve(input:{request:FarmOsExecutionReservationRequest;now:string}):Promise<FarmOsReservationPortResult>;
  tryClaim(input:{reservation_id:string;expected_reservation_version:number;owner_token:string;now:string}):Promise<FarmOsReservationPortResult>;
  tryStart(input:{reservation_id:string;expected_reservation_version:number;owner_token:string;now:string}):Promise<FarmOsReservationPortResult>;
  tryFinalize(input:{reservation_id:string;expected_reservation_version:number;owner_token:string;result:FarmOsExecutionGatewayResult;now:string}):Promise<FarmOsReservationPortResult>;
  tryExpire(input:{reservation_id:string;expected_reservation_version:number;now:string}):Promise<FarmOsReservationPortResult>;
  tryRelease(input:{reservation_id:string;expected_reservation_version:number;owner_token:string;now:string}):Promise<FarmOsReservationPortResult>;
}
