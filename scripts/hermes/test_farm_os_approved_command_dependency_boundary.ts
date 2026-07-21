import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root=process.cwd();
const builderPath=path.join(root,"src/lib/hermes/farm_os_approved_command_contract.ts");
const gatewayPath=path.join(root,"src/lib/hermes/farm_os_execution_gateway_contract.ts");
const allowedLocalFiles=new Set(["src/lib/hermes/farm_os_approved_command_contract.ts","src/lib/hermes/farm_os_approved_proposal_contract.ts","src/lib/hermes/farm_os_command_registry.ts","src/lib/hermes/farm_os_risk_taxonomy.ts","src/lib/hermes/farm_os_agent_policy_matrix.ts","src/lib/hermes/farm_agent_runtime_port.ts"]);
const allowedExternalModules=new Set(["node:crypto"]);
const forbiddenModule=/(?:execution_gateway|repository|postgres|database|node:fs|node:net|node:http|node:https|child_process|runtime_tool|proposal_apply)/iu;
const forbiddenCallName=/^(?:fetch|request|connect|query|save|insert|update|delete|remove|call|execute|dispatch|apply|mutate|send|write|writeFile|writeFileSync|appendFile|appendFileSync|spawn|exec|execFile)$/iu;
const visited=new Set<string>(),imports:string[]=[],calls:string[]=[],dynamicImports:string[]=[],forbiddenCalls:string[]=[],forbiddenDependencies:string[]=[],forbiddenReferences:string[]=[];

const resolveLocal=(from:string,specifier:string)=>{
  const base=path.resolve(path.dirname(from),specifier);
  return [base,`${base}.ts`,path.join(base,"index.ts")].find((candidate)=>existsSync(candidate))??null;
};
const inspect=(file:string)=>{
  if(visited.has(file))return;visited.add(file);
  const ast=ts.createSourceFile(file,readFileSync(file,"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const inspectSpecifier=(specifier:string)=>{
    imports.push(specifier);
    if(specifier.startsWith(".")){
      const local=resolveLocal(file,specifier);
      if(!local||!allowedLocalFiles.has(path.relative(root,local)))forbiddenDependencies.push(`${path.relative(root,file)}:${specifier}`);
      else inspect(local);
    }else if(!allowedExternalModules.has(specifier))forbiddenDependencies.push(`${path.relative(root,file)}:${specifier}`);
  };
  const visit=(node:ts.Node)=>{
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))inspectSpecifier(node.moduleSpecifier.text);
    if(ts.isImportEqualsDeclaration(node)&&ts.isExternalModuleReference(node.moduleReference)&&node.moduleReference.expression&&ts.isStringLiteral(node.moduleReference.expression))inspectSpecifier(node.moduleReference.expression.text);
    if(ts.isCallExpression(node)){
      const text=node.expression.getText(ast);calls.push(`${path.relative(root,file)}:${text}`);
      if(node.expression.kind===ts.SyntaxKind.ImportKeyword||text==="require")dynamicImports.push(`${path.relative(root,file)}:${text}`);
      const terminal=ts.isPropertyAccessExpression(node.expression)?node.expression.name.text:ts.isIdentifier(node.expression)?node.expression.text:"";
      const safeHashUpdate=terminal==="update"&&ts.isPropertyAccessExpression(node.expression)&&/^createHash\(/u.test(node.expression.expression.getText(ast));
      if(forbiddenCallName.test(terminal)&&!safeHashUpdate)forbiddenCalls.push(`${path.relative(root,file)}:${text}`);
    }
    if(ts.isElementAccessExpression(node)&&ts.isStringLiteral(node.argumentExpression)&&forbiddenCallName.test(node.argumentExpression.text))forbiddenReferences.push(`${path.relative(root,file)}:${node.getText(ast)}`);
    if(ts.isIdentifier(node)&&(/^(?:fetch|axios)$/iu.test(node.text)||(ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node&&forbiddenCallName.test(node.text)))){
      const isSafePropertyName=ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node&&node.text==="update"&&/^createHash\(/u.test(node.parent.expression.getText(ast));
      const isDeclarationName=(ts.isFunctionDeclaration(node.parent)||ts.isVariableDeclaration(node.parent)||ts.isPropertySignature(node.parent)||ts.isMethodSignature(node.parent))&&node.parent.name===node;
      if(!isSafePropertyName&&!isDeclarationName)forbiddenReferences.push(`${path.relative(root,file)}:${node.text}`);
    }
    ts.forEachChild(node,visit);
  };visit(ast);
};
inspect(builderPath);

const gatewayAst=ts.createSourceFile(gatewayPath,readFileSync(gatewayPath,"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const isSchemaLiteral=(initializer:ts.Expression|undefined)=>initializer!==undefined&&(ts.isStringLiteral(initializer)||(ts.isAsExpression(initializer)&&ts.isStringLiteral(initializer.expression)));
const gatewayImplementationCount=gatewayAst.statements.filter((node)=>
  ts.isFunctionDeclaration(node)||ts.isClassDeclaration(node)||(ts.isVariableStatement(node)&&node.declarationList.declarations.some((declaration)=>!isSchemaLiteral(declaration.initializer))),
).length;
const result={
  builder_pure_dependency_boundary_valid:imports.every((item)=>!forbiddenModule.test(item))&&dynamicImports.length===0&&forbiddenCalls.length===0&&forbiddenDependencies.length===0&&forbiddenReferences.length===0,
  recursive_local_import_graph_valid:visited.size===allowedLocalFiles.size&&[...visited].every((file)=>allowedLocalFiles.has(path.relative(root,file))),
  gateway_implementation_absent:gatewayImplementationCount===0,
  gateway_call_path_absent:!imports.some((item)=>/execution_gateway/iu.test(item))&&!forbiddenCalls.some((item)=>/gateway/iu.test(item)),
  business_write_dependency_absent:!imports.some((item)=>/(?:repository|postgres|database)/iu.test(item))&&!forbiddenCalls.some((item)=>/(?:save|insert|update|delete|write|mutate|query)/iu.test(item)),
  proposal_apply_dependency_absent:!imports.some((item)=>/proposal_apply/iu.test(item))&&!forbiddenCalls.some((item)=>/(?:proposal.*apply|\.apply)/iu.test(item)),
  network_dependency_absent:!imports.some((item)=>/(?:node:net|node:http|node:https|axios)/iu.test(item))&&!forbiddenCalls.some((item)=>/(?:fetch|request|connect|send)/iu.test(item)),
  filesystem_write_dependency_absent:!imports.some((item)=>/node:fs/iu.test(item))&&!forbiddenCalls.some((item)=>/(?:writeFile|appendFile)/iu.test(item)),
  runtime_tool_dependency_absent:!imports.some((item)=>/runtime_tool/iu.test(item)),
  inspected_files:[...visited].map((file)=>path.relative(root,file)).sort(),
  builder_imports:imports,
  forbidden_calls:forbiddenCalls,
  dynamic_imports:dynamicImports,
  forbidden_dependencies:forbiddenDependencies,
  forbidden_references:forbiddenReferences,
};
console.log(JSON.stringify(result));
for(const [name,value] of Object.entries(result).filter(([,value])=>typeof value==="boolean"))assert.equal(value,true,name);
