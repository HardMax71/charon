export type RuleType =
  | 'import_restriction'
  | 'max_coupling'
  | 'no_circular'
  | 'max_third_party_percent'
  | 'max_depth'
  | 'max_complexity';

export type Severity = 'error' | 'warning' | 'info';

export interface FitnessRule {
  id: string;
  name: string;
  description: string;
  rule_type: RuleType;
  severity: Severity;
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface FitnessViolation {
  rule_id: string;
  rule_name: string;
  severity: Severity;
  message: string;
  details: Record<string, any>;
  affected_modules: string[];
}

export interface FitnessValidationResult {
  passed: boolean;
  total_rules: number;
  violations: FitnessViolation[];
  errors: number;
  warnings: number;
  infos: number;
  timestamp: string;
  summary: string;
}

export interface FitnessRuleConfig {
  version: string;
  rules: FitnessRule[];
}

export interface AnalysisSource {
  type: 'github' | 'local' | 'import';
  url?: string;
  fileName?: string;
  timestamp: string;
}
