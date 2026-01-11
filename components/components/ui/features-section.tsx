import { FaBookOpen } from "react-icons/fa6";
import { FiTarget } from "react-icons/fi";
import { IoBarChart } from "react-icons/io5";
import { BiSolidZap } from "react-icons/bi";

const features = [
    {
        icon: FaBookOpen,
        title: "Comprehensive Coverage",
        description: "Every point of the Part 61 Manual of Standards is covered with curated questions."
    },
    {
        icon: FiTarget,
        title: "Exam Simulation",
        description: "Timed tests that provide a simulated PEXO exam environment. Know exactly what to expect."
    },
    {
        icon: IoBarChart,
        title: "Smart Analytics",
        description: "AI-powered insights identify your weak areas and suggest focused study plans."
    },
    {
        icon: BiSolidZap,
        title: "Instant Feedback",
        description: "Detailed explanations for every answer help you improve your results immediately."
    }
]

export default () => {
    return (
        <section id="features" className="py-24">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="max-w-2xl mx-auto text-center mb-16">
                    <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                        Features
                    </p>
                    <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-balance">
                        Everything you need to pass on your first attempt
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Built from the ground up with student pilots in mind. No fluff, just the tools that actually help.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {features.map(feature => (
                        <div key={feature.title} className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300">
                            <div className="flex items-start gap-4">
                                <div className="rounded-lg p-1 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <feature.icon className="text-lg" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}