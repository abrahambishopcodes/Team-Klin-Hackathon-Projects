import { useCallback, useEffect, useRef, useState } from "react"

type UseControllableStateParams<T> = {
  prop?: T
  defaultProp?: T
  onChange?: (value: T) => void
}

export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateParams<T>): [T | undefined, (value: T) => void] {
  const [uncontrolledValue, setUncontrolledValue] = useState<T | undefined>(defaultProp)
  const isControlled = prop !== undefined
  const value = isControlled ? prop : uncontrolledValue

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const setValue = useCallback(
    (nextValue: T) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue)
      }
      onChangeRef.current?.(nextValue)
    },
    [isControlled]
  )

  return [value, setValue]
}
