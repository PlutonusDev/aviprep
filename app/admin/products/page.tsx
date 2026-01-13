import type { Metadata } from "next"
import { ProductsContent } from "./products-content"

export const metadata: Metadata = {
  title: "Products",
}

export default function ProductsPage() {
  return <ProductsContent />
}
