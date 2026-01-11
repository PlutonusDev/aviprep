import { Suspense } from "react"
import { FaSpinner } from "react-icons/fa6"
import CheckoutContent from "./checkout-content"

export default () => {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                    <FaSpinner className="text-xl animate-spin text-muted-foreground" />
                </div>
            }
        >
            <CheckoutContent />
        </Suspense>
    )
}