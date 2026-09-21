# @ciiri/node-socks5-server

提供 `socks5` 包，用于实现 [SOCKS5 服务器](http://en.wikipedia.org/wiki/SOCKS)。
SOCKS（Secure Sockets）用于通过中间代理层在客户端和服务器之间转发流量。
它可用于绕过防火墙或 NAT。

这个分支默认对域名请求使用系统 DNS 查询，因此 SOCKS5 代理可以使用
`/etc/hosts` 或操作系统解析器中的主机映射。
当提供 `dns` 选项时，服务器仍会使用指定的 DNS 服务。

## 功能

- 无认证模式
- 用户名/密码认证
- 支持 `CONNECT` 命令
- 支持 UDP
- 设置 `localAddress` 接口
- 使用指定的 DNS 服务器
- 默认使用支持系统 hosts 的 DNS 查询

## 命令行使用

### 全局安装

```bash
npm i -g @ciiri/node-socks5-server
```

### 启动

```bash
ciiri-node-socks5
```

SOCKS5 服务器默认监听 `1080` 端口。可使用 `--port` 修改监听端口：

```bash
ciiri-node-socks5 --port 1081
```

## TCP 端口转发

`ciiri-node-portfwd` 会启动一个 TCP 端口转发器。它监听本机端口，并将连接转发到目标主机的同一端口。

```bash
ciiri-node-portfwd --ip 192.168.64.2 --port 5174
```

该命令会监听 `0.0.0.0:5174`，并将流量转发到 `192.168.64.2:5174`。
默认目标也是 `192.168.64.2:5174`，因此在使用默认值时这两个参数都可以省略。

### 监听多个端口

`--port` 支持逗号分隔的端口列表，多个端口在同一个进程内监听，不需要启动多个实例：

```bash
ciiri-node-portfwd --ip 192.168.64.2 --port 5174,5175,8080
```

上面会同时监听 `0.0.0.0:5174`、`0.0.0.0:5175`、`0.0.0.0:8080`，并分别转发到目标主机的同名端口。
`--port` 也可以重复书写，效果相同：

```bash
ciiri-node-portfwd --ip 192.168.64.2 --port 5174 --port 5175
```

可用选项：

- `--ip <address>`：目标主机或 IP 地址
- `--port <ports>` 或 `-p <ports>`：本地监听和目标 TCP 端口，支持逗号分隔或重复书写，范围 `1` 到 `65535`
- `-h` 或 `--help`：显示命令帮助

转发器会在控制台输出启动、接受连接、目标连接状态、错误、连接关闭和关闭服务等事件。
监听多个端口时，日志前会带有本地端口（如 `[5174]`）以便区分。

停止时，按 `Ctrl+C`。

## macOS 应用循环重启

`ciiri-node-loop-restart-app` 仅适用于 macOS。它会按照指定间隔退出并重新打开指定应用。

```bash
ciiri-node-loop-restart-app --app "Safari" --interval 30m
```

可用选项：

- `--app <name>`：要重启的应用名称
- `--interval <duration>`：重启间隔，支持 `ms`、`s`、`m`、`h`，例如 `5000`、`30s`、`5m`、`1h`
- `--restart-delay <ms>`：退出后等待多久再重新打开，默认 `2000`
- `-h` 或 `--help`：显示命令帮助

## 作为包使用

### 在项目中安装

```bash
npm i @ciiri/node-socks5-server
```

### 引入

下面是一个简单的使用示例。更多示例请查看 `examples` 目录。

```javascript
const socks5 = require('@ciiri/node-socks5-server');

const server = socks5.createServer();
server.listen(1080);
```

### DNS 查询

默认情况下，域名请求会使用系统 DNS 查询。这使得代理可以解析
`/etc/hosts` 中的域名：

```javascript
const socks5 = require('@ciiri/node-socks5-server');

const server = socks5.createServer();
server.listen(1080);
```

如果要强制使用指定的 DNS 服务器，可以传入 `dns` 选项：

```javascript
const socks5 = require('@ciiri/node-socks5-server');

const server = socks5.createServer({
  dns: '8.8.8.8',
});

server.listen(1080);
```

## 使用 curl 测试

```bash
curl http://www.baidu.com/ --socks5 localhost:1080
curl http://www.baidu.com/ --socks5-hostname localhost:1080
curl http://www.baidu.com/ --socks5 user:password@localhost:1080
```

## TODO

- bind

## 致谢

- [socks](https://zh.wikipedia.org/wiki/SOCKS)
- [rfc1928](https://tools.ietf.org/html/rfc1928)
- [rfc1929](https://tools.ietf.org/html/rfc1929)
- [go-socks](https://github.com/armon/go-socks5)
