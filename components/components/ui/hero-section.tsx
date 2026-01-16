import Link from "next/link";

import { BiRightArrowAlt } from "react-icons/bi";

export default () => {
    return (
        <section className="relative min-h-screen flex items-center pt-16 overflow-hidden border-b border-border shadow-lg shadow-border">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full bg-accent/10 blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl" />
            </div>

            <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
            }} />

            <div className="container mx-auto px-6 lg:px-12 py-20 relative z-10">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-[1.1]">
                        Ace your{" "}
                        <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                            flight theory
                        </span>{" "}
                        exams with confidence
                    </h1>

                    <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
                        The practice suite built by pilots, for pilots. Master your Commercial Pilot License theory with realistic exam simulations and intelligent progress tracking.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link href="/dashboard">
                            <button className="rounded-md bg-primary text-lg group px-6 py-3 text-base font-medium shadow-lg shadow-primary/25 hover:bg-primary/70 transition-colors cursor-pointer">
                                    <div className="flex items-center">
                                        <span>Start Practicing Free</span>
                                        <BiRightArrowAlt className="text-3xl ml-2 transition-transform group-hover:translate-x-1" />
                                    </div>
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}