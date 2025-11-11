import React, { useState, useEffect } from "react";
import {
  Settings,
  Play,
  Square,
  TestTube,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";

const OPCUAConfig = ({ machineId, machineName, onClose }) => {
  const [config, setConfig] = useState({
    opcuaEnabled: false,
    opcuaEndpoint: "",
    opcuaNodeId: "",
    opcuaUsername: "",
    opcuaPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const API_BASE = `http://${window.location.hostname}:12454`;

  // 加载配置
  useEffect(() => {
    loadConfig();
    loadConnectionStatus();
  }, [machineId]);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/api/machines/${machineId}/opcua-config`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error("加载配置失败:", error);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/api/machines/${machineId}/opcua-status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      }
    } catch (error) {
      console.error("加载连接状态失败:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/api/machines/${machineId}/opcua-config`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        }
      );

      if (response.ok) {
        alert("配置已保存");
        loadConnectionStatus();
      } else {
        const error = await response.json();
        alert(`保存失败: ${error.error}`);
      }
    } catch (error) {
      alert(`保存失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/machines/opcua-test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opcuaEndpoint: config.opcuaEndpoint,
          opcuaNodeId: config.opcuaNodeId,
          opcuaUsername: config.opcuaUsername || undefined,
          opcuaPassword: config.opcuaPassword || undefined,
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/api/machines/${machineId}/opcua-connect`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        alert("已连接到 OPC UA 服务器");
        loadConnectionStatus();
      } else {
        const error = await response.json();
        alert(`连接失败: ${error.error}`);
      }
    } catch (error) {
      alert(`连接失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/api/machines/${machineId}/opcua-disconnect`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        alert("已断开连接");
        loadConnectionStatus();
      } else {
        const error = await response.json();
        alert(`断开失败: ${error.error}`);
      }
    } catch (error) {
      alert(`断开失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">OPC UA 配置</h2>
                <p className="text-sm text-gray-600">{machineName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 连接状态 */}
        {connectionStatus && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {connectionStatus.connected ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="font-medium">
                    {connectionStatus.connected ? "已连接" : "未连接"}
                  </div>
                  {connectionStatus.lastUpdate && (
                    <div className="text-xs text-gray-500">
                      最后更新:{" "}
                      {new Date(connectionStatus.lastUpdate).toLocaleString(
                        "zh-CN"
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {connectionStatus.connected ? (
                  <button
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Square className="w-4 h-4" />
                    <span>断开</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={loading || !config.opcuaEnabled}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Play className="w-4 h-4" />
                    <span>连接</span>
                  </button>
                )}
              </div>
            </div>

            {/* 实时数据 */}
            {connectionStatus.realtimeData && (
              <div className="mt-3 p-3 bg-white rounded border">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">实时数据</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">状态:</span>
                    <span className="ml-2 font-medium">
                      {connectionStatus.realtimeData.status || "-"}
                    </span>
                  </div>
                  {connectionStatus.realtimeData.temperature && (
                    <div>
                      <span className="text-gray-600">温度:</span>
                      <span className="ml-2 font-medium">
                        {connectionStatus.realtimeData.temperature}°C
                      </span>
                    </div>
                  )}
                  {connectionStatus.realtimeData.speed && (
                    <div>
                      <span className="text-gray-600">速度:</span>
                      <span className="ml-2 font-medium">
                        {connectionStatus.realtimeData.speed}
                      </span>
                    </div>
                  )}
                  {connectionStatus.realtimeData.errorCode && (
                    <div>
                      <span className="text-gray-600">错误码:</span>
                      <span className="ml-2 font-medium text-red-600">
                        {connectionStatus.realtimeData.errorCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 配置表单 */}
        <div className="p-6 space-y-4">
          {/* 启用开关 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <label className="font-medium">启用 OPC UA</label>
            <input
              type="checkbox"
              checked={config.opcuaEnabled}
              onChange={(e) =>
                setConfig({ ...config, opcuaEnabled: e.target.checked })
              }
              className="w-5 h-5"
            />
          </div>

          {/* 服务器地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              服务器地址 (Endpoint URL)
            </label>
            <input
              type="text"
              value={config.opcuaEndpoint}
              onChange={(e) =>
                setConfig({ ...config, opcuaEndpoint: e.target.value })
              }
              placeholder="opc.tcp://192.168.1.100:4840"
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              例: opc.tcp://192.168.1.100:4840
            </p>
          </div>

          {/* 节点ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              节点 ID (Node ID)
            </label>
            <input
              type="text"
              value={config.opcuaNodeId}
              onChange={(e) =>
                setConfig({ ...config, opcuaNodeId: e.target.value })
              }
              placeholder="ns=2;s=Machine.Status"
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              例: ns=2;s=Machine.Status 或 ns=2;i=1001
            </p>
          </div>

          {/* 用户名（可选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名（可选）
            </label>
            <input
              type="text"
              value={config.opcuaUsername}
              onChange={(e) =>
                setConfig({ ...config, opcuaUsername: e.target.value })
              }
              placeholder="留空表示匿名连接"
              className="w-full p-2 border rounded"
            />
          </div>

          {/* 密码（可选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码（可选）
            </label>
            <input
              type="password"
              value={config.opcuaPassword}
              onChange={(e) =>
                setConfig({ ...config, opcuaPassword: e.target.value })
              }
              placeholder="留空表示不修改"
              className="w-full p-2 border rounded"
            />
          </div>

          {/* 测试连接 */}
          <button
            onClick={handleTest}
            disabled={testing || !config.opcuaEndpoint || !config.opcuaNodeId}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <TestTube className="w-4 h-4" />
            <span>{testing ? "测试中..." : "测试连接"}</span>
          </button>

          {/* 测试结果 */}
          {testResult && (
            <div
              className={`p-3 rounded ${
                testResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="font-medium">
                {testResult.success ? "✅ 连接成功" : "❌ 连接失败"}
              </div>
              {testResult.error && (
                <div className="text-sm text-red-600 mt-1">
                  {testResult.error}
                </div>
              )}
              {testResult.data && (
                <div className="text-sm mt-2">
                  <div>值: {JSON.stringify(testResult.data.value)}</div>
                  <div className="text-gray-600">
                    时间:{" "}
                    {new Date(testResult.data.timestamp).toLocaleString(
                      "zh-CN"
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "保存中..." : "保存配置"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OPCUAConfig;
