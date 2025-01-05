declare module 'opencc-js' {
  function Converter(options: {
    from: 'cn' | 'tw' | 'hk'
    to: 'cn' | 'tw' | 'hk'
  }): (str: string) => string
}
