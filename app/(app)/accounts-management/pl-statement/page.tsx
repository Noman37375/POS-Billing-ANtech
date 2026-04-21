import { requirePrivilege } from "@/lib/auth/privileges"
import { getPLStatement } from "../actions"
import { PLStatementClient } from "./pl-statement-client"

interface PLStatementPageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; period?: string }>
}

function getPKTDate(): string {
  return new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().split("T")[0]
}

function getMonthStart(): string {
  const d = new Date(Date.now() + 5 * 60 * 60 * 1000)
  return `${d.toISOString().substring(0, 7)}-01`
}

export default async function PLStatementPage({ searchParams }: PLStatementPageProps) {
  await requirePrivilege("accounts")
  const params = await searchParams
  const today = getPKTDate()
  const dateFrom = params.dateFrom ?? getMonthStart()
  const dateTo = params.dateTo ?? today

  const result = await getPLStatement(dateFrom, dateTo)

  return (
    <PLStatementClient
      initialData={result.data}
      initialError={result.error}
      initialDateFrom={dateFrom}
      initialDateTo={dateTo}
    />
  )
}
