export type MemoryModule =

  | 'core'

  | 'finance'

  | 'documents'

  | 'obligations'

  | 'goals'

  | 'sentinel'

  | 'health'

  | 'system'

export type MemoryKind =

  | 'message'

  | 'fact'

  | 'preference'

  | 'decision'

  | 'pattern'

  | 'warning'

  | 'action'

  | 'result'

export type MemorySource =

  | 'user'

  | 'mila'

  | 'system'

  | 'import'

export interface MilaMemoryEntry {

  id: string

  userId?: string

  module: MemoryModule

  kind: MemoryKind

  source: MemorySource

  content: string

  createdAt: string

  importance: number

  confidence: number

  tags: string[]

  metadata?: Record<string, unknown>

  expiresAt?: string

  lastAccessedAt?: string

  accessCount: number

}

export interface CreateMemoryInput {

  userId?: string

  module: MemoryModule

  kind: MemoryKind

  source: MemorySource

  content: string

  importance?: number

  confidence?: number

  tags?: string[]

  metadata?: Record<string, unknown>

  expiresAt?: string

}

export interface MemorySearchOptions {

  userId?: string

  module?: MemoryModule

  kind?: MemoryKind

  tags?: string[]

  minimumImportance?: number

  limit?: number

}

const memoryStore: MilaMemoryEntry[] = []

function createMemoryId(): string {

  if (

    typeof crypto !== 'undefined' &&

    typeof crypto.randomUUID === 'function'

  ) {

    return crypto.randomUUID()

  }

  return `memory-${Date.now()}-${Math.random()

    .toString(16)

    .slice(2)}`

}

function clampScore(value: number): number {

  return Math.max(0, Math.min(100, value))

}

function normalizeText(value: string): string {

  return value

    .trim()

    .replace(/\s+/g, ' ')

}

function normalizeTags(tags: string[] = []): string[] {

  return Array.from(

    new Set(

      tags

        .map((tag) => tag.trim().toLowerCase())

        .filter(Boolean)

    )

  )

}

function isExpired(entry: MilaMemoryEntry): boolean {

  if (!entry.expiresAt) {

    return false

  }

  return new Date(entry.expiresAt).getTime() <= Date.now()

}

export function createMemory(

  input: CreateMemoryInput

): MilaMemoryEntry {

  const content = normalizeText(input.content)

  if (!content) {

    throw new Error(

      'Eine Erinnerung benötigt einen Inhalt.'

    )

  }

  const entry: MilaMemoryEntry = {

    id: createMemoryId(),

    userId: input.userId,

    module: input.module,

    kind: input.kind,

    source: input.source,

    content,

    createdAt: new Date().toISOString(),

    importance: clampScore(

      input.importance ?? 50

    ),

    confidence: clampScore(

      input.confidence ?? 100

    ),

    tags: normalizeTags(input.tags),

    metadata: input.metadata,

    expiresAt: input.expiresAt,

    accessCount: 0,

  }

  memoryStore.push(entry)

  return entry

}

export function getMemoryById(

  id: string

): MilaMemoryEntry | undefined {

  const entry = memoryStore.find(

    (memory) => memory.id === id

  )

  if (!entry || isExpired(entry)) {

    return undefined

  }

  entry.lastAccessedAt =

    new Date().toISOString()

  entry.accessCount += 1

  return entry

}

export function searchMemories(

  options: MemorySearchOptions = {}

): MilaMemoryEntry[] {

  const {

    userId,

    module,

    kind,

    tags = [],

    minimumImportance = 0,

    limit = 20,

  } = options

  const normalizedSearchTags =

    normalizeTags(tags)

  return memoryStore

    .filter((entry) => {

      if (isExpired(entry)) {

        return false

      }

      if (

        userId &&

        entry.userId !== userId

      ) {

        return false

      }

      if (

        module &&

        entry.module !== module

      ) {

        return false

      }

      if (

        kind &&

        entry.kind !== kind

      ) {

        return false

      }

      if (

        entry.importance <

        minimumImportance

      ) {

        return false

      }

      if (

        normalizedSearchTags.length > 0 &&

        !normalizedSearchTags.every(

          (tag) => entry.tags.includes(tag)

        )

      ) {

        return false

      }

      return true

    })

    .sort((a, b) => {

      if (b.importance !== a.importance) {

        return b.importance - a.importance

      }

      return (

        new Date(b.createdAt).getTime() -

        new Date(a.createdAt).getTime()

      )

    })

    .slice(0, Math.max(1, limit))

    .map((entry) => {

      entry.lastAccessedAt =

        new Date().toISOString()

      entry.accessCount += 1

      return entry

    })

}

export function removeMemory(

  id: string

): boolean {

  const index = memoryStore.findIndex(

    (entry) => entry.id === id

  )

  if (index === -1) {

    return false

  }

  memoryStore.splice(index, 1)

  return true

}

export function clearExpiredMemories(): number {

  let removedCount = 0

  for (

    let index = memoryStore.length - 1;

    index >= 0;

    index -= 1

  ) {

    if (isExpired(memoryStore[index])) {

      memoryStore.splice(index, 1)

      removedCount += 1

    }

  }

  return removedCount

}

export function getAllMemories(): MilaMemoryEntry[] {

  clearExpiredMemories()

  return [...memoryStore]