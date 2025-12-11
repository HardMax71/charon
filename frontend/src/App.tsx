import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { HomePage } from './pages/HomePage';
import { ResultsPage } from './pages/ResultsPage';
import { TemporalAnalysisPage } from './pages/TemporalAnalysisPage';
import { FitnessPage } from './pages/FitnessPage';
import { RefactoringPage } from './pages/RefactoringPage';
import { PerformancePage } from './pages/PerformancePage';
import { ProgressIndicator } from './components/ProgressIndicator/ProgressIndicator';
import { DependencyModal } from './components/DependencyModal/DependencyModal';
import { ClusterModal } from './components/ClusterModal/ClusterModal';
import { ImpactAnalysisModal } from './components/ImpactAnalysisModal/ImpactAnalysisModal';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { ToastContainer } from './components/Toast/ToastContainer';
import { setupGlobalErrorHandler } from './utils/globalErrorHandler';
import { useGitHubAuth } from './stores/githubAuthStore';
import { logger } from './utils/logger';

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const handleOAuthCallback = useGitHubAuth((state) => state.handleOAuthCallback);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('oauth_state');

    if (code) {
      window.history.replaceState({}, '', window.location.pathname);

      const processedCode = sessionStorage.getItem('oauth_processed_code');
      if (processedCode === code) {
        return;
      }
      sessionStorage.setItem('oauth_processed_code', code);

      if (storedState && state !== storedState) {
        logger.error('OAuth state mismatch - possible CSRF attack');
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_processed_code');
        return;
      }

      sessionStorage.removeItem('oauth_state');

      handleOAuthCallback(code).then((success) => {
        setTimeout(() => sessionStorage.removeItem('oauth_processed_code'), 5000);

        if (success) {
          const returnTo = sessionStorage.getItem('oauth_return_to');
          if (returnTo) {
            sessionStorage.removeItem('oauth_return_to');
            navigate(returnTo);
          }
        }
      });
    }
  }, [handleOAuthCallback, navigate]);

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/fitness" element={<FitnessPage />} />
        <Route path="/refactoring" element={<RefactoringPage />} />
        <Route path="/temporal" element={<TemporalAnalysisPage />} />
        <Route path="/performance" element={<PerformancePage />} />
      </Routes>

      <ProgressIndicator />
      <DependencyModal />
      <ClusterModal />
      <ImpactAnalysisModal />
      <ToastContainer />

      {!isHomePage && <Footer />}
    </div>
  );
};

function App() {
  useEffect(() => {
    setupGlobalErrorHandler();
  }, []);
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
