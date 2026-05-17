import { databases, storage, ID } from "./appwrite"
import { supabase } from "./supabaseClient"

const DB_ID = "billing_db"
const DEFAULT_BUCKET = "company_logos"
const DEFAULT_DB_TYPE = "appwrite"

export const Query = {
  equal(field, value) {
    return { method: "equal", args: [field, value] }
  },
  orderDesc(field) {
    return { method: "orderDesc", args: [field] }
  },
  orderAsc(field) {
    return { method: "orderAsc", args: [field] }
  },
  limit(count) {
    return { method: "limit", args: [count] }
  },
  offset(count) {
    return { method: "offset", args: [count] }
  },
}

function getDbType() {
  const rawType = import.meta.env.VITE_DB_TYPE
  if (!rawType) return DEFAULT_DB_TYPE

  const normalized = String(rawType).toLowerCase().trim()
  return normalized === "supabase" ? "supabase" : DEFAULT_DB_TYPE
}

export function normalizeDoc(doc) {
  if (!doc || typeof doc !== "object") return doc

  const resolvedId = doc.$id ?? doc.id ?? null
  if (!resolvedId) return { ...doc }

  return {
    ...doc,
    id: resolvedId,
    $id: resolvedId,
  }
}

function parseQueryEntry(entry) {
  if (!entry) return null

  if (typeof entry === "object" && entry.method) {
    return entry
  }

  if (typeof entry !== "string") return null

  const openParenIndex = entry.indexOf("(")
  const closeParenIndex = entry.lastIndexOf(")")
  if (openParenIndex === -1 || closeParenIndex === -1) return null

  const method = entry.slice(0, openParenIndex).trim()
  const argsRaw = entry.slice(openParenIndex + 1, closeParenIndex)
  const payloadText = `[${argsRaw}]`

  try {
    const args = JSON.parse(payloadText)
    return { method, args }
  } catch {
    return null
  }
}

function applySupabaseQuery(queryBuilder, queryEntries = []) {
  let builder = queryBuilder
  let pageLimit = null
  let pageOffset = 0

  for (const entry of queryEntries) {
    const parsed = parseQueryEntry(entry)
    if (!parsed) continue

    const { method, args = [] } = parsed

    if (method === "equal" && args.length >= 2) {
      const [field, value] = args
      if (Array.isArray(value)) {
        if (value.length === 1) {
          builder = builder.eq(field, value[0])
        } else if (value.length > 1) {
          builder = builder.in(field, value)
        }
      } else {
        builder = builder.eq(field, value)
      }
      continue
    }

    if (method === "orderDesc" && args.length >= 1) {
      builder = builder.order(args[0], { ascending: false })
      continue
    }

    if (method === "orderAsc" && args.length >= 1) {
      builder = builder.order(args[0], { ascending: true })
      continue
    }

    if (method === "limit" && args.length >= 1) {
      const parsedLimit = Number(args[0])
      if (!Number.isNaN(parsedLimit) && parsedLimit >= 0) {
        pageLimit = parsedLimit
      }
      continue
    }

    if (method === "offset" && args.length >= 1) {
      const parsedOffset = Number(args[0])
      if (!Number.isNaN(parsedOffset) && parsedOffset >= 0) {
        pageOffset = parsedOffset
      }
    }
  }

  if (pageLimit !== null) {
    const from = pageOffset
    const to = pageOffset + pageLimit - 1
    builder = builder.range(from, to)
  } else if (pageOffset > 0) {
    builder = builder.range(pageOffset, pageOffset + 999)
  }

  return builder
}

export async function listDocuments(collectionId, query = []) {
  const dbType = getDbType()

  if (dbType === "supabase") {
    let builder = supabase
      .from(collectionId)
      .select("*", { count: "exact" })

    builder = applySupabaseQuery(builder, query)
    const { data, error, count } = await builder
    if (error) throw error

    const documents = (data || []).map(normalizeDoc)
    return {
      total: typeof count === "number" ? count : documents.length,
      documents,
    }
  }

  const response = await databases.listDocuments(DB_ID, collectionId, query)
  return {
    total: response?.total ?? 0,
    documents: (response?.documents || []).map(normalizeDoc),
  }
}

export async function createDocument(collectionId, payload) {
  const dbType = getDbType()

  if (dbType === "supabase") {
    const { data, error } = await supabase
      .from(collectionId)
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return normalizeDoc(data)
  }

  const response = await databases.createDocument(
    DB_ID,
    collectionId,
    ID.unique(),
    payload
  )

  return normalizeDoc(response)
}

export async function getDocument(collectionId, docId) {
  const dbType = getDbType()

  if (dbType === "supabase") {
    const { data, error } = await supabase
      .from(collectionId)
      .select("*")
      .eq("id", docId)
      .single()

    if (error) throw error
    return normalizeDoc(data)
  }

  const response = await databases.getDocument(DB_ID, collectionId, docId)
  return normalizeDoc(response)
}

export async function updateDocument(collectionId, docId, payload) {
  const dbType = getDbType()

  if (dbType === "supabase") {
    const { data, error } = await supabase
      .from(collectionId)
      .update(payload)
      .eq("id", docId)
      .select()
      .single()

    if (error) throw error
    return normalizeDoc(data)
  }

  const response = await databases.updateDocument(DB_ID, collectionId, docId, payload)
  return normalizeDoc(response)
}

export async function deleteDocument(collectionId, docId) {
  const dbType = getDbType()

  if (dbType === "supabase") {
    const { error } = await supabase
      .from(collectionId)
      .delete()
      .eq("id", docId)

    if (error) throw error
    return true
  }

  await databases.deleteDocument(DB_ID, collectionId, docId)
  return true
}

export async function uploadFile(file, bucketId = DEFAULT_BUCKET) {
  const dbType = getDbType()

  if (dbType === "supabase") {
    const safeFileName = `${Date.now()}-${file?.name || "upload"}`
    const { data, error } = await supabase
      .storage
      .from(bucketId)
      .upload(safeFileName, file, { upsert: false })

    if (error) throw error

    const { data: publicUrlData } = supabase
      .storage
      .from(bucketId)
      .getPublicUrl(data.path)

    return String(publicUrlData.publicUrl)
  }

  const upload = await storage.createFile(bucketId, ID.unique(), file)
  const viewUrl = storage.getFileView(bucketId, upload.$id)
  return String(viewUrl)
}
