import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | AviPrep",
  description: "Privacy Policy for AviPrep - How we collect, use, and protect your personal information.",
}

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-invert prose-slate max-w-none p-4 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: January 12, 2026</p>

      <p className="text-muted-foreground leading-relaxed">
        AviPrep ("we", "us", or "our") is committed to protecting your privacy and complying with the
        Australian Privacy Principles (APPs) contained in the Privacy Act 1988 (Cth). This Privacy Policy explains how
        we collect, use, disclose, and safeguard your personal information when you use our website and services (the
        "Service").
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">1. Information We Collect</h2>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">1.1 Information You Provide</h3>
      <p className="text-muted-foreground leading-relaxed">
        When you register for an account or use our Service, we collect the following personal information:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">Identity Information:</strong> First name, last name, and Aviation
          Reference Number (ARN).
        </li>
        <li>
          <strong className="text-foreground">Contact Information:</strong> Email address and Australian mobile phone
          number.
        </li>
        <li>
          <strong className="text-foreground">Account Credentials:</strong> Password (stored in encrypted form).
        </li>
        <li>
          <strong className="text-foreground">Payment Information:</strong> Payment card details are collected and
          processed securely by our payment processor, Stripe. We do not store your full card number on our servers.
        </li>
      </ul>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">1.2 Information Collected Automatically</h3>
      <p className="text-muted-foreground leading-relaxed">
        When you access our Service, we automatically collect certain information:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">Usage Data:</strong> Exam attempts, scores, answers, time spent studying,
          and performance statistics.
        </li>
        <li>
          <strong className="text-foreground">Device Information:</strong> Browser type, operating system, device type,
          and screen resolution.
        </li>
        <li>
          <strong className="text-foreground">Log Data:</strong> IP address, access times, pages viewed, and referring
          URLs.
        </li>
        <li>
          <strong className="text-foreground">Cookies:</strong> Session cookies for authentication and preferences (see
          Section 7).
        </li>
      </ul>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">1.3 Waitlist Information</h3>
      <p className="text-muted-foreground leading-relaxed">
        If you join our waitlist before creating an account, we collect only your email address to notify you when the
        Service launches.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">2. How We Use Your Information</h2>
      <p className="text-muted-foreground leading-relaxed">
        We use your personal information for the following purposes:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">Service Delivery:</strong> To provide, maintain, and improve our exam
          preparation platform.
        </li>
        <li>
          <strong className="text-foreground">Account Management:</strong> To create and manage your account,
          authenticate your identity, and process your subscription.
        </li>
        <li>
          <strong className="text-foreground">Personalization:</strong> To analyze your performance and provide
          AI-powered study recommendations and insights.
        </li>
        <li>
          <strong className="text-foreground">Progress Tracking:</strong> To track your exam history, scores, and study
          statistics.
        </li>
        <li>
          <strong className="text-foreground">Communications:</strong> To send you service-related notifications,
          updates, and (with your consent) promotional materials.
        </li>
        <li>
          <strong className="text-foreground">Payment Processing:</strong> To process payments and manage your
          subscription.
        </li>
        <li>
          <strong className="text-foreground">Support:</strong> To respond to your inquiries and provide customer
          support.
        </li>
        <li>
          <strong className="text-foreground">Legal Compliance:</strong> To comply with applicable laws and regulations.
        </li>
        <li>
          <strong className="text-foreground">Security:</strong> To detect, prevent, and address fraud, security issues,
          and technical problems.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">3. Legal Basis for Processing</h2>
      <p className="text-muted-foreground leading-relaxed">
        Under Australian privacy law, we process your personal information based on the following lawful grounds:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">Contractual Necessity:</strong> Processing necessary to fulfill our
          contract with you (providing the Service).
        </li>
        <li>
          <strong className="text-foreground">Consent:</strong> Where you have given explicit consent for specific
          processing activities.
        </li>
        <li>
          <strong className="text-foreground">Legitimate Interests:</strong> Processing necessary for our legitimate
          business interests, such as improving our Service and preventing fraud.
        </li>
        <li>
          <strong className="text-foreground">Legal Obligation:</strong> Processing necessary to comply with applicable
          laws.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">4. How We Share Your Information</h2>
      <p className="text-muted-foreground leading-relaxed">
        We do not sell your personal information. We may share your information with:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">Service Providers:</strong> Third-party vendors who assist in operating
          our Service, including:
          <ul className="mt-2 ml-4 space-y-1">
            <li>Stripe (payment processing)</li>
            <li>MongoDB Atlas (database hosting)</li>
            <li>OpenAI (AI-powered analytics features)</li>
          </ul>
        </li>
        <li>
          <strong className="text-foreground">Legal Requirements:</strong> When required by law, court order, or
          government request.
        </li>
        <li>
          <strong className="text-foreground">Business Transfers:</strong> In connection with a merger, acquisition, or
          sale of assets.
        </li>
        <li>
          <strong className="text-foreground">With Your Consent:</strong> For any other purpose with your explicit
          consent.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">5. Data Retention</h2>
      <p className="text-muted-foreground leading-relaxed">
        We retain your personal information for as long as necessary to provide the Service and fulfill the purposes
        described in this Privacy Policy. Specifically:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">Account Data:</strong> Retained while your account is active and for 2
          years after account closure.
        </li>
        <li>
          <strong className="text-foreground">Exam and Performance Data:</strong> Retained while your account is active
          to provide progress tracking and analytics.
        </li>
        <li>
          <strong className="text-foreground">Payment Records:</strong> Retained for 7 years as required by Australian
          tax law.
        </li>
        <li>
          <strong className="text-foreground">Waitlist Data:</strong> Retained until you unsubscribe or for 2 years,
          whichever is sooner.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">6. Data Security</h2>
      <p className="text-muted-foreground leading-relaxed">
        We implement appropriate technical and organizational measures to protect your personal information, including:
      </p>
      <ul className="text-muted-foreground space-y-2">
        <li>Encryption of data in transit using TLS/SSL.</li>
        <li>Encryption of sensitive data at rest.</li>
        <li>Secure password hashing using bcrypt.</li>
        <li>HTTP-only cookies for session management.</li>
        <li>Regular security assessments and updates.</li>
        <li>Access controls limiting employee access to personal data.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mt-4">
        While we strive to protect your personal information, no method of transmission over the Internet or electronic
        storage is 100% secure. We cannot guarantee absolute security.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">7. Cookies and Tracking</h2>
      <p className="text-muted-foreground leading-relaxed">We use cookies and similar technologies to:</p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">Essential Cookies:</strong> Required for authentication and security.
          These cannot be disabled.
        </li>
        <li>
          <strong className="text-foreground">Preference Cookies:</strong> Remember your settings and preferences.
        </li>
        <li>
          <strong className="text-foreground">Analytics Cookies:</strong> Help us understand how visitors use our
          Service (with your consent).
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mt-4">
        You can manage cookie preferences through your browser settings. Disabling essential cookies may affect Service
        functionality.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">8. Your Rights</h2>
      <p className="text-muted-foreground leading-relaxed">Under Australian privacy law, you have the right to:</p>
      <ul className="text-muted-foreground space-y-2">
        <li>
          <strong className="text-foreground">Access:</strong> Request access to the personal information we hold about
          you.
        </li>
        <li>
          <strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete
          personal information.
        </li>
        <li>
          <strong className="text-foreground">Deletion:</strong> Request deletion of your personal information (subject
          to legal retention requirements).
        </li>
        <li>
          <strong className="text-foreground">Data Portability:</strong> Request a copy of your data in a
          machine-readable format.
        </li>
        <li>
          <strong className="text-foreground">Withdraw Consent:</strong> Withdraw consent for processing based on
          consent at any time.
        </li>
        <li>
          <strong className="text-foreground">Opt-Out:</strong> Opt out of marketing communications at any time.
        </li>
        <li>
          <strong className="text-foreground">Complaint:</strong> Lodge a complaint with the Office of the Australian
          Information Commissioner (OAIC).
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mt-4">
        To exercise any of these rights, please contact us at privacy@aviprep.com.au. We will respond to your request
        within 30 days.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">9. International Data Transfers</h2>
      <p className="text-muted-foreground leading-relaxed">
        Your personal information may be transferred to and processed in countries outside Australia, including the
        United States (where some of our service providers are located). When we transfer data internationally, we
        ensure appropriate safeguards are in place to protect your information in compliance with Australian privacy
        law.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">10. Children's Privacy</h2>
      <p className="text-muted-foreground leading-relaxed">
        Our Service is not intended for individuals under 16 years of age. We do not knowingly collect personal
        information from children under 16. If you become aware that a child has provided us with personal information,
        please contact us immediately.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">11. Changes to This Policy</h2>
      <p className="text-muted-foreground leading-relaxed">
        We may update this Privacy Policy from time to time. We will notify you of material changes by posting the
        updated policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy
        periodically.
      </p>

      <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">12. Contact Us</h2>
      <p className="text-muted-foreground leading-relaxed">
        If you have questions about this Privacy Policy or our privacy practices, please contact us:
      </p>
      <div className="bg-card border border-border rounded-lg p-4 mt-4">
        <p className="text-foreground font-medium">AviPrep</p>
        <p className="text-muted-foreground">Email: privacy@aviprep.com.au</p>
        <p className="text-muted-foreground">ABN: 80 167 432 520</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 mt-4">
        <p className="text-foreground font-medium">Office of the Australian Information Commissioner</p>
        <p className="text-muted-foreground">Website: www.oaic.gov.au</p>
        <p className="text-muted-foreground">Phone: 1300 363 992</p>
      </div>
    </article>
  )
}
