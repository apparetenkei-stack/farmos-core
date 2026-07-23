import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const entry = path.join(root, "src/lib/hermes/farm_os_low_risk_candidate_contract.ts");
const forbidden = /approved_command|command_builder|execution_gateway|idempotent|supabase|postgres|database|repository|migration|node:fs|node:net|node:http|node:https|child_process|fetch|axios|notification|proposal_apply|secret_loader/iu;
const findings: string[] = [];
const visited = new Set<string>();
const resolveLocal = (from: string, specifier: string) => {
  const base = path.resolve(path.dirname(from), specifier);
  return [base, `${base}.ts`, path.join(base, "index.ts")].find(existsSync) ?? null;
};
const inspect = (file: string) => {
  if (visited.has(file)) return;
  visited.add(file);
  const source = readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.startsWith(".")) {
        const target = resolveLocal(file, specifier);
        if (!target) findings.push(`unresolved:${specifier}`);
        else if (forbidden.test(target)) findings.push(`forbidden:${target}`);
        else inspect(target);
      } else if (forbidden.test(specifier)) findings.push(`forbidden:${specifier}`);
    }
    if (ts.isCallExpression(node)) {
      const called = node.expression.getText(ast);
      if (/^(fetch|eval|Function|require)$/.test(called) || /\.(?:call|apply)$/.test(called) || node.expression.kind === ts.SyntaxKind.ImportKeyword) findings.push(`call:${called}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
};
inspect(entry);
assert.deepEqual(findings, []);
assert.equal(visited.size, 2);
console.log(JSON.stringify({ dependency_boundary_valid: true, inspected_files: [...visited].map((x) => path.relative(root, x)).sort(), forbidden_findings: findings, command_builder_import_count: 0, execution_gateway_import_count: 0, farming_app_write_import_count: 0, supabase_mutation_import_count: 0 }));
