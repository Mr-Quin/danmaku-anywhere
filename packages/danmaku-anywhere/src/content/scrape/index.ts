console.log('scrape script loaded')

const { promise, resolve } = Promise.withResolvers<chrome.runtime.Port>()

chrome.runtime.onConnect.addListener((p) => {
  console.log('port connected')
  p.postMessage('ready')
  resolve(p)
})

const myPostMessage = async (message: any) => {
  const port = await promise
  port.postMessage(message)
}

const periodic = () => {
  console.log(window.location.href)
  console.log((globalThis as any).player_aaaa)
  // Object.entries(window).forEach(([key, value]: [string, any]) => {
  //   console.log(key)
  //   if (key === 'player_aaaa') {
  //     myPostMessage(value.url)
  //   }
  // })
}

setInterval(periodic, 1000)

const _r_text = window.Response.prototype.text
window.Response.prototype.text = function () {
  return new Promise((resolve, reject) => {
    _r_text
      .call(this)
      .then((text) => {
        myPostMessage(this.url)
        resolve(text)
        if (text.trim().startsWith('#EXTM3U')) {
          myPostMessage(this.url)
        }
      })
      .catch(reject)
  })
}

const _open = window.XMLHttpRequest.prototype.open
window.XMLHttpRequest.prototype.open = function (...args) {
  this.addEventListener('load', () => {
    try {
      const content = this.responseText
      if (
        content.trim().startsWith('#EXTM3U') &&
        args[1] !== null &&
        args[1] !== undefined
      ) {
        myPostMessage(args[1])
      }
    } catch {}
  })
  return _open.apply(this, args)
}

function injectIntoIframe(iframe: any) {
  try {
    const iframeWindow = iframe.contentWindow
    if (!iframeWindow) return

    const iframe_r_text = iframeWindow.Response.prototype.text
    iframeWindow.Response.prototype.text = function () {
      return new Promise((resolve, reject) => {
        iframe_r_text
          .call(this)
          .then((text) => {
            resolve(text)
            if (text.trim().startsWith('#EXTM3U')) {
              myPostMessage(this.url)
            }
          })
          .catch(reject)
      })
    }

    const iframe_open = iframeWindow.XMLHttpRequest.prototype.open
    iframeWindow.XMLHttpRequest.prototype.open = function (...args: unknown[]) {
      this.addEventListener('load', () => {
        try {
          const content = this.responseText
          if (
            content.trim().startsWith('#EXTM3U') &&
            args[1] !== null &&
            args[1] !== undefined
          ) {
            console.log(args[1])
            myPostMessage(args[1])
          }
        } catch (_) {
          //
        }
      })
      return iframe_open.apply(this, args)
    }
  } catch (e) {
    console.error('iframe inject failed:', e)
  }
}

function setupIframeListeners() {
  myPostMessage('setupIframeListeners')
  myPostMessage(document.querySelectorAll('iframe').length)

  document.querySelectorAll('iframe').forEach((iframe) => {
    if (iframe.contentDocument) {
      injectIntoIframe(iframe)
    }
    iframe.addEventListener('load', () => injectIntoIframe(iframe))
  })

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'IFRAME') {
            node.addEventListener('load', () => injectIntoIframe(node))
          }
          if ('querySelectorAll' in node) {
            ;(node.querySelectorAll as any)('iframe').forEach((iframe: any) => {
              iframe.addEventListener('load', () => injectIntoIframe(iframe))
            })
          }
        })
      }
    })
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

if (document.readyState === 'loading') {
  myPostMessage('loading')
  document.addEventListener('DOMContentLoaded', setupIframeListeners)
} else {
  myPostMessage('loaded')
  setupIframeListeners()
}
