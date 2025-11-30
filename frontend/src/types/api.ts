import { AnalysisResult } from './metrics';

export interface FileInput {
  path: string;
  content: string;
}

export interface AnalyzeRequest {
  source: 'github' | 'local' | 'import';
  url?: string;
  files?: FileInput[];
  data?: AnalysisResult;
  github_token?: string;
}

export interface ProgressUpdate {
  message: string;
  progress: number;
}

export interface SSEEvent {
  type?: 'result' | 'error' | 'progress';
  data?: AnalysisResult;
  message?: string;
  progress?: number;
}
