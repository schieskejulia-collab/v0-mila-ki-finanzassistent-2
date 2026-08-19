const PAGE_SIZE = 500
const REMOVE_BATCH = 500

type CleanupFailure = {
  bucket: string
  path: string
  error: string
}

async function listAll(admin: any, bucket: string, path: string) {
  const result: any[] = []
  let offset = 0

  while (true) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(path, { limit: PAGE_SIZE, offset })

    if (error) throw error
    const page = Array.isArray(data) ? data : []
    result.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return result
}

async function removePaths(admin: any, bucket: string, paths: string[]) {
  for (let index = 0; index < paths.length; index += REMOVE_BATCH) {
    const batch = paths.slice(index, index + REMOVE_BATCH)
    const { error } = await admin.storage.from(bucket).remove(batch)
    if (error) throw error
  }
}

export async function deleteUserStoredFiles(admin: any, userId: string) {
  const failures: CleanupFailure[] = []
  let removed = 0

  try {
    const milaObjects = await listAll(admin, 'mila-dokumente', userId)
    const milaPaths = milaObjects
      .filter((object) => object?.name && object?.id)
      .map((object) => `${userId}/${object.name}`)

    if (milaPaths.length > 0) {
      await removePaths(admin, 'mila-dokumente', milaPaths)
      removed += milaPaths.length
    }
  } catch (error: any) {
    failures.push({
      bucket: 'mila-dokumente',
      path: userId,
      error: error?.message || 'Interne Dokumente konnten nicht vollständig gelöscht werden.',
    })
  }

  try {
    const firstLevel = await listAll(admin, 'client-uploads', userId)
    const directFiles = firstLevel
      .filter((object) => object?.name && object?.id)
      .map((object) => `${userId}/${object.name}`)

    if (directFiles.length > 0) {
      await removePaths(admin, 'client-uploads', directFiles)
      removed += directFiles.length
    }

    for (const folder of firstLevel.filter((object) => object?.name && !object?.id)) {
      try {
        const prefix = `${userId}/${folder.name}`
        const files = await listAll(admin, 'client-uploads', prefix)
        const paths = files
          .filter((object) => object?.name && object?.id)
          .map((object) => `${prefix}/${object.name}`)

        if (paths.length > 0) {
          await removePaths(admin, 'client-uploads', paths)
          removed += paths.length
        }
      } catch (error: any) {
        failures.push({
          bucket: 'client-uploads',
          path: `${userId}/${folder.name}`,
          error: error?.message || 'Mandanten-Uploads konnten nicht vollständig gelöscht werden.',
        })
      }
    }
  } catch (error: any) {
    failures.push({
      bucket: 'client-uploads',
      path: userId,
      error: error?.message || 'Mandanten-Uploads konnten nicht vollständig gelöscht werden.',
    })
  }

  return { removed, failures }
}
