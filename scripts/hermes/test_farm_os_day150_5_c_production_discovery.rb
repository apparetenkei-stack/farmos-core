#!/usr/bin/env ruby
# frozen_string_literal: true

require 'csv'
require 'digest'
require 'json'
require 'yaml'

ROOT = File.expand_path('../..', __dir__)
C = File.join(ROOT, 'artifacts/day150-5/ef1-c')
REPORT = File.join(ROOT, 'docs/architecture/day150-5-ef1-c-schema-drift-report.md')
WINDOWS_FINAL = '/Users/hayate/farmos-authority-inputs/ef1-c/windows/FarmOS_Day150_5_C_Production_Discovery_Final_2026-08-22'
WINDOWS_SUPPLEMENT = '/Users/hayate/farmos-authority-inputs/ef1-c/windows/FarmOS_Day150_5_C_Production_Discovery_Supplement_2026-08-22'
R4_ROOT = File.join(WINDOWS_SUPPLEMENT, 'r4-11-session-pooler-production-execution-20260822T065537Z')
APP_HEAD = 'b8dc5438aa6f28fb502f371f3c47d7abbd510779'
EXPECTED_GIT_ONLY = %w[20260724000001 20260724000002 20260724000003 20260724000004 20260724000005]
EXPECTED_COUNTS = { 'grants' => 2410, 'columns' => 802, 'indexes' => 177, 'schemas' => 10, 'triggers' => 16, 'functions' => 122, 'relations' => 81, 'extensions' => 5, 'constraints' => 220, 'publications' => 2, 'rls_policies' => 62, 'migration_history' => 19 }.freeze
R4_HASHES = {
  'result.sanitized.json' => 'e59d5276bec6afe2b1ae71dfd14e321b63c5dfd2792af70caba053c4a92cb7a8',
  'audit.json' => 'ea2c2368c2d97fb13006ba4f3155ad0baf853001e18c08f979a97e886fd27e57',
  'journal.jsonl' => 'dbb3e309f974ae028ab824c4f4248578938d65fb0857fee9ffcf0c605a5614f9',
  'manifest.json' => '7b0f8edfc3980646480d5df54c5621ee75ae2a0f9b946015f52d756a0d6787d5'
}.freeze

def require_true(condition, message)
  raise "DAY150_5_C_VALIDATION_FAILED: #{message}" unless condition
end

def sha256(path)
  Digest::SHA256.file(path).hexdigest
end

def canonical(value)
  case value
  when Hash
    value.keys.sort.each_with_object({}) { |key, result| result[key] = canonical(value[key]) }
  when Array
    value.map { |item| canonical(item) }.sort_by { |item| JSON.generate(item) }
  else
    value
  end
end

def same_metadata_set?(left, right)
  canonical(left) == canonical(right)
end

def metadata_objects(value, schema)
  value.select { |item| item.is_a?(Hash) && item['schema'] == schema }
end

final_manifest_path = File.join(WINDOWS_FINAL, 'C-evidence-manifest.json')
require_true(File.file?(final_manifest_path), 'final evidence manifest missing')
final_manifest = JSON.parse(File.read(final_manifest_path))
final_history = JSON.parse(File.read(File.join(WINDOWS_FINAL, 'migration-history-evidence.json')))
require_true(final_manifest['evidence_manifest_version'] == 'DAY150.5-C/1.0', 'final evidence contract')
require_true(final_manifest['deterministic_completion_status'] == 'COMPLETE__WINDOWS_FINAL_RECONCILIATION', 'final evidence completion status')
require_true(final_manifest.dig('repository', 'git_head') == APP_HEAD, 'Windows Farming App HEAD')
require_true(final_manifest.dig('repository', 'repository_mutations_caused_by_task') == 0, 'Windows repository mutation count')
final_manifest.dig('final_evidence_files_sha256').each do |name, expected|
  path = File.join(WINDOWS_FINAL, name)
  require_true(File.file?(path), "final evidence file #{name}")
  require_true(sha256(path) == expected, "final evidence file hash #{name}")
end

execution_files = Dir[File.join(R4_ROOT, 'execution', '*')]
result_path = execution_files.find { |path| path.end_with?('.result.sanitized.json') }
audit_path = execution_files.find { |path| path.end_with?('.audit.json') }
journal_path = execution_files.find { |path| path.end_with?('.journal.jsonl') }
manifest_path = execution_files.find { |path| path.end_with?('.manifest.json') }
[result_path, audit_path, journal_path, manifest_path].each { |path| require_true(path && File.file?(path), 'R4.11 execution file missing') }
require_true(sha256(result_path) == R4_HASHES['result.sanitized.json'], 'R4.11 result hash')
require_true(sha256(audit_path) == R4_HASHES['audit.json'], 'R4.11 audit hash')
require_true(sha256(journal_path) == R4_HASHES['journal.jsonl'], 'R4.11 journal hash')
require_true(sha256(manifest_path) == R4_HASHES['manifest.json'], 'R4.11 execution manifest hash')

result = JSON.parse(File.read(result_path))
audit = JSON.parse(File.read(audit_path))
execution_manifest = JSON.parse(File.read(manifest_path))
require_true(result['contract_version'] == 'DAY150.5-C/1.0', 'R4.11 result contract')
require_true(result['server_version'] == '17.6', 'R4.11 PostgreSQL version')
require_true(result['counts'] == EXPECTED_COUNTS, 'R4.11 result counts')
require_true(result['migration_history'].length == 19, 'R4.11 migration history count')
require_true(audit['execution_status'] == 'SUCCESS', 'R4.11 execution success')
require_true(audit['target_match'] == true && audit['query_hash_match'] == true, 'R4.11 target/query verification')
require_true(audit['connection_attempt_count'] == 1 && audit['successful_connection_count'] == 1, 'R4.11 connection 1/1')
require_true(audit['approved_query_call_attempt_count'] == 1 && audit['approved_query_call_success_count'] == 1, 'R4.11 query call 1/1')
require_true(audit['approved_sql_statement_count'] == 5 && audit['unexpected_sql_statement_count'] == 0, 'R4.11 statement counters')
%w[retry_count reconnect_count production_DDL production_DML migration_mutations business_row_reads credential_value_exposure].each do |key|
  require_true(audit[key] == 0, "R4.11 zero counter #{key}")
end
require_true(execution_manifest == { 'journal_sha256' => R4_HASHES['journal.jsonl'], 'result_sha256' => R4_HASHES['result.sanitized.json'], 'audit_sha256' => R4_HASHES['audit.json'] }, 'R4.11 manifest internal provenance')

statement_manifest_path = File.join(WINDOWS_SUPPLEMENT, 'production-readonly-approved-statement-manifest-r4-11.json')
statement_manifest = JSON.parse(File.read(statement_manifest_path))
require_true(sha256(statement_manifest_path) == '855ceaaf9ff1f2a0e8201a6b3c5d53106e58c51b2104c7784ae02eb36c0bd333', 'approved statement manifest hash')
require_true(statement_manifest['query_id'] == 'day150_5_c_catalog_metadata_snapshot_v1', 'approved query identity')
require_true(statement_manifest['query_sha256'] == '3d5a37ace1be8238baa139d97ef8898f63d65588274dec33489472a26181e87d', 'approved query hash')
require_true(statement_manifest['statement_count'] == 5, 'approved statement count')
require_true(statement_manifest['statements'].map { |item| item['expected_pg_command'] } == %w[BEGIN SET SET SELECT ROLLBACK], 'approved statement sequence')
require_true(statement_manifest['unexpected_sql_statement_count'] == 0, 'approved unexpected statement count')
require_true(statement_manifest['persistent_production_DDL'] == 0 && statement_manifest['persistent_production_DML'] == 0 && statement_manifest['migration_mutation'] == 0, 'approved mutation assertions')

journal_events = File.readlines(journal_path, chomp: true).map { |line| JSON.parse(line) }
expected_events = %w[TARGET_PARSE_STARTED SESSION_POOLER_TARGET_VERIFIED QUERY_HASH_VERIFIED PG_CLIENT_CONSTRUCTION_STARTED PG_CLIENT_CONSTRUCTED CONNECTION_ATTEMPT_STARTED CONNECTION_SUCCEEDED QUERY_ATTEMPT_STARTED QUERY_SUCCEEDED RESULT_SANITIZATION_SUCCEEDED RESULT_ARTIFACT_WRITTEN CONNECTION_END_STARTED CONNECTION_END_SUCCEEDED FINAL_AUDIT_WRITTEN EXECUTION_COMPLETED]
require_true(journal_events.length == expected_events.length, 'journal event count')
require_true(journal_events.map { |event| event['event'] } == expected_events, 'journal event sequence')
require_true(journal_events.each_with_index.all? { |event, index| event['sequence'] == index + 1 }, 'journal sequence numbers')
require_true(journal_events.last['event'] == 'EXECUTION_COMPLETED' && journal_events.last['status'] == 'SUCCESS', 'journal terminal success')
require_true(journal_events[1]['target_match'] == true && journal_events[2]['query_hash_match'] == true, 'journal target/query success')
require_true(journal_events.all? { |event| event['unexpected_sql_count'] == 0 && event['retry_count'] == 0 && event['reconnect_count'] == 0 }, 'journal zero unexpected/retry/reconnect')

earlier_path = File.join(WINDOWS_SUPPLEMENT, 'production-readonly-results.sanitized.json')
earlier = JSON.parse(File.read(earlier_path))['result']
require_true(earlier['counts'] == result['counts'], 'metadata counts equal')
comparison_paths = %w[relations columns constraints indexes grants]
comparison_paths.each do |key|
  old_platform = earlier[key].select { |item| item.is_a?(Hash) && item['schema'] == 'realtime' && item.values.any? { |value| value.to_s.include?('messages_2026_08_18') } }
  new_platform = result[key].select { |item| item.is_a?(Hash) && item['schema'] == 'realtime' && item.values.any? { |value| value.to_s.include?('messages_2026_08_25') } }
  require_true(!old_platform.empty? && !new_platform.empty?, "R4.11 platform difference #{key}")
end
%w[relations columns constraints indexes functions triggers rls_policies grants publications].each do |key|
  require_true(same_metadata_set?(metadata_objects(earlier[key], 'public'), metadata_objects(result[key], 'public')), "APP_OWNED metadata equality #{key}")
end

git_versions = final_history['ordered_git_migration_identities'].map { |item| item['version'] }.sort
production_versions = result['migration_history'].map { |item| item['version'] }.sort
require_true(git_versions.length == 24 && production_versions.length == 19, 'migration count arithmetic')
require_true((git_versions & production_versions).length == 19, 'migration overlap arithmetic')
require_true((git_versions - production_versions) == EXPECTED_GIT_ONLY, 'exact Git-only set')
require_true((production_versions - git_versions).empty?, 'production-only zero')
require_true(final_history['git_timestamp_migration_count'] == 24 && final_history['production_history_count'] == 19, 'final migration evidence counts')
require_true(final_history['git_only'].length == 5 && final_history['production_only'].empty?, 'final migration evidence sets')

schema = JSON.parse(File.read(File.join(C, 'production-schema-fingerprint.json')))
history = JSON.parse(File.read(File.join(C, 'migration-history-evidence.json')))
provenance = JSON.parse(File.read(File.join(C, 'evidence-provenance.json')))
environment = YAML.load_file(File.join(C, 'environment-manifest.draft.yaml'))
csv_rows = CSV.read(File.join(C, 'legacy-sql-classification.csv'), headers: true)
require_true(schema['source_execution']['result_sha256'] == R4_HASHES['result.sanitized.json'], 'fingerprint result binding')
require_true(schema['source_execution']['audit_sha256'] == R4_HASHES['audit.json'], 'fingerprint audit binding')
require_true(schema['source_execution']['journal_sha256'] == R4_HASHES['journal.jsonl'], 'fingerprint journal binding')
require_true(schema['source_execution']['execution_manifest_sha256'] == R4_HASHES['manifest.json'], 'fingerprint manifest binding')
require_true(schema['APP_OWNED_canonical_schema_fingerprint'] == 'a11ff4532126c06d3c90c8548ff121e0494876f4e1365da6ed51468a40bd1cd1', 'app-owned fingerprint')
require_true(schema.dig('app_owned_fingerprint_comparison', 'disposition') == 'REPRODUCED_SAME_APP_OWNED_FINGERPRINT', 'fingerprint disposition')
require_true(schema.dig('metadata_comparison', 'semantic_difference_count') == 5 && schema.dig('metadata_comparison', 'unexplained_app_owned_drift_count') == 0, 'metadata reconciliation')
require_true(history['production_migration_identity_sot'] == 'EXECUTED_MIGRATION_IDENTITY_SOT', 'Production identity SOT')
require_true(history['git_migration_sql_body_sot'] == 'MIGRATION_SQL_BODY_SOT', 'Git SQL-body SOT')
require_true(history['production_sql_body_equality'] == 'NOT_ESTABLISHED', 'SQL-body equality boundary')
require_true(history['migration_identity_mismatch_count'] == 0 && history['unsupported_sql_body_equality_claim_count'] == 0, 'migration truth fields')
require_true(history['git_only'].map { |item| item['migration_timestamp'] } == EXPECTED_GIT_ONLY, 'history Git-only records')
require_true(history['migration_reconciliation_records'].map { |item| item['migration_timestamp'] } == EXPECTED_GIT_ONLY, 'Git-only reconciliation records')

classification_counts = csv_rows.group_by { |row| row['classification'].to_s[0] }.transform_values(&:length)
require_true(csv_rows.headers.length == 11 && csv_rows.length == 8, 'CSV parse/count')
require_true(classification_counts.fetch('B', 0) == 6 && classification_counts.fetch('D', 0) == 2, 'timestamp B/D counts')
require_true(classification_counts.fetch('A', 0).zero? && classification_counts.fetch('C', 0).zero?, 'timestamp A/C counts')
require_true(csv_rows.all? { |row| !row['reconciliation_id'].to_s.empty? && !row['owner'].to_s.empty? && row['human_approval_required'] == 'yes' }, 'CSV ownership binding')
require_true(csv_rows.all? { |row| row['production_mutation_required'].to_s == 'yes' || row['production_mutation_required'].to_s == 'no' }, 'CSV mutation boundary')

required_categories = %w[auth_provider_configuration storage_buckets storage_policies edge_functions edge_function_secret_presence_metadata realtime cron webhook_integration_configuration]
require_true(environment['categories'].keys.sort == required_categories.sort, 'non-DB category completeness')
require_true(environment.dig('coverage', 'required_categories') == 8 && environment.dig('coverage', 'reviewed_categories') == 8 && environment.dig('coverage', 'unreviewed_categories') == 0, 'non-DB coverage counts')
allowed_states = %w[VERIFIED NOT_CONFIGURED NOT_APPLICABLE NOT_ESTABLISHED_FROM_RETAINED_EVIDENCE REQUIRES_LATER_VERIFICATION]
require_true(environment['categories'].values.all? { |category| allowed_states.include?(category['status']) }, 'non-DB finite statuses')
require_true(environment['categories'].values.all? { |category| category['current_owner'] && category['reconciliation_owner'] && category['reconciliation_record_id'] && category['future_gate'] }, 'non-DB ownership records')

register = provenance.dig('reconciliation_register', 'records')
require_true(register.length == 16, 'reconciliation record count')
required_record_fields = %w[reconciliation_id finding evidence owner target_subday_or_gate proposed_treatment production_mutation_required_later human_approval_required current_status]
require_true(register.all? { |record| required_record_fields.all? { |field| record.key?(field) } }, 'reconciliation record fields')
register_ids = register.map { |record| record['reconciliation_id'] }
require_true(csv_rows.all? { |row| register_ids.include?(row['reconciliation_id'].to_s.strip) }, 'CSV reconciliation register linkage')
require_true(environment['categories'].values.all? { |category| register_ids.include?(category['reconciliation_record_id']) }, 'environment reconciliation register linkage')
require_true(register_ids.include?('C-RECON-R4-11-MANAGED-METADATA-DRIFT'), 'R4.11 reconciliation linkage')

zero_fields = %w[business_row_reads production_writes production_ddl production_dml migration_mutations credential_value_exposure sql_editor_mutations db_push production_reset migration_repair]
zero_fields.each { |field| require_true(provenance.dig('zero_operation_evidence', field) == 0, "provenance zero #{field}") }
require_true(schema.dig('read_boundary', 'business_row_reads') == 0 && schema.dig('read_boundary', 'production_DDL') == 0 && schema.dig('read_boundary', 'production_DML') == 0 && schema.dig('read_boundary', 'migration_mutations') == 0, 'fingerprint zero operations')
require_true(environment.dig('operation_boundary', 'production_ddl') == 0 && environment.dig('operation_boundary', 'production_dml') == 0 && environment.dig('operation_boundary', 'migration_mutation') == 0, 'environment zero operations')

forbidden_claim = %w[migration content mismatch count].join('_')
evidence_paths = Dir[File.join(C, '*')] + [REPORT]
c_artifact_paths = evidence_paths + [__FILE__]
forbidden_matches = evidence_paths.select { |path| File.read(path).include?(forbidden_claim) }
require_true(forbidden_matches.empty?, 'unsupported migration body equality field is absent')
business_row_marker = %w[business row data].join('_')
require_true(evidence_paths.none? { |path| File.read(path).include?(business_row_marker) }, 'business-row evidence absent')

protected = JSON.parse(File.read(File.join(ROOT, 'artifacts/day150-5/ef1-a/ef1-entry-baseline.json')))['protected_untracked_resources']
protected.each do |resource|
  path = File.join(ROOT, resource['path'])
  require_true(File.file?(path), "protected resource #{resource['path']}")
  require_true(sha256(path) == resource['sha256'], "protected resource hash #{resource['path']}")
end

secret_patterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:sk|ghp|xox[baprs])-[A-Za-z0-9_-]{20,}\b/,
  /\b(?:password|api[_-]?key|private[_-]?key|connection[_-]?string|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9+\/_=.:-]{12,}/i,
  /\bsecret\s*[:=]\s*["']?[A-Za-z0-9+\/_=.:-]{12,}/i
]
c_artifact_paths.each do |path|
  matches = secret_patterns.sum { |pattern| File.read(path).scan(pattern).length }
  puts "SECRET_SCAN path=#{path} classification=secret_value count=#{matches}"
  require_true(matches.zero?, "secret pattern match in #{path}")
end

puts 'DAY150_5_C_DETERMINISTIC_VALIDATION_PASS'
