#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'
require 'yaml'
require 'digest'

ROOT = File.expand_path('../..', __dir__)
B = File.join(ROOT, 'artifacts/day150-5/ef1-b')
WINDOWS = '/Users/hayate/farmos-authority-inputs/ef1-b/windows/FarmOS_Day150_5_B_Windows_Authority_Evidence_2026-08-21.json'
SCHEMA_SHA = 'b7d7f16aef7866d5034baf204ba4a97a767357fe60e6416521dc87a1da84cf83'
RESPONSE_SHA = '86640cc5e94c590010154fe2aac67f898f8695344d17b6cbd7fbea50f0e05ea7'

def require_true(condition, message)
  raise "DAY150_5_B_VALIDATION_FAILED: #{message}" unless condition
end

def unique!(values, name)
  require_true(values.uniq.length == values.length, "duplicate #{name}")
end

def deep_keys(value, keys = [])
  case value
  when Hash
    value.each { |key, child| keys << key.to_s; deep_keys(child, keys) }
  when Array
    value.each { |child| deep_keys(child, keys) }
  end
  keys
end

schema_path = File.join(B, 'windows-authority-evidence-request.schema.json')
require_true(Digest::SHA256.file(schema_path).hexdigest == SCHEMA_SHA, 'Windows request schema binding mismatch')
require_true(Digest::SHA256.file(WINDOWS).hexdigest == RESPONSE_SHA, 'Windows response binding mismatch')

schema = JSON.parse(File.read(schema_path))
windows = JSON.parse(File.read(WINDOWS))
inventory = JSON.parse(File.read(File.join(B, 'credential-inventory.redacted.json')))
provenance = JSON.parse(File.read(File.join(B, 'windows-authority-evidence.provenance.json')))
graph = YAML.load_file(File.join(B, 'authority-graph.yaml'))
denies = YAML.load_file(File.join(B, 'production-deny-identifiers.yaml'))
threat_model = File.read(File.join(ROOT, 'docs/architecture/day150-5-ef1-b-threat-model.md'))
rotation = File.read(File.join(ROOT, 'docs/architecture/day150-5-ef1-b-credential-rotation-proposal.md'))

%w[schema_version generated_at source_repository credential_authority_records lm_studio_authority provider_routes operation_counts validation].each do |key|
  require_true(windows.key?(key), "Windows response missing #{key}")
end
require_true(windows.keys.sort == schema['properties'].keys.sort, 'Windows response additional property')
require_true(windows['schema_version'] == schema.dig('properties', 'schema_version', 'const'), 'Windows response schema version')
require_true(windows['source_repository'].keys.sort == %w[root branch head ahead behind].sort, 'Windows source repository schema')
require_true(windows['source_repository']['branch'] == 'main' && windows['source_repository']['head'].match?(/\A[a-f0-9]{40}\z/) && windows['source_repository']['ahead'] == 0 && windows['source_repository']['behind'] == 0, 'Windows source repository values')
require_true(windows['credential_authority_records'].length == 14, 'Windows credential class count')
require_true(windows['provider_routes'].length == 7, 'Windows provider route count')
unique!(windows['credential_authority_records'].map { |r| r['credential_or_authority_id'] }, 'Windows credential/authority ID')
unique!(windows['provider_routes'].map { |r| r['route_id'] }, 'Windows route ID')
windows['credential_authority_records'].each { |r| require_true(r.keys.sort == schema.dig('properties', 'credential_authority_records', 'items', 'properties').keys.sort, 'Windows credential record schema') }
windows['provider_routes'].each { |r| require_true(r.keys.sort == schema.dig('properties', 'provider_routes', 'items', 'properties').keys.sort, 'Windows route schema') }
require_true(windows['lm_studio_authority'].keys.sort == schema.dig('properties', 'lm_studio_authority', 'properties').keys.sort, 'Windows LM Studio schema')
require_true(windows['operation_counts'].keys.sort == schema.dig('properties', 'operation_counts', 'properties').keys.sort, 'Windows operation schema')
require_true(windows['validation'].keys.sort == schema.dig('properties', 'validation', 'properties').keys.sort, 'Windows validation schema')
require_true(windows['validation']['secret_values_displayed'] == 0, 'Windows secret value exposure')
require_true(windows['operation_counts'].values.all? { |v| v == 0 }, 'Windows operation counts')
require_true(deep_keys(windows).none? { |key| /\A(value|secret|password|connection_string|private_key)\z/i.match?(key) }, 'Windows secret value field')
require_true(windows.dig('lm_studio_authority', 'network_exposure_class') == 'LAN_LISTENER_0.0.0.0:1234', 'LM Studio listener')
require_true(windows.dig('lm_studio_authority', 'authentication_state') == 'AUTHENTICATION_NOT_ESTABLISHED', 'LM Studio authentication')
require_true(windows.dig('lm_studio_authority', 'current_consumers_or_routes').include?('NO_APP_DIRECT_PATH_FOUND'), 'App direct LM Studio path')

require_true(provenance['request_schema_sha256'] == SCHEMA_SHA, 'persisted schema provenance')
require_true(provenance['response_sha256'] == RESPONSE_SHA, 'persisted response provenance')
require_true(provenance['response_generated_at'] == windows['generated_at'], 'persisted generated-at provenance')
require_true(provenance['repository_copy_retained'] == false, 'raw Windows retention')

required_record = %w[id category owner scope storage_class storage_location_status consumer environment rotation_status rotation_method revocation_status revocation_method expiry_semantics failure_impact production_authority_classification evidence_source confidence]
records = inventory['records']
require_true(records.length == 21, 'merged credential/authority class count')
unique!(records.map { |r| r['id'] }, 'merged credential/authority ID')
records.each { |r| required_record.each { |key| require_true(r[key].is_a?(String) && !r[key].empty?, "record #{r['id']} missing finite #{key}") } }
require_true(inventory.dig('counts', 'windows_storage_location_not_verified') == 4, 'Windows storage-not-verified count')
require_true(inventory.dig('counts', 'windows_rotation_not_established') == 10, 'Windows rotation-not-established count')
require_true(inventory.dig('current_vs_target', 'codex_production_credential_visibility', 'target') == 0, 'Codex target visibility')
require_true(inventory.dig('current_vs_target', 'qwen_local_model_production_credential_visibility', 'target') == 0, 'Qwen target visibility')
require_true(inventory['operation_counts'].values.all? { |v| v == 0 }, 'repository mutation count')

unique!(denies['records'].map { |r| r['deny_id'] }, 'production deny ID')
routes = graph['routes']
unique!(routes.map { |r| r['route_id'] }, 'merged route ID')
route_fields = %w[owner source_principal destination_class endpoint_owner credential_class data_classification_state policy_gateway_state router_state fallback_owner redaction_owner logging_owner external_egress_classification production_status evidence]
routes.each { |r| route_fields.each { |key| require_true(r[key].is_a?(String) && !r[key].empty?, "route #{r['route_id']} missing #{key}") } }
require_true(graph.dig('current_state', 'principals').any? { |p| p['id'] == 'inference-policy-gateway' && p['authority'] == 'POLICY_GATEWAY_NOT_PRESENT' }, 'current Policy Gateway state')
require_true(graph.dig('target_state', 'inference_path') == ['Inference Request', 'verified installation/farm scope', 'classification', 'purpose', 'policy', 'redaction/minimization', 'Allowed Provider Set', 'Model Router', 'registered Provider'], 'target authority path')
require_true(graph.dig('target_state', 'production_credential_visibility', 'codex') == 0, 'graph Codex target visibility')
require_true(graph.dig('target_state', 'production_credential_visibility', 'qwen_local_model') == 0, 'graph Qwen target visibility')
require_true(graph['provider_assurance'].all? { |p| %w[VERIFIED NOT_CONFIGURED NOT_ESTABLISHED NOT_APPLICABLE REQUIRES_LATER_VERIFICATION].include?(p['assurance_state']) }, 'provider assurance state')

threat_rows = threat_model.lines.select { |line| line.start_with?('| TM-B-') }
threat_ids = threat_rows.map { |line| line[/TM-B-\d+/] }
unique!(threat_ids, 'critical threat ID')
require_true(threat_ids.length == 15, 'critical threat count')
threat_rows.each do |row|
  columns = row.split('|').map(&:strip)[1..]
  columns.pop if columns.last.empty?
  require_true(columns.length == 6 && columns.all? { |value| !value.empty? }, "critical threat row structure #{row.split('|')[1].strip}")
  require_true(columns[0].match?(/\ATM-B-\d+/), 'critical threat ID field')
end
required_threats = {
  'PROMPT_INJECTION' => ['TM-B-02', /prompt-injection/],
  'SECRET_EXFILTRATION' => ['TM-B-01', /secret-exfiltration/],
  'SUPPLY_CHAIN' => ['TM-B-15', /SUPPLY_CHAIN_COMPROMISE.*exact version pinning.*fingerprinting.*source\/provenance binding.*reviewed dependency\/tool update.*deterministic fixture replay.*independent review/i],
  'DOCKER' => ['TM-B-03', /docker-control-plane/],
  'LAN_LM_STUDIO' => ['TM-B-04', /lm-studio-lan/],
  'SELF_APPROVAL' => ['TM-B-12', /reviewer-self-approval/]
}
required_threats.each do |category, (threat_id, semantic_pattern)|
  row = threat_rows.find { |line| line.match?(/\| #{Regexp.escape(threat_id)} /) }
  require_true(row && row.match?(semantic_pattern), "required B threat #{category}")
end
supply_chain_row = threat_rows.find { |line| line.match?(/\| TM-B-15 /) }
supply_chain_columns = supply_chain_row.split('|').map(&:strip)[1..]
supply_chain_columns.pop if supply_chain_columns.last.empty?
require_true(supply_chain_columns[1].include?('tampered, substituted, compromised, or unreviewed'), 'supply-chain attacker/source')
require_true(supply_chain_columns[1].include?('execution or trust of a changed/unverified distribution or dependency'), 'supply-chain precondition')
require_true(supply_chain_columns[2].include?('policy bypass') && supply_chain_columns[2].include?('falsified evidence'), 'supply-chain impact')
require_true(supply_chain_columns[3].include?('Toolchain / Coordination SOT owner') && supply_chain_columns[3].include?('fingerprinting'), 'supply-chain deterministic control and owner')
require_true(supply_chain_columns[4].include?('ESTABLISHED_BASELINE_CONTROLS') && supply_chain_columns[4].include?('FUTURE_CONTROLS_NOT_YET_IMPLEMENTED') && !supply_chain_columns[4].include?('ACTIVE'), 'supply-chain current status')
require_true(supply_chain_columns[5].include?('EF1-A/J/L/M'), 'supply-chain target gate')
require_true(supply_chain_columns[5].include?('residual risk') && (supply_chain_columns[5].include?('upstream') || supply_chain_columns[5].include?('transitive')), 'supply-chain residual risk')
%w[Asset / attacker / precondition Failure and impact Deterministic control / owner Current status Target SubDay / residual risk].each { |heading| require_true(threat_model.include?(heading), "threat model field #{heading}") }
%w[farmos-core-readonly-token farmos-core-daily-brief-token farmos-core-active-projection-token farmos-core-installation-farm-scope farmos-core-workload-private-key supabase-migration-authority github-ci-deployment-authority vercel-deployment-authority slack-app-credentials lm-studio-listener-authority].each { |id| require_true(rotation.include?(id), "rotation proposal for #{id}") }
require_true(rotation.include?('PROPOSAL_ONLY'), 'rotation proposal status')

files = [File.join(B, 'credential-inventory.redacted.json'), File.join(B, 'windows-authority-evidence.provenance.json'), File.join(B, 'authority-graph.yaml'), File.join(B, 'production-deny-identifiers.yaml'), File.join(ROOT, 'docs/architecture/day150-5-ef1-b-threat-model.md'), File.join(ROOT, 'docs/architecture/day150-5-ef1-b-credential-rotation-proposal.md')]
forbidden_key = /\A(value|secret|token|password|connection_string|private_key)\z/i
require_true((deep_keys(inventory) + deep_keys(provenance)).none? { |key| forbidden_key.match?(key) }, 'credential value field')
secret_pattern = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s]+)/i
require_true(files.none? { |file| File.read(file).match?(secret_pattern) }, 'secret pattern scan')

puts 'DAY150_5_B_DETERMINISTIC_VALIDATION_PASS'
