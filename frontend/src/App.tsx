import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

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
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
