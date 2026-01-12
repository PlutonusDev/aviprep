import HubLayout from "@/layout/hub";
import { UserProvider } from "@lib/user-context";

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <UserProvider>
            <HubLayout>
                {children}
            </HubLayout>
        </UserProvider>
    )
}