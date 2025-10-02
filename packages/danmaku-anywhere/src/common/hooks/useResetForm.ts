import { useEffect, useRef } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

export const useResetForm = <F extends FieldValues>({
  form,
  data,
}: {
  form: UseFormReturn<F, any, F>
  data: F
}) => {
  const resetFlag = useRef(false)

  useEffect(() => {
    resetFlag.current = true
    form.reset(data)
    // Resetting the form can trigger the subscription which will submit the form again,
    // set a small timeout to prevent this
    setTimeout(() => {
      resetFlag.current = false
    }, 100)
  }, [data, form.reset])

  return resetFlag
}
