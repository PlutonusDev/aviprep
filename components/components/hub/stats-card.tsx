import { IconType } from "react-icons";
import { Card, CardContent } from "../ui/card";
interface StatsCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: IconType;
    trend?: {
        value: number | string;
        isPositive: boolean;
    };
}

export default ({ title, value, description, icon: Icon, trend }: StatsCardProps) => {
    return (
        <Card
            className="justify-start border border-blue-400/50 glow items-start w-full bg-card text-card-foreground shadow text-left"
        >
            <CardContent className="p-6 w-full text-left">
                {/* Added w-full to ensure the flexbox spans the entire width */}
                <div className="flex items-start justify-between w-full">
                    <div className="space-y-1 flex flex-col justify-start items-start">
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        {trend && (
                            <p className={`text-xs font-medium ${trend.isPositive ? "text-green-500" : "text-red-500"}`}>
                                {trend.isPositive ? "+" : ""}
                                {trend.value} from last week
                            </p>
                        )}
                    </div>
                    <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
                        <Icon className="text-lg" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}