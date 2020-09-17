# Local Proxy Server for combining backend/frontend

This proxy server allows us to use any rest api backend from localhost environment

## Project install dependencies & requirements

 - Make sure your **supplier-spa** app is running with api base url pointed to same host on which app is running.
 - Run ````yarn install```` in **supplier_proxy** root to get all dependencies installed


### Usage

```node index.js --env=<dev|uat> --user=<login_username> --pass=<login_pass> --spaPort=<spa_port> --port=<proxy_app_port>```

#### required options

You need to provide atleast username and password which running above command, rest all have their defaults as follows

  - `--env=<dev|uat>` tells which rest api environment to be used, default is **dev**, you can use **dev** or **uat**.
  - `--spaPort=<spa_port` tells port on which **supplier-spa** app is running, default is **3000**
  - `--port=<proxy_app_port>` tells on which port you want to load the proxy application, default is **7070**


### Troubleshooting

   - If you are getting 401 errors for api, check either your credentials are wrong or your session is expired. correct username and password in case those are wrong, if still not working probably your session is expired, try again by deleteing **cookie.txt** file in **supplier_proxy** root, if still not working raise a issue.

   - If API requests are not being intercepted by proxy server, check the API base_url/host in **suppplier-spa** application.

   - Sometime re-trying may work, as cookie stealing process may have failed.
