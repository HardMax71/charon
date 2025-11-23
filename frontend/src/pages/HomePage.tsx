import { useGraphStore } from '@/stores/graphStore';
import { exampleGraph } from '@/data/exampleGraph';
import { HeroSection } from '@/components/HomePage/HeroSection';
import { FeaturesSection } from '@/components/HomePage/FeaturesSection';
import { DemoSection } from '@/components/HomePage/DemoSection';

export const HomePage = () => {
  const graph = useGraphStore(state => state.graph);

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth">
      <HeroSection />

      <div className="h-[calc(100vh-4rem)] w-full shrink-0 snap-start bg-white flex flex-col overflow-hidden">
        <FeaturesSection />
        <DemoSection graph={graph || exampleGraph} />
      </div>
    </div>
  );
};
