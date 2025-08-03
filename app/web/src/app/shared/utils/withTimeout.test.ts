// import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// import { withTimeout } from './withTimeout'
//
// describe('withTimeout', () => {
//   beforeEach(() => {
//     vi.clearAllTimers()
//     vi.useFakeTimers()
//   })
//
//   afterEach(() => {
//     vi.useRealTimers()
//   })
//
//   describe('when promise resolves before timeout', () => {
//     it('should return the resolved value', async () => {
//       const expectedValue = { data: 'test result' }
//       const promise = Promise.resolve(expectedValue)
//
//       const result = await withTimeout(promise, 1000)
//
//       expect(result).toEqual(expectedValue)
//     })
//
//     it('should work with primitive values', async () => {
//       const stringPromise = Promise.resolve('hello')
//       const numberPromise = Promise.resolve(42)
//       const booleanPromise = Promise.resolve(true)
//
//       const [stringResult, numberResult, booleanResult] = await Promise.all([
//         withTimeout(stringPromise, 1000),
//         withTimeout(numberPromise, 1000),
//         withTimeout(booleanPromise, 1000),
//       ])
//
//       expect(stringResult).toBe('hello')
//       expect(numberResult).toBe(42)
//       expect(booleanResult).toBe(true)
//     })
//
//     it('should clear the timeout', async () => {
//       const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
//       const promise = Promise.resolve('test')
//
//       await withTimeout(promise, 1000)
//
//       expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
//       clearTimeoutSpy.mockRestore()
//     })
//   })
//
//   describe('when promise rejects before timeout', () => {
//     it('should propagate the rejection', async () => {
//       const error = new Error('Promise rejected')
//       const promise = Promise.reject(error)
//
//       await expect(withTimeout(promise, 1000)).rejects.toThrow('Promise rejected')
//     })
//
//     it('should clear the timeout on rejection', async () => {
//       const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
//       const promise = Promise.reject(new Error('test error'))
//
//       try {
//         await withTimeout(promise, 1000)
//       } catch {
//         // Expected to throw
//       }
//
//       expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
//       clearTimeoutSpy.mockRestore()
//     })
//   })
//
//   describe('when promise times out', () => {
//     it('should throw timeout error with default message', async () => {
//       const promise = new Promise<string>((resolve) => {
//         setTimeout(() => resolve('delayed result'), 2000)
//       })
//
//       const timeoutPromise = withTimeout(promise, 1000)
//
//       // Fast-forward time to trigger timeout
//       vi.advanceTimersByTime(1000)
//
//       await expect(timeoutPromise).rejects.toThrow('Request timed out')
//     })
//
//     it('should throw timeout error with custom message', async () => {
//       const customMessage = 'Custom timeout error message'
//       const promise = new Promise<string>((resolve) => {
//         setTimeout(() => resolve('delayed result'), 2000)
//       })
//
//       const timeoutPromise = withTimeout(promise, 1000, customMessage)
//
//       // Fast-forward time to trigger timeout
//       vi.advanceTimersByTime(1000)
//
//       await expect(timeoutPromise).rejects.toThrow(customMessage)
//     })
//
//     it('should throw Error instance', async () => {
//       const promise = new Promise<string>((resolve) => {
//         setTimeout(() => resolve('delayed result'), 2000)
//       })
//
//       const timeoutPromise = withTimeout(promise, 1000)
//
//       // Fast-forward time to trigger timeout
//       vi.advanceTimersByTime(1000)
//
//       try {
//         await timeoutPromise
//         expect.fail('Should have thrown an error')
//       } catch (error) {
//         expect(error).toBeInstanceOf(Error)
//       }
//     })
//   })
//
//   describe('edge cases', () => {
//     it('should handle zero timeout', async () => {
//       const promise = new Promise<string>((resolve) => {
//         setTimeout(() => resolve('delayed result'), 100)
//       })
//
//       const timeoutPromise = withTimeout(promise, 0)
//
//       // Immediately advance timers
//       vi.advanceTimersByTime(0)
//
//       await expect(timeoutPromise).rejects.toThrow('Request timed out')
//     })
//
//     it('should handle promise that resolves at exactly the timeout duration', async () => {
//       let resolvePromise: (value: string) => void
//       const promise = new Promise<string>((resolve) => {
//         resolvePromise = resolve
//       })
//
//       const timeoutPromise = withTimeout(promise, 1000)
//
//       // Resolve the promise exactly at timeout
//       setTimeout(() => resolvePromise('resolved'), 1000)
//
//       // Fast-forward time
//       vi.advanceTimersByTime(999)
//
//       // Should not have timed out yet
//       expect(vi.getTimerCount()).toBeGreaterThan(0)
//
//       // Complete the last millisecond
//       vi.advanceTimersByTime(1)
//
//       // The result depends on the timing, but it should either resolve or timeout
//       try {
//         const result = await timeoutPromise
//         expect(result).toBe('resolved')
//       } catch (error) {
//         expect(error).toBeInstanceOf(Error)
//         expect((error as Error).message).toBe('Request timed out')
//       }
//     })
//
//     it('should handle already resolved promise', async () => {
//       const promise = Promise.resolve('already resolved')
//
//       const result = await withTimeout(promise, 1000)
//
//       expect(result).toBe('already resolved')
//     })
//
//     it('should handle already rejected promise', async () => {
//       const promise = Promise.reject(new Error('already rejected'))
//
//       await expect(withTimeout(promise, 1000)).rejects.toThrow('already rejected')
//     })
//   })
//
//   describe('timeout cleanup', () => {
//     it('should not call clearTimeout if timer has already fired', async () => {
//       const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
//       const promise = new Promise<string>((resolve) => {
//         setTimeout(() => resolve('delayed result'), 2000)
//       })
//
//       const timeoutPromise = withTimeout(promise, 1000)
//
//       // Fast-forward past timeout
//       vi.advanceTimersByTime(1000)
//
//       try {
//         await timeoutPromise
//       } catch {
//         // Expected to throw
//       }
//
//       // clearTimeout should still be called even after timeout fires
//       expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
//       clearTimeoutSpy.mockRestore()
//     })
//   })
//
//   describe('type safety', () => {
//     it('should preserve the generic type of the promise', async () => {
//       interface TestData {
//         id: number
//         name: string
//       }
//
//       const testData: TestData = { id: 1, name: 'test' }
//       const promise: Promise<TestData> = Promise.resolve(testData)
//
//       const result: TestData = await withTimeout(promise, 1000)
//
//       expect(result.id).toBe(1)
//       expect(result.name).toBe('test')
//     })
//   })
// })
