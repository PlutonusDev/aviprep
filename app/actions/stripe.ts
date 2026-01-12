"use server";

import { stripe } from "lib/stripe";
import { getProductById } from "lib/products";

export async function createCheckoutSession(productIds: string[], returnUrl: string) {
    const products = productIds.map(id => {
        const product = getProductById(id);
        if(!product) throw new Error(`Product with id "${id}" not found`);
        return product;
    });

    if(products.length === 0) throw new Error("No products selected");

    const hasSubscription = products.some(p => p.type === "subscription");
    const mode = hasSubscription ? "subscription" : "payment";

    const lineItems = products.map(product => {
        if(product.type === "subscription") {
            return {
                price_data: {
                    currency: "aud",
                    product_data: {
                        name: product.name,
                        description: product.description,
                    },
                    unit_amount: product.priceInCents,
                    recurring: {
                        interval: "month",
                        interval_count: 3,
                    },
                },
                quantity: 1,
            }
        }

        return {
            price_data: {
                currency: "aud",
                product_data: {
                    name: product.name,
                    description: product.description
                },
                unit_amount: product.priceInCents
            },
            quantity: product.id === "addon-ai-insights" ? products.filter(p => !p.id.startsWith("addon")).length : 1,
        }
    });

    const session = await stripe.checkout.sessions.create({
        ui_mode: "embedded",
        redirect_on_completion: "always",
        return_url: returnUrl,
        line_items: lineItems,
        mode: mode,
        payment_method_types: ["card"],
    });
    return session.client_secret;
}

export async function getCheckoutSessionStatus(sessionId: string) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email
    };
}