import axios from 'axios';
import { AnalyzeRequest, SSEEvent } from '@/types/api';
import { AnalysisResult, ImpactAnalysis, HealthScore } from '@/types/metrics';
import { DependencyGraph } from '@/types/graph';

const API_BASE = '/api';

export const analyzeCode = (
  request: AnalyzeRequest,
  onProgress: (event: SSEEvent) => void,
  onComplete: (result: AnalysisResult) => void,
  onError: (error: string) => void
) => {
  console.log('Sending analyze request:', request);

  fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(request),
  }).then(async (response) => {
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      onError(`Server error (${response.status}): ${errorText}`);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      onError('Failed to read response');
      return;
    }

    let buffer = '';

    const processLine = (line: string) => {
      if (!line) return;
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith(':')) return; // comment/heartbeat

      if (!trimmed.startsWith('data:')) return;

      // Strip duplicated prefixes like "data: data: {...}"
      const payload = trimmed.replace(/^(?:data:\s*)+/, '');
      if (!payload) return;

      try {
        const data = JSON.parse(payload);

        if (data.type === 'result') {
          onComplete(data.data);
        } else if (data.type === 'error') {
          onError(data.message);
        } else {
          onProgress(data);
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', {
          raw: line,
          parsed: payload,
          error: e instanceof Error ? e.message : String(e)
        });
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // Normalize Windows newlines
      buffer = buffer.replace(/\r\n/g, '\n');

      // Process as soon as a full line arrives
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        processLine(line);
      }
    }

    // Leave any partial line in buffer; it will be discarded when stream ends
  }).catch((error) => {
    console.error('Fetch error:', error);
    onError(error.message || 'Network error');
  });
};

export const exportAnalysis = async (
  graph: any,
  globalMetrics: any,
  projectName: string,
  format: 'json' | 'toml'
) => {
  const response = await axios.post(
    `${API_BASE}/export`,
    {
      graph,
      global_metrics: globalMetrics,
      project_name: projectName,
      format,
    },
    { responseType: 'blob' }
  );

  // Trigger download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `charon_export_${projectName}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const analyzeImpact = async (
  nodeId: string,
  graph: DependencyGraph,
  maxDepth: number = 10
): Promise<ImpactAnalysis> => {
  const response = await axios.post<ImpactAnalysis>(
    `${API_BASE}/impact-analysis`,
    {
      node_id: nodeId,
      graph: {
        nodes: graph.nodes,
        edges: graph.edges,
      },
      max_depth: maxDepth,
    }
  );

  return response.data;
};

export const calculateHealthScore = async (
  graph: DependencyGraph,
  globalMetrics: any
): Promise<HealthScore> => {
  const response = await axios.post<HealthScore>(
    `${API_BASE}/health-score`,
    {
      graph: {
        nodes: graph.nodes,
        edges: graph.edges,
      },
      global_metrics: globalMetrics,
    }
  );

  return response.data;
};
