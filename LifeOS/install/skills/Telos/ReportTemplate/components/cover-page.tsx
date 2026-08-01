interface CoverPageProps {
  clientName: string
  reportTitle: string
  reportDate: string
  classification: string
  /** Consulting-org name shown on the cover. Override per install. */
  orgName?: string
}

export function CoverPage({
  clientName,
  reportTitle,
  reportDate,
  classification,
  orgName = "Your Organization",
}: CoverPageProps) {
  return (
    <div className="cover-page">
      <div className="cover-classification">{classification}</div>

      <div className="flex-1 flex flex-col justify-center">
        {/* A bare angle-bracket ORG_NAME placeholder here parsed as an unclosed JSX tag and broke `next build`
            (public issue #1557, @tzioup); the referenced /ul-icon.png was never
            shipped. Drop your own logo into public/ and restore an <img> here. */}
        <div className="font-accent text-lg tracking-[0.25em] text-primary uppercase mb-4">
          TELOS Assessment
        </div>
        <h1 className="cover-title">{reportTitle}</h1>
        <p className="cover-subtitle">Prepared for {clientName}</p>
      </div>

      <div className="cover-meta">
        <p className="cover-date">{reportDate}</p>
        <p className="text-muted-dark text-sm mt-2">
          {orgName} Consulting
        </p>
      </div>
    </div>
  )
}
