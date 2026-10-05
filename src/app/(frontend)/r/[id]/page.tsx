import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { resolveLegacyReportRedirect } from '@/lib/data/legacy-redirects'

export default async function LegacyReportRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!id) {
    notFound()
  }

  const payload = await getPayload({ config })
  const redirectResult = await resolveLegacyReportRedirect(payload, id)

  if (redirectResult) {
    permanentRedirect(redirectResult.destination)
  }

  notFound()
}
