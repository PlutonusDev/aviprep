const stats = [
    {
        value: "7",
        label: "Theory Subjects"
    },
    {
        value: "24/7",
        label: "Access"
    },
    {
        value: "5,000+",
        label: "Practice Questions"
    },
    {
        value: "96%",
        label: "Pass Rate"
    }
]

export default () => {
    return (
        <section id="stats" className="py-16 border-y border-border/50 bg-card/50">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map(stat => (
                        <div key={stat.label} className="text-center">
                            <div className="text-3xl lg:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}