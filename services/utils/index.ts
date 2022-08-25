export function throttle(func: Function, wait: number) {
  let waiting = false
  return function () {
    if (!waiting) {
      func.apply(this, arguments)
      waiting = true
      setTimeout(() => {
        waiting = false
      }, wait)
    }
  }
}
