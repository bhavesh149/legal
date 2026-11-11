import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { TrustStrip } from '@/components/landing/trust-strip';
import { RiskSection } from '@/components/landing/risk-section';
import { NegotiationDemo } from '@/components/landing/negotiation-demo';
import { WorkflowSection } from '@/components/landing/workflow-section';
import { SecuritySection } from '@/components/landing/security-section';
import { ComparisonSection } from '@/components/landing/comparison-section';
import { DashboardPreview } from '@/components/landing/dashboard-preview';
import { FaqSection } from '@/components/landing/faq-section';
import { FinalCTA } from '@/components/landing/final-cta';
import { Footer } from '@/components/landing/footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0A0E17] text-slate-100 overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar />
      <Hero />
      <TrustStrip />
      <RiskSection />
      <NegotiationDemo />
      <WorkflowSection />
      <SecuritySection />
      <ComparisonSection />
      <DashboardPreview />
      <FaqSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
