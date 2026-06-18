# @ciiri/node-socks5-server

Provides the `socks5` package that implements a [SOCKS5 server](http://en.wikipedia.org/wiki/SOCKS).
SOCKS (Secure Sockets) is used to route traffic between a client and server through
an intermediate proxy layer. This can be used to bypass firewalls or NATs.

This fork defaults to system DNS lookup for domain requests, so host mappings from
`/etc/hosts` or the operating system resolver can be used by the SOCKS5 proxy.
When a `dns` option is provided, the server still uses that explicit DNS server.

## Features

- "No Auth" mode
- User/Password authentication
- Support for the CONNECT command
- Support UDP
- set localAddress interface
- use specific DNS server
- Use system hosts-aware DNS lookup by default

## Usage for command

### Install global

```
npm i -g @ciiri/node-socks5-server
```

### Startup

```
node-socks5
```

## Usage for package

### Install in your project

```
npm i @ciiri/node-socks5-server
```

### Require

Below is a simple example of usage. Go examples folder see more.

```javascript
const socks5 = require('@ciiri/node-socks5-server');

const server = socks5.createServer();
server.listen(1080);
```

### DNS lookup

By default, domain requests use system DNS lookup. This allows the proxy to resolve
domains from `/etc/hosts`:

```javascript
const socks5 = require('@ciiri/node-socks5-server');

const server = socks5.createServer();
server.listen(1080);
```

To force a specific DNS server, pass the `dns` option:

```javascript
const socks5 = require('@ciiri/node-socks5-server');

const server = socks5.createServer({
  dns: '8.8.8.8',
});

server.listen(1080);
```

## Test with curl

```bash
curl http://www.baidu.com/ --socks5 localhost:1080
curl http://www.baidu.com/ --socks5-hostname localhost:1080
curl http://www.baidu.com/ --socks5 user:password@localhost:1080
```

## TODO

- bind

## Thanks

- [socks](https://zh.wikipedia.org/wiki/SOCKS)
- [rfc1928](https://tools.ietf.org/html/rfc1928)
- [rfc1929](https://tools.ietf.org/html/rfc1929)
- [go-socks](https://github.com/armon/go-socks5)
