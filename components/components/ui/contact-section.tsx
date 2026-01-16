import Link from "next/link";
import { BiRightArrowAlt } from "react-icons/bi";
import { MdEmail } from "react-icons/md";
import { FaLinkedin } from "react-icons/fa6";

const socialLinks = [
    {
        icon: FaLinkedin,
        href: "https://linkedin.com/in/plutonus",
        label: "LinkedIn"
    }
]

export default () => {
    return (
        <section id="contact" className="py-24 bg-card/50">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="max-w-2xl mx-auto text-center">
                    <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                        Get Started
                    </p>
                    <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-balance">
                        Ready to take your exam prep to the next level?
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-8">
                        Join hundreds of student pilots already using the suite. Questions? Reach out anytime.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        <Link href="/dashboard">
                            <button className="rounded-md bg-primary text-lg group px-6 py-3 text-base font-medium shadow-lg shadow-primary/25 hover:bg-primary/70 transition-colors cursor-pointer">
                                    <div className="flex items-center">
                                        <span>Start Practicing Free</span>
                                        <BiRightArrowAlt className="text-3xl ml-2 transition-transform group-hover:translate-x-1" />
                                    </div>
                            </button>
                        </Link>
                        <Link href="mailto:joshuajhughes1@gmail.com">
                            <button className="rounded-md border-primary text-lg group px-6 py-3 text-base font-medium shadow-md shadow-white/25 hover:bg-primary/70 transition-colors cursor-pointer">
                                    <div className="flex items-center">
                                        <span>Contact Me</span>
                                        <MdEmail className="text-3xl ml-2 transition-transform" />
                                    </div>
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}