import { randomBytes } from "node:crypto";
import { link, mkdir, open, readFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";

export class FarmOsDay150DurablePublicationError extends Error {
  constructor(readonly code: "OUTCOME_UNKNOWN" | "OUTPUT_PREEXISTS" | "READBACK_FAILED") {
    super(code); this.name = "FarmOsDay150DurablePublicationError";
  }
}

export function canonicalFarmOsDay150Json(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string" ||
    typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalFarmOsDay150Json).join(",")}]`;
  if (typeof value !== "object") throw new FarmOsDay150DurablePublicationError("READBACK_FAILED");
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalFarmOsDay150Json(source[key])}`).join(",")}}`;
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function publishCanonicalFarmOsDay150ArtifactExclusive(
  path: string, value: unknown,
): Promise<void> {
  await publishFarmOsDay150BytesExclusive(path,
    Buffer.from(`${canonicalFarmOsDay150Json(value)}\n`, "utf8"));
}

export async function publishFarmOsDay150BytesExclusive(
  path: string, bytes: Uint8Array,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${randomBytes(12).toString("hex")}`;
  const handle = await open(temporary, "wx", 0o600);
  let writeCompleted = false;
  try {
    await handle.writeFile(bytes);
    await handle.sync();
    writeCompleted = true;
  } finally {
    await handle.close();
    if (!writeCompleted) {
      await unlink(temporary).catch(() => undefined);
      await syncDirectory(dirname(path)).catch(() => undefined);
    }
  }
  try {
    await link(temporary, path);
    await syncDirectory(dirname(path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new FarmOsDay150DurablePublicationError("OUTPUT_PREEXISTS");
    }
    throw new FarmOsDay150DurablePublicationError("OUTCOME_UNKNOWN");
  } finally {
    await unlink(temporary).catch(() => undefined);
    await syncDirectory(dirname(path)).catch(() => undefined);
  }
}

export async function reopenFarmOsDay150Bytes(path: string): Promise<Buffer> {
  try { return await readFile(path); }
  catch { throw new FarmOsDay150DurablePublicationError("READBACK_FAILED"); }
}

export async function reopenCanonicalFarmOsDay150Artifact(path: string): Promise<unknown> {
  try {
    const bytes = await readFile(path, "utf8");
    const value = JSON.parse(bytes) as unknown;
    if (`${canonicalFarmOsDay150Json(value)}\n` !== bytes) {
      throw new FarmOsDay150DurablePublicationError("READBACK_FAILED");
    }
    return value;
  } catch (error) {
    if (error instanceof FarmOsDay150DurablePublicationError) throw error;
    throw new FarmOsDay150DurablePublicationError("READBACK_FAILED");
  }
}

/**
 * Re-establishes and proves durability for an exact canonical artifact after an
 * ambiguous exclusive publication acknowledgement. A readable directory entry
 * alone is deliberately insufficient: both the file and its containing
 * directory are fsync'd before a second trusted canonical reopen.
 */
export async function reconcileCanonicalFarmOsDay150ArtifactDurability(
  path: string, expected: unknown,
): Promise<void> {
  const expectedBytes = `${canonicalFarmOsDay150Json(expected)}\n`;
  try {
    const before = await readFile(path, "utf8");
    if (before !== expectedBytes) {
      throw new FarmOsDay150DurablePublicationError("READBACK_FAILED");
    }
    const handle = await open(path, "r");
    try { await handle.sync(); } finally { await handle.close(); }
    await syncDirectory(dirname(path));
    const reopened = await reopenCanonicalFarmOsDay150Artifact(path);
    if (canonicalFarmOsDay150Json(reopened) !== canonicalFarmOsDay150Json(expected)) {
      throw new FarmOsDay150DurablePublicationError("READBACK_FAILED");
    }
  } catch (error) {
    if (error instanceof FarmOsDay150DurablePublicationError) throw error;
    throw new FarmOsDay150DurablePublicationError("OUTCOME_UNKNOWN");
  }
}
