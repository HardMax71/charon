export interface FileInput {
  path: string;
  content: string;
}

export interface AnalyzeRequest {
  source: 'github' | 'local' | 'import';
  url?: string;
  files?: FileInput[];
  data?: any;
}

export interface ProgressUpdate {
  message: string;
  progress: number;
}

export interface SSEEvent {
  type?: 'result' | 'error';
  data?: any;
  message?: string;
  progress?: number;
}
