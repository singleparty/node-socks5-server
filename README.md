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

```bash
ciiri-node-socks5
```

The SOCKS5 server listens on port `1080` by default. Use `--port` to change
the listening port:

```bash
ciiri-node-socks5 --port 1081
```

## TCP port forwarding

`ciiri-node-portfwd` starts a TCP port forwarder. It listens on the local
machine and forwards connections to the same port on the target host.

```bash
ciiri-node-portfwd --ip 192.168.64.2 --port 5174
```

This command listens on `0.0.0.0:5174` and forwards traffic to
`192.168.64.2:5174`. The default target is `192.168.64.2:5174`, so both
options are optional when using those defaults.

Available options:

- `--ip <address>`: target host or IP address
- `--port <port>` or `-p <port>`: local and target TCP port, from `1` to `65535`
- `-h` or `--help`: show command help

The forwarder logs startup, accepted connections, target connection status,
errors, connection closure, and shutdown events to the console.

To stop it, press `Ctrl+C`.

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
