/**
 * The contractor paperwork, written once and used twice: the page a curator
 * fills in and the PDF that comes out of it are built from these same blocks,
 * so what they signed is what they read.
 *
 * Pure. No Prisma, no fs, no server-only - the studio imports it too.
 *
 * Changing wording means bumping `version`. Signatures keep the version they
 * were given, so an old signature always resolves to the words it was under.
 */

export type DocumentKind = "contractor-agreement" | "rcti-agreement" | "supplier-statement"

export const DOCUMENT_KINDS: DocumentKind[] = ["contractor-agreement", "rcti-agreement", "supplier-statement"]

export type FieldType = "text" | "abn" | "email" | "phone" | "date" | "choice" | "textarea"

export interface Field {
  id: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  hint?: string
  /** For "choice". */
  options?: { value: string; label: string; hint?: string }[]
  /** Half-width fields sit two to a row on anything wider than a phone. */
  half?: boolean
  /** Which detail we already hold gets typed in for them. */
  prefill?: "legalName" | "fullName" | "tradingName" | "email" | "phone" | "address" | "abn" | "today"
  maxLength?: number
}

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string }
  /** A numbered clause of an agreement, e.g. 3.4 Contribution Weighing. */
  | { kind: "clause"; ref: string; title: string; text: string }
  /** Set apart and centred, for the royalty formula. */
  | { kind: "formula"; text: string }
  | { kind: "list"; items: string[]; marker?: "bullet" | "plain" }
  | { kind: "fields"; label?: string; fields: Field[] }
  | { kind: "note"; text: string }

export interface DocumentTemplate {
  kind: DocumentKind
  version: string
  /** The document's own name, on the page and in the PDF. */
  title: string
  /** What to call it in a card, a banner or a sentence. Defaults to the title. */
  shortTitle?: string
  /** One line under the title. */
  subtitle: string
  /** Why they're being asked, in the roster and on the card. Not in the PDF. */
  purpose: string
  /** Shown when this one isn't needed. */
  appliesWhen?: string
  blocks: Block[]
  /** What the signer is agreeing to, printed immediately above the signature. */
  declaration: string
  /** What signing sets on their record. */
  effect: "contractorAgreement" | "rctiAgreement" | "supplierStatement"
}

/* --- Reusable field groups ------------------------------------------------ */

const WHO: Field[] = [
  {
    id: "legalName",
    label: "Full legal name",
    type: "text",
    required: true,
    prefill: "legalName",
    hint: "As it appears on your ID and with the ATO.",
    maxLength: 120,
  },
  { id: "tradingName", label: "Business or trading name", type: "text", prefill: "tradingName", half: true, placeholder: "If you have one", maxLength: 120 },
  { id: "abn", label: "ABN", type: "abn", prefill: "abn", half: true, placeholder: "11 digits" },
  { id: "address", label: "Postal address", type: "textarea", required: true, prefill: "address", maxLength: 300 },
  { id: "email", label: "Email", type: "email", required: true, prefill: "email", half: true, maxLength: 254 },
  { id: "phone", label: "Mobile", type: "phone", required: true, prefill: "phone", half: true },
]

/* --- The documents -------------------------------------------------------- */

const CONTRACTOR_AGREEMENT: DocumentTemplate = {
  kind: "contractor-agreement",
  version: "2026-09-2",
  title: "Independent Contractor & Content Royalty Agreement",
  shortTitle: "Contractor Agreement",
  subtitle: "Between Hughes, Joshua James trading as AviPrep, and you",
  purpose: "Covers everything you write for us, and how you get paid for it.",
  blocks: [
    {
      kind: "text",
      text: "This Agreement is made on the date it is signed below, between Hughes, Joshua James trading as AviPrep (ABN 80 167 432 520) (“AviPrep”, “we”, “us”) and the Contractor named below (“Contractor”, “you”).",
    },

    { kind: "heading", text: "The Contractor" },
    { kind: "fields", fields: WHO },
    {
      kind: "fields",
      fields: [
        {
          id: "credentials",
          label: "Your aviation standing",
          type: "text",
          required: true,
          placeholder: "e.g. Grade 1 Flight Instructor, ATPL",
          hint: "Clause 1.3. The experience your questions are written from.",
          maxLength: 200,
        },
        {
          id: "subjects",
          label: "Subjects you expect to write for",
          type: "text",
          placeholder: "e.g. Aerodynamics, Meteorology",
          maxLength: 200,
        },
      ],
    },

    { kind: "heading", text: "1. Scope of Services & Deliverables" },
    {
      kind: "clause",
      ref: "1.1",
      title: "Engagement",
      text: "AviPrep engages the Contractor as an independent content curator to create, review, update, and validate aviation theory content, including practice questions, explanations, course modules, and media (“Content”).",
    },
    {
      kind: "clause",
      ref: "1.2",
      title: "Standards",
      text: "All content created must be factually accurate, original, and strictly mapped to the current Civil Aviation Safety Authority (CASA) Part 61 Manual of Standards (MOS).",
    },
    {
      kind: "clause",
      ref: "1.3",
      title: "Approval Process",
      text: "AviPrep reserves the right, at its sole discretion, to approve, reject, edit, or archive any Content submitted by the Contractor. Only published and “Active” Content will be eligible for royalty calculations, as per Section 3.",
    },

    { kind: "heading", text: "2. Intellectual Property (IP) Ownership" },
    {
      kind: "clause",
      ref: "2.1",
      title: "Assignment of IP",
      text: "The Contractor hereby unconditionally and irrevocably assigns to AviPrep all present and future Intellectual Property Rights (including copyright) in all Content created under or in connection with this Agreement.",
    },
    {
      kind: "clause",
      ref: "2.2",
      title: "Moral Rights",
      text: "To the extent permitted by the Copyright Act 1968 (Cth), the Contractor unconditionally consents to AviPrep using, modifying, adapting, deleting, or publishing the Content with or without attributing authorship to the Contractor.",
    },
    {
      kind: "clause",
      ref: "2.3",
      title: "Warranties",
      text: "The Contractor warrants that all Content provided is original, does not infringe upon any third-party IP rights, and does not violate CASA exam confidentiality rules.",
    },

    { kind: "heading", text: "3. Compensation & Revenue Share" },
    {
      kind: "clause",
      ref: "3.1",
      title: "Acknowledgement of Costs",
      text: "The Contractor acknowledges that AviPrep bears 100% of the financial risk and operational costs of the platform, including web hosting, software development, marketing, advertising, and business administration.",
    },
    {
      kind: "clause",
      ref: "3.2",
      title: "Net Revenue Definition",
      text: "“Net Revenue” means the total gross revenue actually received by AviPrep from Student subscriptions or purchases of a specific Subject/Course, minus payment gateway processing fees (e.g., Stripe), applicable taxes (including GST), and customer refunds.",
    },
    {
      kind: "clause",
      ref: "3.3",
      title: "The Content Royalty Pool",
      text: "AviPrep will allocate 25% of the Net Revenue generated by a specific Subject/Course to a shared “Content Royalty Pool” for that specific Subject/Course.",
    },
    {
      kind: "clause",
      ref: "3.4",
      title: "Contribution Weighing",
      text: "To ensure fair compensation among multiple curators contributing to the same Subject/Course, the Contractor’s share of the Content Royalty Pool will be calculated based on active contribution “Points”. Points are assigned upon Content publication as follows:",
    },
    {
      kind: "list",
      marker: "plain",
      items: [
        "(a) Basic Multiple-Choice Question (with standard explanation): 1 Point",
        "(b) Complex Question (requiring chart work, multi-step calculations, images, etc.): 3 Points",
        "(c) Comprehensive Theory Lesson / Written Chapter / Video: 10 Points",
      ],
    },
    {
      kind: "clause",
      ref: "3.5",
      title: "Proportional Payment Formula",
      text: "At the end of each calendar month, the Contractor’s royalty payment for a specific Subject/Course will be calculated using the following formula:",
    },
    {
      kind: "formula",
      text: "Contractor’s Total Active Points in Subject ÷ Total Active Points in Subject Database × Subject Content Royalty Pool",
    },
    {
      kind: "clause",
      ref: "3.6",
      title: "Content Lifecycle",
      text: "If Content becomes outdated (e.g., due to CASA MOS or AIP updates) and the Contractor does not update it, AviPrep may archive or replace the Content. Archived or deleted Content ceases to earn Points.",
    },
    {
      kind: "clause",
      ref: "3.7",
      title: "Payment Terms",
      text: "Royalties will be calculated Monthly and paid within 14 days following the end of each calendar month. Payments will be accompanied by a transparent breakdown of active Points and total subject revenue.",
    },
    {
      kind: "clause",
      ref: "3.8",
      title: "Taxation",
      text: "The Contractor is solely responsible for their own income tax, GST (if registered and applicable), and superannuation. Payments will be made upon receipt of a valid tax invoice from the Contractor (or via Recipient Created Tax Invoice if mutually agreed).",
    },

    { kind: "heading", text: "4. Independent Contractor Status" },
    {
      kind: "text",
      text: "The Contractor acts at all times as an independent contractor. Nothing in this Agreement creates an employment, partnership, joint venture, or agency relationship. The Contractor has no authority to bind AviPrep to any third-party agreements.",
    },

    { kind: "heading", text: "5. Confidentiality" },
    {
      kind: "text",
      text: "The Contractor agrees to keep all non-public information – including AviPrep’s software architecture, financial data, user metrics, future feature roadmaps, and unreleased content – strictly confidential during and after the term of this Agreement.",
    },

    { kind: "heading", text: "6. Transfer and Future Incorporation (Pty Ltd Novation)" },
    {
      kind: "text",
      text: "The Contractor explicitly agrees that AviPrep (acting as a Sole Trader) may at any time assign or novate this Agreement, along with all assigned Intellectual Property Rights, to a newly incorporated corporate entity (e.g., AviPrep Pty Ltd) upon written notice. The Contractor agrees to execute any documents reasonably required to effect this transfer.",
    },

    { kind: "heading", text: "7. Termination" },
    {
      kind: "clause",
      ref: "7.1",
      title: "Termination for Convenience",
      text: "Either party may terminate this Agreement at any time by giving 30 days written notice to the other party.",
    },
    {
      kind: "clause",
      ref: "7.2",
      title: "Termination for Breach",
      text: "AviPrep may terminate this agreement immediately if the Contractor breaches IP warranties, confidentiality, or engages in conduct detrimental to AviPrep’s reputation.",
    },
    {
      kind: "clause",
      ref: "7.3",
      title: "Post-Termination Royalties",
      text: "Upon termination (unless terminated for breach by the Contractor), AviPrep will continue to pay the Contractor their proportional royalty share based on their active Content for a period of 12 months following the termination date. After this tail period, all royalty obligations cease, but AviPrep retains full and perpetual ownership of the Content.",
    },

    {
      kind: "note",
      text: "If you have an ABN, put it above. Without one, and without a Statement by a supplier, we have to hold back 47% of anything over $75 and send it to the ATO in your name.",
    },
  ],
  declaration:
    "I have read this Agreement in full, I agree to be bound by it, and the details I have given above are true and correct.",
  effect: "contractorAgreement",
}

const RCTI_AGREEMENT: DocumentTemplate = {
  kind: "rcti-agreement",
  version: "2026-09-1",
  title: "RCTI Agreement",
  subtitle: "Recipient created tax invoice agreement",
  purpose: "We raise your tax invoices instead of you chasing them each month.",
  appliesWhen: "For curators with an ABN who are registered for GST.",
  blocks: [
    {
      kind: "text",
      text: "Normally the supplier writes the tax invoice. Under this agreement AviPrep writes it instead. We already hold the sales figures your royalty comes out of, so we raise the invoice, send it to you and pay it. That is a recipient created tax invoice, or RCTI, and the ATO allows it wherever both sides have agreed in writing.",
    },
    { kind: "heading", text: "The supplier" },
    { kind: "fields", fields: WHO },
    { kind: "heading", text: "GST" },
    {
      kind: "fields",
      fields: [
        {
          id: "gstRegistered",
          label: "Are you registered for GST?",
          type: "choice",
          required: true,
          options: [
            { value: "yes", label: "Yes, I'm registered for GST", hint: "Your RCTIs will include GST." },
            { value: "no", label: "No, I'm not registered", hint: "Your RCTIs won't include GST." },
          ],
        },
      ],
    },
    { kind: "heading", text: "What we each agree" },
    {
      kind: "list",
      items: [
        "AviPrep may issue tax invoices for the royalties it pays you, and you will not issue tax invoices for those supplies.",
        "AviPrep is registered for GST at the time it issues each RCTI, and will tell you if it stops being registered.",
        "You are registered for GST at the time you make each supply, and will tell us within 21 days if you stop being registered or your ABN changes.",
        "Each RCTI will be sent to you within 28 days of the end of the month it covers.",
        "This agreement covers royalties under the Independent Contractor & Content Royalty Agreement and continues until either of us ends it in writing.",
      ],
    },
    {
      kind: "note",
      text: "This agreement is made under A New Tax System (Goods and Services Tax) Act 1999, subsection 29-70(3), and the ATO's determination for recipient created tax invoices.",
    },
  ],
  declaration:
    "I agree to AviPrep issuing recipient created tax invoices for the royalties it pays me, on the terms set out above, and confirm the details I have given are true and correct.",
  effect: "rctiAgreement",
}

const SUPPLIER_STATEMENT: DocumentTemplate = {
  kind: "supplier-statement",
  version: "2026-09-1",
  title: "Statement by a supplier",
  subtitle: "Reason for not quoting an ABN",
  purpose: "Keeps the ATO's 47% off your royalties when you have no ABN.",
  appliesWhen: "For curators without an ABN.",
  blocks: [
    {
      kind: "text",
      text: "Without an ABN, the law says we have to hold back 47% of anything over $75 and send it to the ATO in your name. This statement sets out why an ABN does not apply to you, which lets us pay you in full. It is the online form of the ATO's Statement by a supplier (NAT 3346).",
    },
    { kind: "heading", text: "You" },
    {
      kind: "fields",
      fields: [
        WHO[0],
        { id: "address", label: "Postal address", type: "textarea", required: true, prefill: "address", maxLength: 300 },
        { id: "email", label: "Email", type: "email", required: true, prefill: "email", half: true, maxLength: 254 },
        { id: "phone", label: "Mobile", type: "phone", required: true, prefill: "phone", half: true },
      ],
    },
    { kind: "heading", text: "Why you're not quoting an ABN" },
    {
      kind: "fields",
      fields: [
        {
          id: "reason",
          label: "Choose the one that applies",
          type: "choice",
          required: true,
          options: [
            {
              value: "private-recreational",
              label: "The work is a private recreational pursuit or hobby",
              hint: "You write for AviPrep out of interest, not as a business.",
            },
            {
              value: "domestic",
              label: "The work is wholly of a private or domestic nature",
              hint: "For the person paying you, it isn't part of running a business.",
            },
            {
              value: "no-enterprise",
              label: "I'm not carrying on an enterprise in Australia",
              hint: "No business, and nothing done in the form of a business.",
            },
            {
              value: "under-75",
              label: "The payments won't be more than $75 excluding GST",
              hint: "Across everything you write for AviPrep in a year.",
            },
            {
              value: "no-tax-payable",
              label: "I'm under 18, and won't earn more than $350 a week from this",
              hint: "Which means there is no tax to pay on it.",
            },
          ],
        },
      ],
    },
    {
      kind: "note",
      text: "A false or misleading statement made to avoid withholding carries penalties under the Taxation Administration Act 1953. If your circumstances change, tell us and we will send you a fresh one to sign.",
    },
  ],
  declaration:
    "I declare that the information I have given on this form is true and correct, and that the reason selected above is the reason I am not quoting an ABN in relation to this supply.",
  effect: "supplierStatement",
}

export const TEMPLATES: Record<DocumentKind, DocumentTemplate> = {
  "contractor-agreement": CONTRACTOR_AGREEMENT,
  "rcti-agreement": RCTI_AGREEMENT,
  "supplier-statement": SUPPLIER_STATEMENT,
}

/** The name to use in running text, rather than the full legal title. */
export const shortNameOf = (template: DocumentTemplate) => template.shortTitle ?? template.title

export const isDocumentKind = (value: unknown): value is DocumentKind =>
  typeof value === "string" && (DOCUMENT_KINDS as string[]).includes(value)

export const templateFor = (kind: DocumentKind) => TEMPLATES[kind]

/** Every field in a template, in the order it's shown. */
export function fieldsOf(template: DocumentTemplate): Field[] {
  return template.blocks.flatMap((b) => (b.kind === "fields" ? b.fields : []))
}

/* --- Validation (shared by the form and the API) -------------------------- */

export type Values = Record<string, string>
export type FieldErrors = Record<string, string>

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

/** The ATO's modulus 89 check. Stops a typo becoming a withholding problem. */
export function isValidAbn(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 11) return false
  const nums = digits.split("").map(Number)
  nums[0] -= 1
  return nums.reduce((sum, n, i) => sum + n * ABN_WEIGHTS[i], 0) % 89 === 0
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MOBILE = /^(?:\+?61|0)4\d{8}$/

export function validateValues(template: DocumentTemplate, values: Values): FieldErrors {
  const errors: FieldErrors = {}
  for (const field of fieldsOf(template)) {
    const raw = (values[field.id] ?? "").trim()

    if (!raw) {
      if (field.required) errors[field.id] = `${field.label} is needed.`
      continue
    }
    if (field.maxLength && raw.length > field.maxLength) {
      errors[field.id] = `Keep ${field.label.toLowerCase()} under ${field.maxLength} characters.`
      continue
    }
    if (field.type === "abn" && !isValidAbn(raw)) errors[field.id] = "That ABN doesn't check out. Look at it again."
    if (field.type === "email" && !EMAIL.test(raw)) errors[field.id] = "Enter a valid email address."
    if (field.type === "phone" && !MOBILE.test(raw.replace(/\s/g, ""))) errors[field.id] = "Use an Australian mobile, starting 04."
    if (field.type === "choice" && !field.options?.some((o) => o.value === raw)) errors[field.id] = "Choose one of the options."
  }

  // An RCTI only works if there's an ABN behind it: the ATO requires the
  // supplier's ABN on every recipient created tax invoice.
  if (template.kind === "rcti-agreement") {
    if (!values.abn?.trim()) errors.abn = "An RCTI agreement needs your ABN."
    if (values.gstRegistered === "no" && !errors.gstRegistered) {
      errors.gstRegistered = "RCTIs are only for GST-registered suppliers. If you're not registered, you don't need this one."
    }
  }
  return errors
}

export const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0

/** Tidies what was typed down to exactly the template's fields. */
export function cleanValues(template: DocumentTemplate, input: unknown): Values {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>
  const values: Values = {}
  for (const field of fieldsOf(template)) {
    const raw = source[field.id]
    if (typeof raw !== "string") continue
    const trimmed = raw.replace(/\r\n/g, "\n").trim().slice(0, field.maxLength ?? 300)
    if (trimmed) values[field.id] = field.type === "abn" ? trimmed.replace(/\D/g, "") : trimmed
  }
  return values
}

/** How a value reads on the page and in the PDF. */
export function displayValue(field: Field, value: string | undefined): string {
  if (!value) return "—"
  if (field.type === "abn") {
    const d = value.replace(/\D/g, "")
    return d.length === 11 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : value
  }
  if (field.type === "choice") return field.options?.find((o) => o.value === value)?.label ?? value
  if (field.type === "phone") {
    const d = value.replace(/\s/g, "").replace(/^\+?61/, "0")
    return /^04\d{8}$/.test(d) ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : value
  }
  return value
}
