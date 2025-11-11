const {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  ClientSubscription,
  ClientMonitoredItem,
  TimestampsToReturn,
  MonitoringParametersOptions,
  ReadValueIdOptions,
} = require("node-opcua");
const { pool } = require("./database");

// OPC UA 客户端管理器
class OPCUAManager {
  constructor() {
    this.clients = new Map(); // machineId -> client
    this.sessions = new Map(); // machineId -> session
    this.subscriptions = new Map(); // machineId -> subscription
    this.statusCallbacks = []; // 状态更新回调函数
  }

  // 注册状态更新回调
  onStatusUpdate(callback) {
    this.statusCallbacks.push(callback);
  }

  // 触发状态更新
  notifyStatusUpdate(machineId, data) {
    this.statusCallbacks.forEach((cb) => cb(machineId, data));
  }

  // 连接到 OPC UA 服务器
  async connectMachine(machineConfig) {
    const {
      id,
      opcuaEndpoint,
      opcuaNodeId,
      name,
      opcuaUsername,
      opcuaPassword,
    } = machineConfig;

    if (!opcuaEndpoint || !opcuaNodeId) {
      throw new Error("OPC UA 配置不完整");
    }

    try {
      // 创建客户端
      const client = OPCUAClient.create({
        applicationName: "Production Management System",
        connectionStrategy: {
          initialDelay: 1000,
          maxRetry: 1,
        },
        securityMode: MessageSecurityMode.None,
        securityPolicy: SecurityPolicy.None,
        endpointMustExist: false,
      });

      // 连接到服务器
      await client.connect(opcuaEndpoint);
      console.log(`✅ 已连接到机台 ${name} 的 OPC UA 服务器: ${opcuaEndpoint}`);

      // 准备用户身份信息
      let userIdentity = null;
      if (opcuaUsername && opcuaPassword) {
        userIdentity = {
          userName: opcuaUsername,
          password: opcuaPassword,
        };
        console.log(`🔐 使用用户名认证: ${opcuaUsername}`);
      } else {
        console.log(`🔓 使用匿名认证`);
      }

      // 创建会话
      const session = await client.createSession(userIdentity);
      console.log(`✅ 已创建 OPC UA 会话: ${name}`);

      // 创建订阅
      const subscription = ClientSubscription.create(session, {
        requestedPublishingInterval: 1000, // 1秒更新一次
        requestedLifetimeCount: 100,
        requestedMaxKeepAliveCount: 10,
        maxNotificationsPerPublish: 100,
        publishingEnabled: true,
        priority: 10,
      });

      subscription.on("started", () => {
        console.log(`✅ 订阅已启动: ${name}`);
      });

      // 监控节点数据变化
      const itemToMonitor = {
        nodeId: opcuaNodeId,
        attributeId: AttributeIds.Value,
      };

      const monitoringParameters = {
        samplingInterval: 1000,
        discardOldest: true,
        queueSize: 10,
      };

      const monitoredItem = ClientMonitoredItem.create(
        subscription,
        itemToMonitor,
        monitoringParameters,
        TimestampsToReturn.Both
      );

      console.log(`✅ 已创建监控项 [${name}]: ${opcuaNodeId}`);

      monitoredItem.on("changed", async (dataValue) => {
        const statusData = {
          value: dataValue.value.value,
          timestamp: dataValue.serverTimestamp || new Date(),
          quality: dataValue.statusCode.toString(),
        };

        // 解析状态值
        const parsedStatus = this.parseStatusValue(statusData.value);

        // 更新数据库
        await this.updateMachineRealtimeStatus(id, {
          ...parsedStatus,
          lastUpdate: statusData.timestamp,
        });

        // 通知前端
        this.notifyStatusUpdate(id, {
          machineId: id,
          machineName: name,
          ...parsedStatus,
          timestamp: statusData.timestamp,
        });
      });

      // 保存连接信息
      this.clients.set(id, client);
      this.sessions.set(id, session);
      this.subscriptions.set(id, subscription);

      return { success: true, message: `已连接到机台 ${name}` };
    } catch (error) {
      console.error(`❌ 连接机台 ${name} 失败:`, error.message);
      throw new Error(`连接失败: ${error.message}`);
    }
  }

  // 解析状态值（根据实际 OPC UA 数据格式调整）
  parseStatusValue(value) {
    // 假设值是一个对象或数字，根据实际情况调整
    if (typeof value === "object") {
      return {
        status: value.status || "未知",
        running: value.running || false,
        temperature: value.temperature || null,
        speed: value.speed || null,
        errorCode: value.errorCode || null,
      };
    } else if (typeof value === "number") {
      // 数字映射到状态
      const statusMap = {
        0: "停机",
        1: "正常",
        2: "维修",
        3: "待机",
        4: "报警",
      };
      return {
        status: statusMap[value] || "未知",
        running: value === 1,
        statusCode: value,
      };
    } else if (typeof value === "boolean") {
      return {
        status: value ? "正常" : "停机",
        running: value,
      };
    }

    return {
      status: String(value),
      running: false,
    };
  }

  // 更新机台实时状态到数据库
  async updateMachineRealtimeStatus(machineId, statusData) {
    try {
      const connection = await pool.getConnection();

      await connection.execute(
        `UPDATE machines SET 
          status = ?,
          realtimeData = ?,
          lastOpcuaUpdate = ?
        WHERE id = ?`,
        [
          statusData.status || "未知",
          JSON.stringify(statusData),
          statusData.lastUpdate || new Date(),
          machineId,
        ]
      );

      connection.release();
    } catch (error) {
      console.error("更新机台状态失败:", error);
    }
  }

  // 断开机台连接
  async disconnectMachine(machineId) {
    try {
      const subscription = this.subscriptions.get(machineId);
      if (subscription) {
        await subscription.terminate();
        this.subscriptions.delete(machineId);
      }

      const session = this.sessions.get(machineId);
      if (session) {
        await session.close();
        this.sessions.delete(machineId);
      }

      const client = this.clients.get(machineId);
      if (client) {
        await client.disconnect();
        this.clients.delete(machineId);
      }

      console.log(`✅ 已断开机台 ${machineId} 的 OPC UA 连接`);
      return { success: true, message: "已断开连接" };
    } catch (error) {
      console.error(`断开机台 ${machineId} 连接失败:`, error);
      throw error;
    }
  }

  // 读取单个值（不订阅）
  async readNodeValue(machineConfig) {
    const { opcuaEndpoint, opcuaNodeId, opcuaUsername, opcuaPassword } =
      machineConfig;

    const client = OPCUAClient.create({
      applicationName: "Production Management System",
      connectionStrategy: { initialDelay: 1000, maxRetry: 1 },
      securityMode: MessageSecurityMode.None,
      securityPolicy: SecurityPolicy.None,
      endpointMustExist: false,
    });

    try {
      await client.connect(opcuaEndpoint);

      // 准备用户身份信息
      let userIdentity = null;
      if (opcuaUsername && opcuaPassword) {
        userIdentity = {
          userName: opcuaUsername,
          password: opcuaPassword,
        };
      }

      const session = await client.createSession(userIdentity);

      const dataValue = await session.read({
        nodeId: opcuaNodeId,
        attributeId: AttributeIds.Value,
      });

      await session.close();
      await client.disconnect();

      return {
        value: dataValue.value.value,
        timestamp: dataValue.serverTimestamp,
        quality: dataValue.statusCode.toString(),
      };
    } catch (error) {
      console.error("读取 OPC UA 节点失败:", error);
      throw error;
    }
  }

  // 断开所有连接
  async disconnectAll() {
    const machineIds = Array.from(this.clients.keys());
    for (const machineId of machineIds) {
      await this.disconnectMachine(machineId);
    }
  }

  // 获取连接状态
  getConnectionStatus(machineId) {
    return {
      connected: this.clients.has(machineId),
      hasSession: this.sessions.has(machineId),
      hasSubscription: this.subscriptions.has(machineId),
    };
  }
}

// 单例模式
const opcuaManager = new OPCUAManager();

module.exports = opcuaManager;
