import { exampleGraph, exampleMetrics } from '@/data/exampleGraph';
import { HeroSection } from '@/components/HomePage/HeroSection';
import { FeaturesSection } from '@/components/HomePage/FeaturesSection';
import { DemoSection } from '@/components/HomePage/DemoSection';

export const HomePage = () => {
  return (
    <div className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth">
      {/* Screen 1: Hero */}
      <HeroSection />

      {/* Screen 2: Features */}
      <FeaturesSection />

      {/* Screen 3: Live Demo - Always shows example graph */}
      <DemoSection graph={exampleGraph} metrics={exampleMetrics} />
    </div>
  );
};
