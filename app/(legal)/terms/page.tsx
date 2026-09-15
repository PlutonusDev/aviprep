import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use AviPrep, Australia's CASA theory exam preparation platform.",
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

export default function TermsOfServicePage() {
  return (
    <article className="max-w-none">
      <h1 className="mb-2 text-display-3 font-bold tracking-tight text-foreground">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <P>
        These Terms of Service (&quot;Terms&quot;) are an agreement between you and AviPrep (&quot;AviPrep&quot;, &quot;we&quot;,
        &quot;us&quot; or &quot;our&quot;, ABN 80 167 432 520). They apply to your use of our website, web app, installable app and
        related services (together, the &quot;Service&quot;). By creating an account or using the Service, you agree to these
        Terms and to our <Link href="/privacy" className="text-primary underline underline-offset-4 hover:text-primary/80">Privacy Policy</Link>.
      </P>
      <P>
        <B>Your consumer rights come first.</B> Nothing in these Terms excludes, restricts or modifies any right or remedy
        you have under the Australian Consumer Law (ACL) or any other law that cannot be excluded. Where these Terms seem
        to say otherwise, the law applies.
      </P>

      <H2>1. Definitions</H2>
      <UL>
        <li>
          <B>Account</B> means your personal AviPrep account.
        </li>
        <li>
          <B>Content</B> means the lessons, questions, explanations, flashcards, quizzes and other material we make
          available through the Service.
        </li>
        <li>
          <B>Access</B> means your right to use the Content for a subject or group of subjects, whether purchased, provided
          free, or provided by a school.
        </li>
        <li>
          <B>School</B> means a flight school or registered training organisation that provides AviPrep to its students
          through a school portal.
        </li>
        <li>
          <B>Member Content</B> means anything you post or send through the Service, such as forum posts and messages.
        </li>
      </UL>

      <H2>2. Your account</H2>
      <UL>
        <li>You must be at least 16 years old. If you are under 18, you must have a parent or guardian&apos;s permission.</li>
        <li>
          Provide accurate details, including your legal name, email address, Australian mobile number and CASA Aviation
          Reference Number (ARN), and keep them up to date.
        </li>
        <li>
          We verify your mobile number and email address, and may send one-time codes when you sign in on a new device or
          make security-sensitive changes.
        </li>
        <li>
          Your account is for you alone. Don&apos;t share your password, codes or access with anyone, and let us know
          straight away at <A href="mailto:support@aviprep.com.au">support@aviprep.com.au</A> if you think someone else
          has accessed your account.
        </li>
        <li>You&apos;re responsible for activity on your account unless it results from our failure to keep the Service secure.</li>
      </UL>

      <H2>3. School accounts</H2>
      <P>
        If you use AviPrep through a School, your School decides which subjects and features you can access and may view
        your progress and results. Your School may add or remove your access in line with its arrangement with you. If
        your School&apos;s arrangement with us ends, your School-provided access may end too. Questions about School-provided
        access should go to your School first.
      </P>

      <H2>4. Access, payments and renewals</H2>

      <H3>4.1 Types of access</H3>
      <UL>
        <li>
          <B>Individual subjects:</B> a one-off payment for access to a subject for 12 months from purchase, unless the
          product says otherwise.
        </li>
        <li>
          <B>Bundles:</B> a subscription giving access to a group of subjects, billed in advance for each billing period
          shown at checkout (for example, every 3 months) until you cancel.
        </li>
        <li>
          <B>Free subject:</B> new accounts may choose one subject to access free for 12 months. It&apos;s limited to one per
          person and can&apos;t be changed once chosen.
        </li>
        <li>
          <B>Offers and discounts</B> (including waitlist offers) apply as described when they&apos;re made, can&apos;t be
          exchanged for cash, and can&apos;t be combined unless we say so.
        </li>
      </UL>

      <H3>4.2 Prices and payment</H3>
      <P>
        Prices are in Australian dollars and include GST where applicable. Payments are processed by Stripe. By paying,
        you confirm you&apos;re authorised to use the payment method. We&apos;ll send a receipt for each payment.
      </P>

      <H3>4.3 Subscription renewals and cancellation</H3>
      <UL>
        <li>Subscriptions renew automatically at the end of each billing period unless you cancel before the renewal date.</li>
        <li>
          You can cancel at any time from <B>Settings → Manage billing</B>. You&apos;ll keep access until the end of the
          period you&apos;ve paid for.
        </li>
        <li>
          If we change the price of your subscription, we&apos;ll tell you at least 30 days before it applies, and you can
          cancel before then.
        </li>
        <li>If a renewal payment fails, we may pause your bundle access until payment is made.</li>
      </UL>

      <H3>4.4 Refunds</H3>
      <P>
        If the Service has a major failure, or doesn&apos;t match its description or isn&apos;t fit for purpose, you&apos;re entitled
        to the remedies the ACL provides, which may include a refund.
      </P>
      <P>
        In addition to your ACL rights, if you change your mind we&apos;ll refund a purchase if you ask within 7 days and
        haven&apos;t substantially used it (for example, completed a significant part of a course or sat multiple exams in
        that subject). Email <A href="mailto:support@aviprep.com.au">support@aviprep.com.au</A> to request a refund.
      </P>

      <H2>5. Using the Service</H2>

      <H3>5.1 Your licence</H3>
      <P>
        While you have Access, we give you a personal, non-exclusive, non-transferable licence to use the Content for
        your own study and exam preparation.
      </P>

      <H3>5.2 Things you must not do</H3>
      <UL>
        <li>Copy, share, sell, publish or otherwise distribute Content, including screenshots of questions or explanations.</li>
        <li>Scrape, download in bulk, or use bots or scripts to access the Service or extract Content.</li>
        <li>Share your account or let anyone else use your Access.</li>
        <li>
          Record, reproduce or share questions from official CASA examinations, or use the Service to breach the
          integrity of any examination.
        </li>
        <li>Interfere with, probe or bypass the security of the Service, or reverse engineer it except where the law allows.</li>
        <li>Use the Content to build a competing product, or to train or develop artificial intelligence models.</li>
        <li>Use the Service unlawfully, or to harass, threaten, deceive or harm anyone.</li>
      </UL>

      <H2>6. Forums, messages and Member Content</H2>
      <UL>
        <li>You keep ownership of your Member Content, and you&apos;re responsible for it.</li>
        <li>
          You give us a non-exclusive, royalty-free licence to host, display and distribute your Member Content as needed
          to run the Service. This licence ends when your content is deleted, except for copies others have quoted or
          that we must keep by law.
        </li>
        <li>
          Be respectful. Don&apos;t post content that is unlawful, abusive, discriminatory, misleading, infringes someone
          else&apos;s rights, contains spam or advertising, or shares other people&apos;s personal information.
        </li>
        <li>
          We may remove content that breaks these rules and may suspend posting or messaging privileges. If you see
          something that breaks these rules, please tell us.
        </li>
      </UL>

      <H2>7. Intellectual property</H2>
      <P>
        The Service and the Content, including questions, explanations, lessons, design and software, are owned by or
        licensed to AviPrep and protected by copyright and other laws. Apart from the licence in section 5.1, these Terms
        don&apos;t give you any rights in them. &quot;AviPrep&quot; and our logo are our trade marks.
      </P>
      <P>
        If you believe something on the Service infringes your rights, contact{" "}
        <A href="mailto:support@aviprep.com.au">support@aviprep.com.au</A> and we&apos;ll look into it promptly.
      </P>

      <H2>8. Study content and insights</H2>
      <UL>
        <li>
          AviPrep is an independent study resource. It is <B>not affiliated with, endorsed by or sponsored by the Civil
          Aviation Safety Authority (CASA)</B>.
        </li>
        <li>
          We write Content against the CASA Part 61 Manual of Standards and work to keep it accurate and current, but
          syllabuses and regulations change. Always use current official sources (such as the AIP and ERSA) and follow
          your instructor&apos;s guidance.
        </li>
        <li>
          Practice questions are designed to prepare you, not to reproduce official exam questions. Scores, readiness
          indicators and study insights are calculated from your activity to guide your study; they&apos;re not a
          prediction or guarantee of any exam result.
        </li>
        <li>
          The Service is for theory study. It is not flight instruction and must never be relied on for flight planning or
          operational decisions.
        </li>
        <li>
          If you find an error in the Content, please report it. We&apos;ll review and correct it.
        </li>
      </UL>

      <H2>9. Availability and changes</H2>
      <P>
        We aim to keep the Service available and reliable, but it may occasionally be unavailable for maintenance, updates
        or reasons outside our control. We regularly improve the Service and may add, change or retire features. We
        won&apos;t make changes that materially reduce the Access you&apos;ve paid for during your current access period without
        giving you a fair remedy, such as a pro-rata refund.
      </P>

      <H2>10. Suspension and closure</H2>
      <UL>
        <li>
          <B>You</B> can close your account at any time from Settings, or by contacting us. Closing your account ends your
          Access. Refunds are handled under section 4.4.
        </li>
        <li>
          <B>We</B> may suspend or close your account if you seriously or repeatedly breach these Terms, if required by law,
          or to protect other members or the Service. Where reasonable, we&apos;ll tell you why first and give you a chance to
          fix the problem.
        </li>
        <li>
          If we close your account for reasons other than your breach of these Terms, we&apos;ll refund the unused portion of
          any paid Access.
        </li>
      </UL>

      <H2>11. Liability</H2>
      <P>
        Our services come with guarantees that cannot be excluded under the ACL. Subject to those guarantees and to the
        extent the law allows:
      </P>
      <UL>
        <li>
          Where our liability for failing to meet a guarantee can be limited, it is limited to supplying the relevant
          services again or paying the cost of having them supplied again.
        </li>
        <li>
          We are not liable for indirect or consequential loss, or for exam results, training delays or licensing
          outcomes, except where caused by our negligence or breach of these Terms.
        </li>
        <li>
          Nothing in these Terms limits our liability for death or personal injury caused by our negligence, or for fraud.
        </li>
      </UL>

      <H2>12. Your responsibility to us</H2>
      <P>
        If you deliberately misuse the Service or breach section 5.2 or 6 of these Terms, you are responsible for loss
        that we or others reasonably suffer as a direct result, to the extent that loss was caused by you.
      </P>

      <H2>13. Privacy</H2>
      <P>
        Our <Link href="/privacy" className="text-primary underline underline-offset-4 hover:text-primary/80">Privacy Policy</Link>{" "}
        explains how we collect, use and protect your personal information.
      </P>

      <H2>14. Changes to these Terms</H2>
      <P>
        We may update these Terms from time to time. If a change is material, we&apos;ll give you at least 14 days&apos; notice
        by email or in the Service before it takes effect. If you don&apos;t agree with the change, you can close your account
        before then, and we&apos;ll refund the unused portion of any paid Access. Otherwise, continuing to use the Service
        means you accept the updated Terms.
      </P>

      <H2>15. Disputes</H2>
      <P>
        If you have a problem, please contact us first at <A href="mailto:support@aviprep.com.au">support@aviprep.com.au</A>.
        We&apos;ll respond within 10 business days and work with you in good faith to resolve it. This doesn&apos;t stop you
        contacting your local consumer protection agency or seeking other remedies.
      </P>
      <P>
        These Terms are governed by the laws of Queensland, Australia. You and we submit to the non-exclusive
        jurisdiction of the courts of Queensland and the courts that can hear appeals from them. If you live in another
        Australian state or territory, you may also have rights under the laws of that place.
      </P>

      <H2>16. General</H2>
      <UL>
        <li>If any part of these Terms is unenforceable, the rest continues to apply.</li>
        <li>If we don&apos;t enforce a right straight away, we haven&apos;t given it up.</li>
        <li>
          You may not transfer your account or rights under these Terms. We may transfer our rights and obligations to a
          new owner of the Service, who must honour your existing Access and these Terms.
        </li>
        <li>
          These Terms, our Privacy Policy and any terms shown at checkout for a specific product are the whole agreement
          between you and us about the Service.
        </li>
      </UL>

      <H2>17. Contact us</H2>
      <P>
        AviPrep
        <br />
        ABN 80 167 432 520
        <br />
        Support: <A href="mailto:support@aviprep.com.au">support@aviprep.com.au</A>
        <br />
        Privacy: <A href="mailto:privacy@aviprep.com.au">privacy@aviprep.com.au</A>
      </P>
    </article>
  )
}
