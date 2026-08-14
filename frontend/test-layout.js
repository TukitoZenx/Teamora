import puppeteer from 'puppeteer'

;(async () => {
  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()
  await page.goto('http://localhost:5173')
  // Wait for React to mount
  await page.waitForTimeout(2000)

  const layout = await page.evaluate(() => {
    const fadeContainer = document.querySelector('.teamora-content-fade')
    if (!fadeContainer) return 'Container not found'

    const children = Array.from(fadeContainer.children).map((child) => ({
      tagName: child.tagName,
      className: child.className,
      rect: child.getBoundingClientRect(),
      text: child.innerText.substring(0, 50).replace(/\n/g, ' ')
    }))

    return {
      containerRect: fadeContainer.getBoundingClientRect(),
      children: children
    }
  })

  console.log(JSON.stringify(layout, null, 2))
  await browser.close()
})()
