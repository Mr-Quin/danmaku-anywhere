import { useStore } from '../store/store'

export const useActiveConfig = () => {
  return useStore((state) => state.config)
}
