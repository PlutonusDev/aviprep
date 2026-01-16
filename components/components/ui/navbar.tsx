import Link from "next/link";
import { BiRightArrowAlt } from "react-icons/bi";

export default () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-lg border-b border-border/50">
            <div className="container mx-auto px-6 lg:px-12">
                <nav className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="font-semibold tracking-tight">AviPrep</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                            Features
                        </Link>
                        <Link href="#stats" className="text-muted-foreground hover:text-foreground transition-colors">
                            Stats
                        </Link>
                        <Link href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                            Contact
                        </Link>
                    </div>

                    <Link href="/dashboard">
                        <button className="rounded-md bg-primary group px-4 py-1 text-base font-medium shadow-lg shadow-primary/25 hover:bg-primary/70 transition-colors cursor-pointer">
                            <div className="flex items-center">
                                <span>Start Free</span>
                                <BiRightArrowAlt className="text-xl ml-1.5 transition-transform group-hover:translate-x-0.5" />
                            </div>
                        </button>
                    </Link>
                </nav>
            </div>
        </header>
    )
}