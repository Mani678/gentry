export interface Signals {
  token_count: number;
  is_arithmetic: boolean;
  is_currency_convert: boolean;
  has_code_block: boolean;
  is_multi_file: boolean;
  has_debug_keywords: boolean;
  is_summarization: boolean;
  is_factual_lookup: boolean;
  ambiguity_score: string;
}

export interface Counterfactual {
  model: string;
  estimated_cost: number;
  estimated_latency_s: number;
  expected_quality: string;
  why_not: string | null;
}

export interface Stage {
  stage: string;
  timestamp: string;
  signals?: Signals;
  cache_type?: string;
  result?: string;
  closest_match_similarity?: number;
  rule_matched?: string;
  selected_model?: string | null;
  reason?: string;
  counterfactuals?: Counterfactual[];
  model?: string | null;
  actual_cost?: number;
  actual_latency_s?: number;
  success?: boolean;
  stored?: boolean;
}

export interface GentryEvent {
  request_id: string;
  timestamp: string;
  task_type: string;
  rule_matched: string;
  selected_model: string | null;
  cache_result: string;
  success: boolean;
  actual_cost: number;
  actual_latency_s: number;
  stages_json?: string;
  stages?: Stage[];
  prompt_preview?: string;
  final_route?: string;
}

export interface RouteResponse {
  response: string;
  event: GentryEvent;
}
