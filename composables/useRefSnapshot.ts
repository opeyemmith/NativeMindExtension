import { ref } from 'vue'

export function useRefSnapshot<T>(refValue: Ref<T>) {
  const snapshot = ref(refValue.value)

  const updateSnapshot = () => {
    snapshot.value = refValue.value
  }

  return {
    snapshot,
    updateSnapshot,
  }
}
