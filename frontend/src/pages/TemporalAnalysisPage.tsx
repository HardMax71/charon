import { useState } from 'react';
import { GitBranch, TrendingUp } from 'lucide-react';
import { TemporalInput } from '@/components/TemporalAnalysis/TemporalInput';
import { TemporalVisualization } from '@/components/TemporalAnalysis/TemporalVisualization';
import { TemporalAnalysisResponse } from '@/types/temporal';

export const TemporalAnalysisPage = () => {
  const [analysisData, setAnalysisData] = useState<TemporalAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleStartAnalysis = (data: TemporalAnalysisResponse) => {
    setAnalysisData(data);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats Bar (only when analysis data exists) */}
      {analysisData && (
        <div className="bg-surface border-b border-border-light px-6 py-4">
          <div className="flex items-center justify-end gap-6 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <GitBranch className="w-4 h-4" />
              <span className="font-mono font-semibold text-text-primary">
                {analysisData.analyzed_commits}
              </span>
              <span>commits analyzed</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <TrendingUp className="w-4 h-4" />
              <span className="font-mono font-semibold text-text-primary">
                {analysisData.churn_data?.total_changes || 0}
              </span>
              <span>changes detected</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!analysisData ? (
          <TemporalInput
            onAnalysisComplete={handleStartAnalysis}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
          />
        ) : (
          <TemporalVisualization data={analysisData} />
        )}
      </div>
    </div>
  );
};
