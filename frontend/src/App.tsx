import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header/Header';
import { HomePage } from './pages/HomePage';
import { ResultsPage } from './pages/ResultsPage';
import { ProgressIndicator } from './components/ProgressIndicator/ProgressIndicator';
import { DependencyModal } from './components/DependencyModal/DependencyModal';
import { ClusterModal } from './components/ClusterModal/ClusterModal';
import { ImpactAnalysisModal } from './components/ImpactAnalysisModal/ImpactAnalysisModal';

function App() {
  return (
    <BrowserRouter>
      <div className="w-full h-full flex flex-col bg-background">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>

        {/* Modals & Overlays */}
        <ProgressIndicator />
        <DependencyModal />
        <ClusterModal />
        <ImpactAnalysisModal />
      </div>
    </BrowserRouter>
  );
}

export default App;
