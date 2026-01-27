"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { BiRightArrowAlt } from "react-icons/bi"

export default () => {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }))
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Login failed")
                setIsLoading(false)
                return
            }

            router.push("/m/dashboard")
        } catch {
            setError("An unexpected error occurred. Please try again.")
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="standalone-container h-screen w-full px-4 flex flex-col gap-2 items-center justify-end">
            <img className="max-w-[60%] mb-8 self-center absolute top-[20%] left-1/2 transform -translate-x-1/2" src="/img/AviPrep-logo.png" />
            <div className="absolute w-full px-8 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col gap-4">
                <div className="w-full flex flex-col justify-center gap-1">
                    <Input value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading} id="email" name="email" type="email" placeholder="Email" className="text-lg text-center h-12" />
                </div>
                <div className="relative w-full flex flex-col justify-center gap-1">
                    <Input value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={isLoading} id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Password" className="text-lg text-center h-12" />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                    </button>
                </div>
                {error && (
                    <div className="w-full flex items-center justify-center gap-4 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
            <div className="w-full flex flex-col items-center justify-center gap-4 transform -translate-y-1/2">
                <p className="text-sm text-muted-foreground h-10">Don&apos;t have an account? <a href="/m/register" className="text-primary hover:underline">Sign up</a></p>
                <Button type="submit" variant="outline" size="lg" className="w-full" disabled={isLoading}>
                    <div className="flex items-center text-lg font-medium">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <span>Login</span>
                                <BiRightArrowAlt className="text-4xl ml-2 transition-transform" />
                            </>
                        )}
                    </div>
                </Button>
            </div>
        </form>
    )
}