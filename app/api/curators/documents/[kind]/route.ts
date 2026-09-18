import { NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getCurator } from "@lib/curators/session"
import { clientIp, readSignatureImage, sealOf, sealingConfigured, sha256 } from "@lib/agreements/seal"
import { prefillFrom, renderSignedDocument } from "@lib/agreements/render"
import { saveSignedPdf } from "@lib/agreements/store"
import { cleanValues, hasErrors, isDocumentKind, templateFor, validateValues } from "@lib/agreements/templates"

export const dynamic = "force-dynamic"

/** The template to fill in, with everything we already know typed in for them. */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (!isDocumentKind(kind)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const template = templateFor(kind)
  return NextResponse.json({
    template,
    prefill: prefillFrom(template, curator),
    signerName: `${curator.firstName} ${curator.lastName}`.trim(),
  })
}

/**
 * Signs it. The PDF is generated here, from the same template they filled in,
 * then hashed and sealed - so the record, the file and the wording all agree.
 */
export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (!isDocumentKind(kind)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const curator = await getCurator()
  if (!curator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!sealingConfigured() && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Signing isn't available right now. Let us know and we'll sort it out." }, { status: 503 })
  }

  try {
    const template = templateFor(kind)
    const body = await request.json().catch(() => ({}))

    const values = cleanValues(template, body.values)
    const fields = validateValues(template, values)
    if (hasErrors(fields)) return NextResponse.json({ error: "Check the highlighted fields.", fields }, { status: 400 })

    const signerName = typeof body.signerName === "string" ? body.signerName.replace(/\s+/g, " ").trim().slice(0, 120) : ""
    if (signerName.length < 2) {
      return NextResponse.json({ error: "Type your name under the signature.", fields: { signerName: "Type your full name." } }, { status: 400 })
    }

    const signature = readSignatureImage(body.signature)
    if (!signature) {
      return NextResponse.json({ error: "Draw your signature in the box before signing.", fields: { signature: "Draw your signature." } }, { status: 400 })
    }

    if (body.agreed !== true) {
      return NextResponse.json({ error: "Tick the box to confirm you've read it.", fields: { agreed: "Confirm you've read it." } }, { status: 400 })
    }

    const signedAt = new Date()
    const ip = clientIp(request)
    const userAgent = request.headers.get("user-agent")?.slice(0, 400) ?? null

    const pdf = await renderSignedDocument({
      template,
      values,
      signature,
      facts: { signerName, signedAt, ip, phone: curator.phone, userAgent },
    })

    const documentHash = sha256(pdf)
    const seal = sealOf({
      curatorId: curator.id,
      kind,
      version: template.version,
      signerName,
      signedAt,
      documentHash,
      sourceHash: null,
      phone: curator.phone,
      ip,
      values,
    })

    const pdfUrl = await saveSignedPdf(pdf)
    const record = await prisma.signedDocument.create({
      data: {
        curatorId: curator.id,
        kind,
        version: template.version,
        title: template.title,
        values,
        signatureImage: `data:image/png;base64,${signature.toString("base64")}`,
        signerName,
        signedAt,
        ip,
        userAgent,
        phone: curator.phone,
        documentHash,
        sourceHash: null,
        seal,
        pdfUrl,
        voidedAt: null,
      },
      select: { id: true },
    })

    // What they told us in the document is now what we hold on file: nobody
    // should have to type their ABN twice, and a mismatch is a tax problem.
    const update: Record<string, unknown> = {}
    if (values.legalName) update.legalName = values.legalName
    if (values.tradingName) update.tradingName = values.tradingName
    if (values.address) update.address = values.address
    if (values.abn) update.abn = values.abn
    if (template.effect === "contractorAgreement" && values.abn) update.taxStatus = "abn"
    if (template.effect === "rctiAgreement") {
      update.rctiAgreementAt = signedAt
      update.gstRegistered = values.gstRegistered === "yes"
      update.taxStatus = "abn"
    }
    if (template.effect === "supplierStatement") {
      update.hobbyFormAt = signedAt
      update.taxStatus = "hobby"
    }
    if (Object.keys(update).length) await prisma.curator.update({ where: { id: curator.id }, data: update })

    return NextResponse.json({ id: record.id, signedAt: signedAt.toISOString(), pdf: `/api/curators/documents/signed/${record.id}` })
  } catch (error) {
    console.error("Signing failed:", kind, error)
    return NextResponse.json({ error: "We couldn't complete the signing. Nothing was saved, so try again." }, { status: 500 })
  }
}
