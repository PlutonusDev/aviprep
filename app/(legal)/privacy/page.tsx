import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AviPrep collects, uses, shares and protects your personal information.",
}

const LAST_UPDATED = "15 September 2026"

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-4 mt-12 text-xl font-semibold text-foreground">{children}</h2>
)
const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 mt-6 text-lg font-medium text-foreground">{children}</h3>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 leading-relaxed text-muted-foreground">{children}</p>
)
const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground marker:text-muted-foreground/60">{children}</ul>
)
const B = ({ children }: { children: React.ReactNode }) => <strong className="font-medium text-foreground">{children}</strong>
const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-primary underline underline-offset-4 hover:text-primary/80">
    {children}
  </a>
)

export default function PrivacyPolicyPage() {
  return (
    <article className="max-w-none">
      <h1 className="mb-2 text-display-3 font-bold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <P>
        AviPrep (&quot;AviPrep&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;, ABN 80 167 432 520) provides online theory
        exam preparation for pilots. We are bound by the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy
        Principles (APPs). This policy explains what personal information we collect, why, who we share it with, and the
        choices and rights you have. It applies to our website, web app and installable app (together, the
        &quot;Service&quot;).
      </P>
      <P>
        In short: we collect what we need to run your account and help you study, we don&apos;t sell your information,
        and we don&apos;t use it for third-party advertising.
      </P>

      <H2>1. Information we collect</H2>

      <H3>1.1 Information you give us</H3>
      <UL>
        <li>
          <B>Account details:</B> your first and last name, email address, Australian mobile number and Aviation
          Reference Number (ARN).
        </li>
        <li>
          <B>Sign-in details:</B> your password, which we store only as a one-way hash (we can never see it).
        </li>
        <li>
          <B>Profile:</B> a profile photo, if you choose to add one.
        </li>
        <li>
          <B>Community content:</B> forum posts, replies, reactions, and private messages you send to other members.
        </li>
        <li>
          <B>Support and requests:</B> anything you tell us when you contact support or request a change to, or closure
          of, your account.
        </li>
        <li>
          <B>Waitlist:</B> your email address and mobile number if you join our waitlist.
        </li>
        <li>
          <B>Flight school and RTO enquiries:</B> your name, organisation, work email and (optionally) phone number if you
          contact our partnerships team.
        </li>
      </UL>

      <H3>1.2 Information created when you use the Service</H3>
      <UL>
        <li>
          <B>Study activity:</B> lessons started and completed, exam attempts, the answers you chose, scores, time spent,
          flagged questions and study streaks.
        </li>
        <li>
          <B>Purchases and access:</B> the subjects you have access to, when access starts and ends, and your free subject
          choice. Card details are collected directly by our payment processor, Stripe; we never receive or store your
          full card number.
        </li>
        <li>
          <B>Verification records:</B> when your mobile number and email address were confirmed. One-time SMS codes are
          stored only in hashed form and expire after 10 minutes.
        </li>
        <li>
          <B>Technical data:</B> IP address, browser and device type, and timestamps, which our servers record for
          security, fraud prevention and troubleshooting.
        </li>
      </UL>

      <H3>1.3 Information from flight schools</H3>
      <P>
        If you study through a flight school or registered training organisation (&quot;school&quot;) using an AviPrep school
        portal, your school may create your account and give us your name, email address and contact details, and tell
        us which subjects to make available to you.
      </P>

      <H2>2. How we use your information</H2>
      <UL>
        <li>
          <B>To provide the Service:</B> create and secure your account, give you access to the subjects you have,
          save your progress, and show your results, history and statistics.
        </li>
        <li>
          <B>To personalise your study:</B> choose practice questions (for example, prioritising questions you
          haven&apos;t seen or last answered incorrectly) and highlight subjects and topics that need attention. These
          insights are produced by our own rules and calculations from your study activity. We do not send your
          personal information to third-party artificial intelligence services to generate them.
        </li>
        <li>
          <B>To keep accounts safe:</B> verify your mobile number and email address, send sign-in and password-reset
          codes, remember trusted devices, and detect and prevent fraud, abuse and misuse.
        </li>
        <li>
          <B>To process payments:</B> take payment, manage subscriptions and renewals, and keep records required by law.
        </li>
        <li>
          <B>To communicate with you:</B> send service messages (such as receipts, verification codes, security alerts,
          forum and message notifications, and important changes) and respond to support requests.
        </li>
        <li>
          <B>Marketing, with your consent:</B> tell you about launches, new subjects and offers. Every marketing email
          includes an unsubscribe link, in line with the <em>Spam Act 2003</em> (Cth).
        </li>
        <li>
          <B>To improve the Service:</B> understand which features and content work well, using aggregated or
          de-identified information where possible.
        </li>
        <li>
          <B>To meet legal obligations:</B> comply with tax, consumer and other laws, and respond to lawful requests.
        </li>
      </UL>

      <H2>3. Who can see your information</H2>

      <H3>3.1 Other members</H3>
      <P>
        Your name and profile photo appear next to your forum posts and messages. Forum posts are visible to other
        members with forum access. Private messages are visible to you and the person you message. Your exam results,
        study activity, email address, mobile number and ARN are never shown to other members.
      </P>

      <H3>3.2 Your flight school</H3>
      <P>
        If your account is provided through a school, that school can see your name, contact details, the subjects
        assigned to you, and your study progress and exam results, so it can support your training. Your school handles
        that information under its own privacy obligations.
      </P>

      <H3>3.3 Our team</H3>
      <P>
        Access to personal information inside AviPrep is limited by role. Content curators who help write lessons and
        questions cannot access member accounts, contact details, results or payment information.
      </P>

      <H3>3.4 Service providers</H3>
      <P>We use trusted providers to run the Service. They may only use your information to provide their services to us:</P>
      <UL>
        <li>
          <B>Stripe</B> (payments and billing), <B>MongoDB Atlas</B> (database hosting), <B>ClickSend</B> (SMS
          verification codes), <B>Google Workspace</B> (sending email), and <B>Google reCAPTCHA</B> (protecting our public
          forms from spam and abuse).
        </li>
        <li>Our website and application hosting providers.</li>
      </UL>

      <H3>3.5 Other disclosures</H3>
      <UL>
        <li>When required or authorised by law, such as a court order or a request from a regulator or law enforcement.</li>
        <li>To protect the safety, rights or property of our members, the public or AviPrep.</li>
        <li>
          If our business is sold or restructured, to the new owner, who must continue to protect your information in
          line with this policy.
        </li>
        <li>With your consent.</li>
      </UL>
      <P>
        <B>We do not sell your personal information</B>, and we do not share it with advertisers or data brokers.
      </P>

      <H2>4. Overseas disclosure</H2>
      <P>
        Some of our service providers store or process information outside Australia, including in the United States
        and other countries where they operate. Before disclosing information overseas we take reasonable steps, as
        required by APP 8, to ensure it is handled in a way consistent with the APPs, including through contractual
        protections.
      </P>

      <H2>5. Cookies and local storage</H2>
      <P>We keep this to what the Service needs:</P>
      <UL>
        <li>
          <B>Essential cookies:</B> a secure, HTTP-only session cookie that keeps you signed in (up to 7 days), and, if you
          choose &quot;remember this device&quot;, a trusted-device cookie that skips the sign-in code on that device for up to
          30 days.
        </li>
        <li>
          <B>Preferences:</B> settings such as light or dark mode, stored in your browser.
        </li>
        <li>
          <B>Security:</B> Google reCAPTCHA sets cookies on pages with public forms to tell people from bots. Its use is
          subject to Google&apos;s <A href="https://policies.google.com/privacy">Privacy Policy</A> and{" "}
          <A href="https://policies.google.com/terms">Terms</A>.
        </li>
      </UL>
      <P>
        We do not use advertising or cross-site tracking cookies. You can clear or block cookies in your browser, but the
        Service won&apos;t work without essential cookies.
      </P>

      <H2>6. How we protect your information</H2>
      <UL>
        <li>Encryption in transit (HTTPS/TLS) across the Service.</li>
        <li>Passwords stored with a strong one-way hashing algorithm; verification codes stored hashed.</li>
        <li>SMS verification for sign-up, new-device sign-in, password resets and account closure requests.</li>
        <li>HTTP-only, secure session cookies and role-based access for our team.</li>
        <li>Reputable infrastructure providers with their own security certifications.</li>
      </UL>
      <P>
        No system is completely secure, but we work hard to protect your information. If a data breach is likely to
        result in serious harm, we will notify you and the Office of the Australian Information Commissioner (OAIC) as
        required by the Notifiable Data Breaches scheme.
      </P>

      <H2>7. How long we keep information</H2>
      <UL>
        <li>
          <B>Account and study data:</B> while your account is open. After your account is closed we delete or de-identify
          it within 90 days, unless we need to keep something longer for the reasons below.
        </li>
        <li>
          <B>Payment and tax records:</B> for at least 5 years, as required by Australian tax law.
        </li>
        <li>
          <B>Forum posts:</B> on account closure, posts that others have replied to may be kept in a de-identified form so
          discussions still make sense.
        </li>
        <li>
          <B>Verification codes:</B> expire after 10 minutes and are removed periodically.
        </li>
        <li>
          <B>Waitlist details:</B> until you unsubscribe, create an account, or 2 years after you joined, whichever comes
          first.
        </li>
        <li>
          <B>Enquiries:</B> for as long as needed to respond and manage any resulting relationship, then up to 2 years.
        </li>
      </UL>

      <H2>8. Your choices and rights</H2>
      <UL>
        <li>
          <B>Access and correction:</B> you can ask for a copy of the personal information we hold about you, and ask us to
          correct anything inaccurate. Some details can be viewed in Settings; others we update on request because
          they&apos;re tied to identity verification.
        </li>
        <li>
          <B>Closing your account:</B> request closure from Settings (we&apos;ll confirm it with a code sent to your
          mobile) or email us.
        </li>
        <li>
          <B>Marketing:</B> unsubscribe at any time using the link in any marketing email.
        </li>
        <li>
          <B>Anonymity:</B> you can browse our public pages and contact us with general questions without identifying
          yourself. Using your account requires your details, as we need them to provide the Service securely.
        </li>
      </UL>
      <P>
        To make a request, email <A href="mailto:privacy@aviprep.com.au">privacy@aviprep.com.au</A>. We may need to
        verify your identity first. We aim to respond within 30 days, and we won&apos;t charge you to make a request.
      </P>

      <H2>9. Children</H2>
      <P>
        The Service is designed for people aged 16 and over. If you are under 18, please use the Service with the
        permission of a parent or guardian. If you believe a child under 16 has given us personal information, contact
        us and we will delete it.
      </P>

      <H2>10. Complaints</H2>
      <P>
        If you have a concern about how we&apos;ve handled your personal information, please contact us first at{" "}
        <A href="mailto:privacy@aviprep.com.au">privacy@aviprep.com.au</A>. We&apos;ll acknowledge your complaint promptly
        and aim to resolve it within 30 days.
      </P>
      <P>
        If you&apos;re not satisfied with our response, you can contact the Office of the Australian Information Commissioner
        at <A href="https://www.oaic.gov.au">www.oaic.gov.au</A> or on 1300 363 992.
      </P>

      <H2>11. Changes to this policy</H2>
      <P>
        We may update this policy as the Service or the law changes. We&apos;ll post the new version here with a new
        &quot;Last updated&quot; date, and if a change materially affects how we handle your personal information, we&apos;ll let
        you know by email or in the Service before it takes effect.
      </P>

      <H2>12. Contact us</H2>
      <P>
        AviPrep
        <br />
        ABN 80 167 432 520
        <br />
        Privacy: <A href="mailto:privacy@aviprep.com.au">privacy@aviprep.com.au</A>
        <br />
        Support: <A href="mailto:support@aviprep.com.au">support@aviprep.com.au</A>
      </P>
      <P>
        See also our <Link href="/terms" className="text-primary underline underline-offset-4 hover:text-primary/80">Terms of Service</Link>.
      </P>
    </article>
  )
}
