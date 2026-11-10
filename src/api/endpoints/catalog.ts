import { api } from "@/api/client"
import { resolveAssetUrl } from "@/config/env"
import type { CatalogCategory, CatalogService, PageResponse } from "@/api/types"

export interface GetServicesParams {
  catalog_id?: number
  limit?: number
  offset?: number
  search?: string
}

function normalizeServiceMedia(service: CatalogService): CatalogService {
  return {
    ...service,
    image_url: resolveAssetUrl(service.image_url) ?? service.image_url,
    attachments: service.attachments?.map((att) => ({
      ...att,
      url: resolveAssetUrl(att.url) || att.url,
    })),
  }
}

export const getCategories = () => api.get<CatalogCategory[]>("/catalog/catalogs")

export const getServices = async (params?: GetServicesParams): Promise<PageResponse<CatalogService>> => {
  const res = await api.get<PageResponse<CatalogService>>(
    "/catalog/services",
    params ? { ...params } : undefined
  )
  return {
    ...res,
    items: (res.items || []).map(normalizeServiceMedia),
  }
}

export const getService = async (id: number): Promise<CatalogService> => {
  const res = await api.get<CatalogService>(`/catalog/services/${id}`)
  return normalizeServiceMedia(res)
}
