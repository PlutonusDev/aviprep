import BaseLayout from "@/layout/base";
import ContactSection from "@/components/ui/contact-section"
import FeaturesSection from "@/components/ui/features-section"
import HeroSection from "@/components/ui/hero-section"
import StatsSection from "@/components/ui/stats-section"

export default () => {
    return (
        <BaseLayout>
            <main className="min-h-screen">
                <HeroSection />
                <FeaturesSection />
                <StatsSection />
                <ContactSection />
            </main>
        </BaseLayout>
    )
}