import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AviPrep | Terms of Service",
  description: "Terms of Service for AviPrep - Australia's CPL theory exam preparation platform.",
}

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-invert prose-slate max-w-none p-4 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: January 12, 2026</p>

      <p className="text-muted-foreground leading-relaxed">
        Welcome to AviPrep. These Terms of Service ("Terms") govern your use of the AviPrep website,
        applications, and services (collectively, the "Service") operated by AviPrep ("we", "us", or
        "our"), an Australian business.
      </p>

      <p className="text-muted-foreground leading-relaxed">
        By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these
        Terms, you may not access the Service.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">1. Definitions</h2>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">"Account"</strong> means a unique account created for you to access our
          Service.
        </li>
        <li>
          <strong className="text-foreground">"Content"</strong> means any questions, explanations, study materials, and
          other educational content available through the Service.
        </li>
        <li>
          <strong className="text-foreground">"Subscription"</strong> means a recurring payment plan that grants access
          to the Service.
        </li>
        <li>
          <strong className="text-foreground">"User"</strong> or <strong className="text-foreground">"You"</strong>{" "}
          means any individual who accesses or uses the Service.
        </li>
        <li>
          <strong className="text-foreground">"ARN"</strong> means Aviation Reference Number issued by the Civil
          Aviation Safety Authority (CASA).
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">2. Account Registration</h2>
      <p className="text-muted-foreground leading-relaxed">
        To access certain features of the Service, you must register for an account. When registering, you agree to:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          Provide accurate, current, and complete information, including your legal name, email address, Australian
          phone number, and Aviation Reference Number (ARN).
        </li>
        <li>Maintain and promptly update your account information to keep it accurate and complete.</li>
        <li>Maintain the security and confidentiality of your account credentials.</li>
        <li>Accept responsibility for all activities that occur under your account.</li>
        <li>Notify us immediately of any unauthorized use of your account.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mt-4">
        You must be at least 16 years of age to create an account. By creating an account, you represent that you meet
        this age requirement.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">3. Subscriptions and Payments</h2>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">3.1 Subscription Plans</h3>
      <p className="text-muted-foreground leading-relaxed">We offer the following access options:</p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">Individual Subject Access:</strong> One-time payment granting access to a
          single subject for 12 months from the date of purchase.
        </li>
        <li>
          <strong className="text-foreground">CPL Bundle Subscription:</strong> Quarterly recurring subscription
          granting access to all subjects and premium features.
        </li>
      </ul>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">3.2 Payment Processing</h3>
      <p className="text-muted-foreground leading-relaxed">
        All payments are processed securely through Stripe, our third-party payment processor. By providing payment
        information, you represent that you are authorized to use the payment method and authorize us to charge the
        applicable fees. All prices are in Australian Dollars (AUD) and include GST where applicable.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">3.3 Automatic Renewal</h3>
      <p className="text-muted-foreground leading-relaxed">
        CPL Bundle Subscriptions automatically renew every 3 months unless cancelled before the renewal date. You will
        be charged the then-current subscription fee upon each renewal. You may cancel your subscription at any time
        through your account settings.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">3.4 Refunds</h3>
      <p className="text-muted-foreground leading-relaxed">
        In accordance with Australian Consumer Law, you may request a refund within 7 days of purchase if you have not
        substantially used the Service. Refund requests should be submitted to support@aviprep.com.au. We reserve the
        right to deny refund requests where significant use of the Service has occurred.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">4. Use of Service</h2>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">4.1 Permitted Use</h3>
      <p className="text-muted-foreground leading-relaxed">
        You are granted a limited, non-exclusive, non-transferable license to access and use the Service for your
        personal, non-commercial educational purposes, specifically for preparing for CASA CPL theory examinations.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">4.2 Prohibited Conduct</h3>
      <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
      <ul className="text-muted-foreground space-y-2">
        <li>Share, distribute, reproduce, or make available any Content to third parties.</li>
        <li>Use automated systems, bots, or scripts to access the Service or extract Content.</li>
        <li>Share your account credentials with others or allow others to access your account.</li>
        <li>Attempt to circumvent, disable, or interfere with security features of the Service.</li>
        <li>Use the Service for any illegal purpose or in violation of any applicable laws.</li>
        <li>Reverse engineer, decompile, or disassemble any portion of the Service.</li>
        <li>Remove, alter, or obscure any proprietary notices on the Service or Content.</li>
        <li>Use the Content to create competing products or services.</li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">5. Intellectual Property</h2>
      <p className="text-muted-foreground leading-relaxed">
        The Service, including all Content, features, and functionality, is owned by AviPrep and is
        protected by Australian and international copyright, trademark, and other intellectual property laws. Our
        trademarks and trade dress may not be used without our prior written consent.
      </p>
      <p className="text-muted-foreground leading-relaxed mt-4">
        All questions, explanations, study materials, and educational content are original works created by AviPrep
        or licensed from third parties. You acknowledge that you acquire no ownership rights by using the Service.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">6. Educational Disclaimer</h2>
      <p className="text-muted-foreground leading-relaxed">
        The Service is designed to supplement your CPL theory exam preparation. While our Content is aligned with the
        CASA CPL syllabus, we make no guarantee that:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>Using the Service will result in passing any CASA examination.</li>
        <li>The Content covers all topics that may appear on CASA examinations.</li>
        <li>The Content reflects the most current CASA regulations or examination requirements.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mt-4">
        AviPrep is not affiliated with, endorsed by, or sponsored by the Civil Aviation Safety Authority (CASA).
        You are responsible for ensuring you meet all CASA requirements for examination eligibility.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">7. AI-Powered Features</h2>
      <p className="text-muted-foreground leading-relaxed">
        Our Service includes AI-powered features that analyze your performance and provide personalized recommendations.
        These features are provided for informational purposes only. AI-generated insights and recommendations should be
        used as one of many tools in your study preparation and are not a substitute for comprehensive study of the CASA
        syllabus.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">8. Limitation of Liability</h2>
      <p className="text-muted-foreground leading-relaxed">
        To the maximum extent permitted by Australian law, AviPrep and
        affiliates shall not be liable for:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>Any indirect, incidental, special, consequential, or punitive damages.</li>
        <li>Any loss of profits, data, or business opportunities.</li>
        <li>Any damages resulting from your failure to pass any CASA examination.</li>
        <li>Any interruption or cessation of the Service.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mt-4">
        Our total liability for any claims arising from your use of the Service shall not exceed the amount you paid to
        us in the 12 months preceding the claim.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">9. Termination</h2>
      <p className="text-muted-foreground leading-relaxed">
        We may terminate or suspend your account and access to the Service immediately, without prior notice or
        liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will
        immediately cease.
      </p>
      <p className="text-muted-foreground leading-relaxed mt-4">
        You may terminate your account at any time by contacting us at support@aviprep.com.au. Termination does not
        entitle you to any refund of fees already paid.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">10. Changes to Terms</h2>
      <p className="text-muted-foreground leading-relaxed">
        We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the
        updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after such
        changes constitutes acceptance of the modified Terms.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">11. Governing Law</h2>
      <p className="text-muted-foreground leading-relaxed">
        These Terms shall be governed by and construed in accordance with the laws of New South Wales, Australia,
        without regard to conflict of law provisions. Any disputes arising from these Terms or your use of the Service
        shall be subject to the exclusive jurisdiction of the courts of New South Wales.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">12. Contact Us</h2>
      <p className="text-muted-foreground leading-relaxed">
        If you have any questions about these Terms, please contact us at:
      </p>
      <div className="bg-card border border-border rounded-lg p-4 mt-4">
        <p className="text-foreground font-medium">AviPrep</p>
        <p className="text-muted-foreground">Email: support@aviprep.com.au</p>
        <p className="text-muted-foreground">ABN: 80 167 432 520</p>
      </div>
    </article>
  )
}
