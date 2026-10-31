import { api } from './api'
import { useApi } from './useApi'

// One customer profile at `path` (a staff record or the portal's /customers/me) plus a save
export function useCustomer(path) {
  const { data, error, loading, reload, setData } = useApi(path)
  const save = async (payload) => setData(await api(path, { method: 'PATCH', body: payload }))
  return { customer: data, error, loading, reload, save }
}
