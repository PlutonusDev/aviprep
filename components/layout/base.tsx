import Footer from "@/components/ui/footer";
import Navbar from "@/components/ui/navbar";

export default ({ children }: Readonly<{ children: React.ReactNode }>) => {
    return (
        <main className="antialiased dark">
            <Navbar />
            {children}
            <Footer />
        </main>
    )
}