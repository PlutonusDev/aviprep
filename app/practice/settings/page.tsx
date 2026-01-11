import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { AiFillNotification } from "react-icons/ai"
import { FaCreditCard, FaShield, FaTriangleExclamation, FaUser } from "react-icons/fa6"

export default () => {
    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FaUser />
                        Profile
                    </CardTitle>
                    <CardDescription>Your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xl">JH</AvatarFallback>
                        </Avatar>
                        <div>
                            <Button variant="outline" size="sm" className="bg-transparent">
                                Change Photo
                            </Button>
                        </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" defaultValue="Joshua" content="Joshua" disabled className="bg-secondary border-0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" defaultValue="Hughes" content="Hughes" disabled className="bg-secondary border-0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" defaultValue="joshua@example.com" content="joshuajhughes1@gmail.com" className="bg-secondary border-0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" type="tel" defaultValue="+61 400 000 000" content="+61 461 311 143" disabled className="bg-secondary border-0" />
                        </div>
                    </div>
                    <Button className="cursor-pointer">Save Changes</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AiFillNotification />
                        Notifications
                    </CardTitle>
                    <CardDescription>Configure how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Study Reminders</Label>
                            <p className="text-sm text-muted-foreground">Receive daily reminders to study</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Exam Results</Label>
                            <p className="text-sm text-muted-foreground">Receive emails with your exam results</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Progress Updates</Label>
                            <p className="text-sm text-muted-foreground">Receive weekly progress summary emails</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Marketing Emails</Label>
                            <p className="text-sm text-muted-foreground">Receive news and promotional content</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FaShield />
                        Security
                    </CardTitle>
                    <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input id="currentPassword" type="password" className="bg-secondary border-0" />
                        </div>
                        <div />
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input id="newPassword" type="password" className="bg-secondary border-0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input id="confirmPassword" type="password" className="bg-secondary border-0" />
                        </div>
                    </div>
                    <Button variant="outline" className="bg-transparent cursor-pointer">Update Password</Button>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FaCreditCard />
                        Subscription
                    </CardTitle>
                    <CardDescription>Manage your subscription and billing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">CPL Bundle</p>
                                <Badge>Active</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">All subjects included • Renews Mar 4, 2026</p>
                        </div>
                        <Button variant="outline" className="bg-transparent cursor-pointer">Manage</Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="bg-transparent cursor-pointer">View Invoices</Button>
                        <Button variant="outline" className="bg-transparent cursor-pointer">Update Payment Method</Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-red-600">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                        <FaTriangleExclamation />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>Irreversible actions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-red-900/20 border border-red-600/40">
                        <div>
                            <p className="font-medium text-foreground">Delete Account</p>
                            <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
                        </div>
                        <Button className="border-red-600 cursor-pointer">Delete Account</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}