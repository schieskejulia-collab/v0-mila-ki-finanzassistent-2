import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  MilaConfirmedPattern,
  MilaMemoryContext,
  MilaMemoryEntity,
} from "./types"

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function toEntity(row: any): MilaMemoryEntity {
  return {
    id: String(row.id),
    name: String(row.name),
    active: Boolean(row.active ?? true),
    aliases: toStringArray(row.aliases),
    lastUsedAt: row.last_used_at || undefined,
  }
}

function toPattern(row: any): MilaConfirmedPattern {
  return {
    id: String(row.id),
    field: String(row.field),
    label: String(row.label),
    value: String(row.value),
    confidence:
      row.confidence === "low" || row.confidence === "medium" || row.confidence === "high"
        ? row.confidence
        : "medium",
    confirmations: Number(row.confirmations || 1),
    evidenceLabels: toStringArray(row.evidence_labels),
    lastConfirmedAt: row.last_confirmed_at || undefined,
  }
}

export async function loadPersistentMilaMemory(params: {
  client: SupabaseClient
  userId: string
  clientId?: string
}): Promise<MilaMemoryContext | undefined> {
  const { client, userId, clientId } = params
  if (!clientId) return undefined

  const { data: clientRow, error: clientError } = await client
    .from("clients")
    .select("id,name,contact")
    .eq("id", clientId)
    .maybeSingle()

  if (clientError || !clientRow) return undefined

  const [entitiesResult, patternsResult, atlasJobsResult] = await Promise.all([
    client
      .from("mila_memory_entities")
      .select("id,entity_type,name,aliases,active,last_used_at")
      .eq("user_id", userId)
      .eq("client_id", clientId)
      .eq("active", true),
    client
      .from("mila_memory_patterns")
      .select("id,field,label,value,confidence,confirmations,evidence_labels,last_confirmed_at")
      .eq("user_id", userId)
      .eq("client_id", clientId)
      .order("last_confirmed_at", { ascending: false }),
    client
      .from("atlas_jobs")
      .select("id,title,customer_name,status,created_at")
      .eq("user_id", userId)
      .ilike("customer_name", String(clientRow.name)),
  ])

  const rawEntities = entitiesResult.data || []
  const projects = rawEntities
    .filter((row: any) => row.entity_type === "project")
    .map(toEntity)
  const vehicles = rawEntities
    .filter((row: any) => row.entity_type === "vehicle")
    .map(toEntity)
  const contacts = rawEntities
    .filter((row: any) => row.entity_type === "contact")
    .map(toEntity)

  for (const job of atlasJobsResult.data || []) {
    const name = String(job.title || "").trim()
    if (!name || projects.some((item) => item.name.toLowerCase() === name.toLowerCase())) continue
    projects.push({
      id: String(job.id),
      name,
      active: !["erledigt", "storniert", "cancelled", "completed"].includes(
        String(job.status || "").toLowerCase(),
      ),
      aliases: [],
      lastUsedAt: job.created_at || undefined,
    })
  }

  const contactName = String(clientRow.contact || "").trim()
  if (contactName && !contacts.some((item) => item.name.toLowerCase() === contactName.toLowerCase())) {
    contacts.push({
      id: `client-contact-${clientId}`,
      name: contactName,
      active: true,
      aliases: [],
    })
  }

  return {
    client: { id: String(clientRow.id), name: String(clientRow.name) },
    projects,
    vehicles,
    contacts,
    confirmedPatterns: (patternsResult.data || []).map(toPattern),
  }
}

export async function savePersistentMilaPattern(params: {
  client: SupabaseClient
  userId: string
  clientId: string
  field: string
  label: string
  value: string
  confidence?: "low" | "medium" | "high"
  evidenceLabels?: string[]
}) {
  const { client, userId, clientId, field, label, value, evidenceLabels = [] } = params

  const { data: existing, error: existingError } = await client
    .from("mila_memory_patterns")
    .select("id,confirmations")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .eq("field", field)
    .eq("value", value)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    const { error } = await client
      .from("mila_memory_patterns")
      .update({
        label,
        confidence: params.confidence || "high",
        confirmations: Number(existing.confirmations || 1) + 1,
        evidence_labels: evidenceLabels,
        last_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", userId)

    if (error) throw error
    return
  }

  const { error } = await client.from("mila_memory_patterns").insert({
    user_id: userId,
    client_id: clientId,
    field,
    label,
    value,
    confidence: params.confidence || "high",
    confirmations: 1,
    evidence_labels: evidenceLabels,
    last_confirmed_at: new Date().toISOString(),
  })

  if (error) throw error
}
