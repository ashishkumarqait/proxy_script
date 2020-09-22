const http = require('http');
const httpProxy = require('http-proxy');
const url = require("url");
const axios = require('axios')
const puppeteer = require('puppeteer');
const fs = require('fs');


// parse command line options
const args = process.argv.slice(2)
// supported options
const options = {
  env: 'dev',
  user: '',
  pass: '',
  spaPort: 3000, // on which spa is running 
  port: 7070 // on which proxy application is exposed
}
args.forEach(arg => {
  const keyVal = arg.substring(2).split("=")
  options[keyVal[0]] = keyVal[1] || ""
})


const API_ENV_HOST = `https://${options.env}.ark.clarusonetesting.com`

const getCookie = async (onFound) => {
  const cookieJar = "cookie.txt"
  let cookie = ""
  try{
    cookie = fs.readFileSync(cookieJar, 'utf-8')
  }catch(e){
    console.log("Getting session cookies")
    const browser = await puppeteer.launch({
      args: ['--disable-web-security', '--allow-running-insecure-content'],
      headless: true // you can switch to false to visually verify login
    });
    const page = await browser.newPage();
    const loginUrl = API_ENV_HOST + '/login'
    await page.goto(loginUrl);
    await page.waitForSelector("[name='username']")
    await page.type("[name='username']", options.user)
    await page.type("[name='password']", options.pass)
    await page.click("[type='submit']")
    await page.waitForNavigation({ waitUntil: 'networkidle0' })
  
    const cookies = await page.cookies()
    // store cookie for later use
    cookie = cookies.map(c => {
      return `${c.name}=${c.value}`
    }).join("; ")

    try{
      fs.writeFileSync(cookieJar, cookie)
      console.log("cookies cached, next session will launch faster")
    }catch(e){
      console.warn("unable to cache cookies")
    }finally{
      await browser.close()
    }
  }finally{
    onFound(cookie)
  }
}


getCookie(cookie => {
  const ApiProxyCall = async (path, method, cookie, data = {}, onComplete) => {
    try {
      console.log("ROUTING TO :", API_ENV_HOST + path)
      const rp = await axios({
        method,
        url: API_ENV_HOST + path,
        headers: {
          'Cookie': cookie
        },
        data
      })
      onComplete({
        error: false,
        data: rp.data
      })
    } catch (e) {
      onComplete({
        error: true,
        code: e.response.data.status || 500
      })
    }
  }

  // PROXY SERVER
  // any traffic to 7070 will be routed to 9000 ( proxy server )
  console.log(`Starting server on ${options.port}`)
  const proxy = httpProxy.createProxyServer({ target: 'http://localhost:9000' }).listen(options.port);

  http.createServer(function (req, res) {
    const path = url.parse(req.url).path
    req.headers.cookie = cookie
    // this is a api call should go to dev/uat environment
    if (path.startsWith("/api")) {
      if (req.method.toUpperCase() !== 'GET') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          const data = Buffer.concat(chunks);
          ApiProxyCall(path, req.method, cookie, data, function (rp) {
            if (rp.error) {
              res.statusCode = rp.code
              res.end()
            } else {
              res.write(JSON.stringify(rp.data))
              res.end()
            }
          })
        })
      } else {
        ApiProxyCall(path, req.method, cookie, {}, function (rp) {
          if (rp.error) {
            res.statusCode = rp.code
            res.end()
        } else {
            res.write(JSON.stringify(rp.data))
            res.end()
          }
        })
      }
    } else {
      // else simply route to frontend app
      proxy.web(req, res, {
        target: `http://localhost:${options.spaPort}`
      });
    }
  }).listen(9000);
  process.on('uncaughtException', (e) => {
    console.error(e)
  })
})