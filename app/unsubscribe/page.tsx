"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Image from "next/image";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleUnsubscribe = async () => {
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch (e) {
      setStatus("error");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 text-center bg-muted rounded-xl shadow-sm border border-gray-100">
      <Image src="/img/AviPrep-logo.png" alt="AviPrep" width={150} height={50} className="mx-auto mb-6" />
      
      {status === "idle" && (
        <>
          <h1 className="text-xl font-bold mb-2">Unsubscribe from Waitlist</h1>
          <p className="text-gray-600 mb-6">Are you sure you want to remove <strong>{email}</strong> from the AviPrep launch updates?</p>
          <button 
            onClick={handleUnsubscribe}
            className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-700 transition cursor-pointer"
          >
            Confirm Unsubscribe
          </button>
        </>
      )}

      {status === "loading" && <p>Processing...</p>}

      {status === "success" && (
        <div className="text-green-600">
          <h1 className="text-xl font-bold mb-2">Unsubscribed</h1>
          <p>You have been successfully removed from our waitlist. We're sorry to see you go!</p>
          <a href="/" className="inline-block mt-6 text-blue-600 hover:underline">Return to Home</a>
        </div>
      )}

      {status === "error" && (
        <p className="text-red-600">Something went wrong. Please try again or contact support.</p>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}