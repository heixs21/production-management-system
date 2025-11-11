const express = require("express");
const router = express.Router();
const { pool } = require("../database");
const opcuaManager = require("../opcuaService");
const { authenticateToken } = require("../auth");

// 获取机台的 OPC UA 配置
router.get(
  "/machines/:id/opcua-config",
  authenticateToken,
  async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT id, name, opcuaEnabled, opcuaEndpoint, opcuaNodeId, opcuaUsername 
       FROM machines WHERE id = ?`,
        [req.params.id]
      );
      connection.release();

      if (rows.length === 0) {
        return res.status(404).json({ error: "机台不存在" });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error("获取 OPC UA 配置失败:", error);
      res.status(500).json({ error: "服务器错误" });
    }
  }
);

// 更新机台的 OPC UA 配置
router.put(
  "/machines/:id/opcua-config",
  authenticateToken,
  async (req, res) => {
    const {
      opcuaEnabled,
      opcuaEndpoint,
      opcuaNodeId,
      opcuaUsername,
      opcuaPassword,
    } = req.body;

    try {
      const connection = await pool.getConnection();

      // 构建更新语句
      let updateFields = [
        "opcuaEnabled = ?",
        "opcuaEndpoint = ?",
        "opcuaNodeId = ?",
        "opcuaUsername = ?",
      ];
      let values = [opcuaEnabled, opcuaEndpoint, opcuaNodeId, opcuaUsername];

      // 只有提供了密码才更新
      if (opcuaPassword) {
        updateFields.push("opcuaPassword = ?");
        values.push(opcuaPassword);
      }

      values.push(req.params.id);

      await connection.execute(
        `UPDATE machines SET ${updateFields.join(", ")} WHERE id = ?`,
        values
      );

      connection.release();

      // 如果之前已连接，先断开
      if (opcuaManager.getConnectionStatus(req.params.id).connected) {
        await opcuaManager.disconnectMachine(req.params.id);
      }

      res.json({ success: true, message: "OPC UA 配置已更新" });
    } catch (error) {
      console.error("更新 OPC UA 配置失败:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// 连接到机台的 OPC UA 服务器
router.post(
  "/machines/:id/opcua-connect",
  authenticateToken,
  async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT id, name, opcuaEnabled, opcuaEndpoint, opcuaNodeId, opcuaUsername, opcuaPassword 
       FROM machines WHERE id = ?`,
        [req.params.id]
      );
      connection.release();

      if (rows.length === 0) {
        return res.status(404).json({ error: "机台不存在" });
      }

      const machine = rows[0];

      if (!machine.opcuaEnabled) {
        return res.status(400).json({ error: "机台未启用 OPC UA" });
      }

      const result = await opcuaManager.connectMachine(machine);

      res.json(result);
    } catch (error) {
      console.error("连接 OPC UA 失败:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// 断开机台的 OPC UA 连接
router.post(
  "/machines/:id/opcua-disconnect",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await opcuaManager.disconnectMachine(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("断开 OPC UA 连接失败:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// 测试 OPC UA 连接（不保持连接）
router.post("/machines/opcua-test", authenticateToken, async (req, res) => {
  const { opcuaEndpoint, opcuaNodeId, opcuaUsername, opcuaPassword } = req.body;

  try {
    const result = await opcuaManager.readNodeValue({
      opcuaEndpoint,
      opcuaNodeId,
      opcuaUsername,
      opcuaPassword,
    });
    res.json({
      success: true,
      message: "连接成功",
      data: result,
    });
  } catch (error) {
    console.error("测试 OPC UA 连接失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 获取机台连接状态
router.get(
  "/machines/:id/opcua-status",
  authenticateToken,
  async (req, res) => {
    try {
      const status = opcuaManager.getConnectionStatus(req.params.id);

      // 获取最新的实时数据
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT realtimeData, lastOpcuaUpdate, status FROM machines WHERE id = ?`,
        [req.params.id]
      );
      connection.release();

      if (rows.length > 0) {
        // 解析 realtimeData JSON 字符串
        let realtimeData = null;
        try {
          if (rows[0].realtimeData) {
            realtimeData =
              typeof rows[0].realtimeData === "string"
                ? JSON.parse(rows[0].realtimeData)
                : rows[0].realtimeData;
          }
        } catch (error) {
          console.error("解析 realtimeData 失败:", error);
        }

        res.json({
          ...status,
          realtimeData,
          lastUpdate: rows[0].lastOpcuaUpdate,
          currentStatus: rows[0].status,
        });
      } else {
        res.json(status);
      }
    } catch (error) {
      console.error("获取 OPC UA 状态失败:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// 启动所有已启用 OPC UA 的机台连接
router.post("/opcua/start-all", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [machines] = await connection.execute(
      `SELECT id, name, opcuaEnabled, opcuaEndpoint, opcuaNodeId, opcuaUsername, opcuaPassword 
       FROM machines WHERE opcuaEnabled = TRUE`
    );
    connection.release();

    const results = [];
    for (const machine of machines) {
      try {
        const result = await opcuaManager.connectMachine(machine);
        results.push({ machineId: machine.id, name: machine.name, ...result });
      } catch (error) {
        results.push({
          machineId: machine.id,
          name: machine.name,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `已尝试连接 ${machines.length} 台机器`,
      results,
    });
  } catch (error) {
    console.error("启动所有 OPC UA 连接失败:", error);
    res.status(500).json({ error: error.message });
  }
});

// 停止所有 OPC UA 连接
router.post("/opcua/stop-all", authenticateToken, async (req, res) => {
  try {
    await opcuaManager.disconnectAll();
    res.json({ success: true, message: "已断开所有 OPC UA 连接" });
  } catch (error) {
    console.error("停止所有 OPC UA 连接失败:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
