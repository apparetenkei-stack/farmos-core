import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const entry = path.join(
  root,
  "src/lib/hermes/farm_os_proposal_execution_verification_contract.ts",
);
const seen = new Set<string>();
const findings: string[] = [];
const forbidden =
  /supabase|postgres|production.*(?:client|repository|database)|farming.?app.*(?:write|repository)|notification|inventory|node:http|node:https|child_process|axios|jsonwebtoken|jose/iu;
const resolve = (file: string, specifier: string) => {
  const base = path.resolve(path.dirname(file), specifier);
  return [base, `${base}.ts`, path.join(base, "index.ts")].find(existsSync) ?? null;
};
const inspect = (file: string) => {
  if (seen.has(file)) return;
  seen.add(file);
  const source = readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.startsWith(".")) {
        const target = resolve(file, specifier);
        if (!target) findings.push(`unresolved:${specifier}`);
        else if (forbidden.test(target)) findings.push(`forbidden:${target}`);
        else inspect(target);
      } else if (forbidden.test(specifier)) findings.push(`forbidden:${specifier}`);
    }
    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText(ast);
      if (
        /^(fetch|eval|Function|require)$/u.test(expression) ||
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      )
        findings.push(`call:${expression}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
};
inspect(entry);
assert.deepEqual(findings, []);
console.log(
  JSON.stringify({
    dependency_boundary_valid: true,
    inspected_files: [...seen].map((file) => path.relative(root, file)).sort(),
    forbidden_findings: findings,
    production_repository_adapter_count: 0,
    production_database_dependency_count: 0,
    farming_app_write_dependency_count: 0,
    external_network_count: 0,
    jwt_credential_library_count: 0,
  }),
);
