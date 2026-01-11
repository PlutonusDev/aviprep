import Link from "next/link";

export default () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-8 border-t border-border/50">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="font-bold text-primary-foreground text-sm">
                                    JH
                                </span>
                            </div>
                            <span className="font-semibold tracking-tight">CPL Prep</span>
                            <span className="text-sm text-muted-foreground">&copy; {currentYear} Joshua Hughes</span>
                        </Link>
                    </div>

                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <Link href="/privacy" className="hover:text-foreground transition-colors">
                            Privacy
                        </Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">
                            Terms
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}