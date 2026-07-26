import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";
import {
  FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE,
  FARM_OS_PROPOSAL_PERSISTENCE_ISSUER,
  FARM_OS_PROPOSAL_PERSISTENCE_SUBJECT,
  FARM_OS_WORKLOAD_JWT_MAX_TTL_SECONDS,
  ProductionProposalPersistenceWorkloadAuthentication,
  ProductionProposalVerificationWorkloadAuthentication,
  ProductionWorkloadJwtVerifier,
  type WorkloadPublicJwk,
} from "../../src/lib/hermes/farm_os_production_workload_auth";
import {
  FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
  FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
  FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
} from "../../src/lib/hermes/farm_os_proposal_execution_verification_contract";

const NOW = "2026-07-26T03:00:00.000Z";
const nowSeconds = Math.floor(Date.parse(NOW) / 1000);
const es = generateKeyPairSync("ec", { namedCurve: "P-256" });
const ed = generateKeyPairSync("ed25519");
const publicJwk = (
  key: KeyObject,
  kid: string,
  alg: "ES256" | "EdDSA",
): WorkloadPublicJwk => ({
  ...(key.export({ format: "jwk" }) as JsonWebKey),
  kid,
  alg,
  use: "sig",
});
const keys = [
  publicJwk(es.publicKey, "es-key-1", "ES256"),
  publicJwk(ed.publicKey, "ed-key-1", "EdDSA"),
];
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = (input: {
  alg?: "ES256" | "EdDSA" | "none";
  kid?: string;
  key?: KeyObject;
  claims?: Record<string, unknown>;
  signatureOverride?: Buffer;
}) => {
  const alg = input.alg ?? "ES256";
  const header = encode({ typ: "JWT", alg, kid: input.kid ?? "es-key-1" });
  const claims = encode({
    iss: FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
    aud: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
    sub: FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
    token_type: "workload",
    jti: "fixture-token-001",
    iat: nowSeconds - 5,
    nbf: nowSeconds - 5,
    exp: nowSeconds + 30,
    ...input.claims,
  });
  const signingInput = Buffer.from(`${header}.${claims}`);
  const signature =
    input.signatureOverride ??
    (alg === "ES256"
      ? sign("sha256", signingInput, {
          key: input.key ?? es.privateKey,
          dsaEncoding: "ieee-p1363",
        })
      : alg === "EdDSA"
        ? sign(null, signingInput, input.key ?? ed.privateKey)
        : Buffer.alloc(0));
  return `${header}.${claims}.${signature.toString("base64url")}`;
};
const ports = (jwt: string | null, availableKeys: readonly WorkloadPublicJwk[] = keys) => ({
  tokenPort: { getToken: async () => jwt },
  jwksPort: { getKeys: async () => ({ kind: "available" as const, keys: availableKeys }) },
  clock: { now: async () => NOW },
});
const verify = async (
  jwt: string | null,
  config: {
    issuer?: string;
    audience?: typeof FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE | typeof FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE;
    subject?: string;
    workloadKind?: "native_runtime";
  } = {},
  availableKeys: readonly WorkloadPublicJwk[] = keys,
) => {
  const p = ports(jwt, availableKeys);
  return new ProductionWorkloadJwtVerifier(p.tokenPort, p.jwksPort, p.clock, {
    issuer: config.issuer ?? FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
    audience: config.audience ?? FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
    subject: config.subject ?? FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
    workloadKind: config.workloadKind ?? "native_runtime",
  }).verify();
};

let assertions = 0;
const accepted = async (jwt: string) => {
  assert.equal((await verify(jwt)).kind, "authenticated");
  assertions += 1;
};
const rejected = async (jwt: string) => {
  assert.equal((await verify(jwt)).kind, "rejected");
  assertions += 1;
};

await accepted(token({ alg: "ES256", kid: "es-key-1", key: es.privateKey }));
await accepted(token({ alg: "EdDSA", kid: "ed-key-1", key: ed.privateKey }));
await rejected(token({ claims: { iss: "wrong-issuer" } }));
await rejected(token({ claims: { aud: "wrong-audience" } }));
await rejected(token({ claims: { sub: "wrong-subject" } }));
await rejected(token({ claims: { exp: nowSeconds - 1 } }));
await rejected(token({ claims: { nbf: nowSeconds + 1 } }));
await rejected(token({ claims: { iat: nowSeconds - 61, nbf: nowSeconds - 61, exp: nowSeconds + 1 } }));
await rejected(token({ claims: { token_type: "browser" } }));
await rejected(token({ claims: { token_type: "user_session" } }));
await rejected(token({ alg: "none" }));
await rejected(token({ alg: "ES256", kid: "ed-key-1", key: es.privateKey }));
await rejected(token({ signatureOverride: Buffer.alloc(64, 1) }));
assert.equal((await verify(token({ kid: "unknown-key" }))).kind, "rejected");
assertions += 1;
const missing = new ProductionWorkloadJwtVerifier(
  { getToken: async () => token({}) },
  { getKeys: async () => ({ kind: "unavailable" as const, reason: "not_configured" }) },
  { now: async () => NOW },
  {
    issuer: FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
    audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
    subject: FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
    workloadKind: "native_runtime",
  },
);
assert.equal((await missing.verify()).kind, "unavailable");
assertions += 1;

const verificationPorts = ports(token({}));
const verificationAuth = new ProductionProposalVerificationWorkloadAuthentication(
  new ProductionWorkloadJwtVerifier(
    verificationPorts.tokenPort,
    verificationPorts.jwksPort,
    verificationPorts.clock,
    {
      issuer: FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
      audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
      subject: FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
      workloadKind: "native_runtime",
    },
  ),
);
assert.equal((await verificationAuth.authenticate()).kind, "authenticated");
assertions += 1;

const persistenceJwt = token({
  claims: {
    aud: FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE,
    iss: FARM_OS_PROPOSAL_PERSISTENCE_ISSUER,
    sub: FARM_OS_PROPOSAL_PERSISTENCE_SUBJECT,
  },
});
const persistencePorts = ports(persistenceJwt);
const persistenceAuth = new ProductionProposalPersistenceWorkloadAuthentication(
  new ProductionWorkloadJwtVerifier(
    persistencePorts.tokenPort,
    persistencePorts.jwksPort,
    persistencePorts.clock,
    {
      issuer: FARM_OS_PROPOSAL_PERSISTENCE_ISSUER,
      audience: FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE,
      subject: FARM_OS_PROPOSAL_PERSISTENCE_SUBJECT,
      workloadKind: "native_runtime",
    },
  ),
);
const persistenceResult = await persistenceAuth.authenticate();
assert.equal(persistenceResult.kind, "authenticated");
if (persistenceResult.kind === "authenticated") {
  assert.equal(persistenceResult.workload_id, FARM_OS_PROPOSAL_PERSISTENCE_SUBJECT);
  assert.equal(persistenceResult.workload_kind, "native_runtime");
  assert.equal(persistenceResult.audience, FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE);
}
assertions += 4;
const misboundPorts = ports(token({
  claims: {
    iss: "misconfigured-issuer",
    aud: FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE,
    sub: FARM_OS_PROPOSAL_PERSISTENCE_SUBJECT,
  },
}));
const misboundPersistence = new ProductionProposalPersistenceWorkloadAuthentication(
  new ProductionWorkloadJwtVerifier(
    misboundPorts.tokenPort,
    misboundPorts.jwksPort,
    misboundPorts.clock,
    {
      issuer: "misconfigured-issuer",
      audience: FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE,
      subject: FARM_OS_PROPOSAL_PERSISTENCE_SUBJECT,
      workloadKind: "native_runtime",
    },
  ),
);
assert.equal((await misboundPersistence.authenticate()).kind, "rejected");
assertions += 1;

console.log(JSON.stringify({
  algorithm_cases: ["ES256", "EdDSA"],
  max_ttl_seconds: FARM_OS_WORKLOAD_JWT_MAX_TTL_SECONDS,
  assertions,
  fixture_private_key_persisted: false,
  production_secret_used: false,
  fixture_production_fallback: false,
}));
