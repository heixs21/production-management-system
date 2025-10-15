const WebSocket = require("ws");
const opcuaManager = require("./opcuaService");

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  // 初始化 WebSocket 服务器
  initialize(server) {
    this.wss = new WebSocket.Server({
      server,
      path: "/ws/machine-status",
    });

    this.wss.on("connection", (ws, req) => {
      console.log(`🔌 新的 WebSocket 连接: ${req.socket.remoteAddress}`);
      this.clients.add(ws);

      // 发送欢迎消息
      ws.send(
        JSON.stringify({
          type: "connection",
          message: "已连接到机台状态实时推送服务",
          timestamp: new Date().toISOString(),
        })
      );

      // 处理客户端消息
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          console.log("收到客户端消息:", data);

          // 可以根据需要处理不同类型的客户端请求
          if (data.type === "ping") {
            ws.send(
              JSON.stringify({
                type: "pong",
                timestamp: new Date().toISOString(),
              })
            );
          }
        } catch (error) {
          console.error("处理 WebSocket 消息失败:", error);
        }
      });

      // 处理连接关闭
      ws.on("close", () => {
        console.log("🔌 WebSocket 连接已关闭");
        this.clients.delete(ws);
      });

      // 处理错误
      ws.on("error", (error) => {
        console.error("WebSocket 错误:", error);
        this.clients.delete(ws);
      });

      // 心跳检测
      ws.isAlive = true;
      ws.on("pong", () => {
        ws.isAlive = true;
      });
    });

    // 定期清理死连接（每30秒）
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log("🔌 清理死连接");
          this.clients.delete(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    // 注册 OPC UA 状态更新回调
    opcuaManager.onStatusUpdate((machineId, statusData) => {
      this.broadcastMachineStatus(statusData);
    });

    console.log("✅ WebSocket 服务已初始化");
  }

  // 广播机台状态给所有客户端
  broadcastMachineStatus(statusData) {
    const message = JSON.stringify({
      type: "machine-status-update",
      data: statusData,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(
        `📡 已向 ${sentCount} 个客户端推送机台 ${statusData.machineName} 的状态更新`
      );
    }
  }

  // 向特定客户端发送消息
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // 关闭所有连接
  closeAll() {
    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }
  }
}

// 单例模式
const websocketService = new WebSocketService();

module.exports = websocketService;
