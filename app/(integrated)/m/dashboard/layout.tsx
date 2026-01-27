import Navigation from "@/components/mobile/navigation"

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="standalone-container">
            <Navigation />
            {children}
        </div>
    )
}