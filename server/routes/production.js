const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../auth');
const { addCompanyFilter } = require('../middleware/companyFilter');

const router = express.Router();

// 产量上报API
router.get('/production-reports/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const [reports] = await pool.execute(`
      SELECT * FROM production_reports 
      WHERE orderId = ? 
      ORDER BY reportDate DESC, shiftName
    `, [orderId]);
    res.json(reports || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 检查产量上报情况（整个工单）
router.get('/production-reports/:orderId/check', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const [reports] = await pool.execute(`
      SELECT COUNT(*) as reportCount, SUM(quantity) as totalQuantity 
      FROM production_reports 
      WHERE orderId = ? AND quantity > 0
    `, [orderId]);
    
    const hasReports = reports[0].reportCount > 0;
    const totalQuantity = reports[0].totalQuantity || 0;
    
    res.json({ 
      hasReports, 
      reportCount: reports[0].reportCount,
      totalQuantity 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 检查指定日期的产量上报情况
router.get('/production-reports/:orderId/check-date', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: '缺少日期参数' });
    }
    
    const [reports] = await pool.execute(`
      SELECT COUNT(*) as reportCount, SUM(quantity) as totalQuantity 
      FROM production_reports 
      WHERE orderId = ? AND reportDate = ? AND quantity > 0
    `, [orderId, date]);
    
    const hasReports = reports[0].reportCount > 0;
    const totalQuantity = reports[0].totalQuantity || 0;
    
    res.json({ 
      hasReports, 
      reportCount: reports[0].reportCount,
      totalQuantity,
      date 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 机台日报 - 按日期汇总每台机台的产量和工单情况
router.get('/production-reports/machines/daily', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const { startDate: startDateRaw, endDate: endDateRaw, machine } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];
    const normalizeDate = (value, fallback) => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return fallback;
      }
      return value;
    };

    const startDate = normalizeDate(startDateRaw || endDateRaw, todayStr);
    const endDate = normalizeDate(endDateRaw || startDateRaw, startDate);

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: '开始日期不能晚于结束日期' });
    }

    const allowedMachines = Array.isArray(req.user?.allowedMachines) ? req.user.allowedMachines : [];
    const isRestricted =
      req.user?.role !== 'admin' &&
      allowedMachines.length > 0 &&
      !allowedMachines.includes('all');

    if (machine && machine !== 'all' && isRestricted && !allowedMachines.includes(machine)) {
      return res.status(403).json({ error: '无权访问该机台数据' });
    }

    // 查询当前公司可用机台，供前端筛选使用
    const machineWhere = ['(m.companyId = ? OR m.companyId IS NULL)'];
    const machineParams = [req.companyId];

    if (isRestricted) {
      const placeholders = allowedMachines.map(() => '?').join(',');
      machineWhere.push(`m.name IN (${placeholders})`);
      machineParams.push(...allowedMachines);
    }

    const [machineRows] = await pool.execute(
      `
        SELECT
          m.id,
          m.name,
          m.machineGroup,
          m.lineCode,
          m.status,
          m.oee,
          m.coefficient,
          m.requiresProductionReport,
          m.autoAdjustOrders
        FROM machines m
        WHERE ${machineWhere.join(' AND ')}
        ORDER BY m.name ASC
      `,
      machineParams
    );

    const machineMetaMap = new Map();
    machineRows.forEach((row) => {
      machineMetaMap.set(row.name, row);
    });

    const filters = ['o.companyId = ?', 'pr.reportDate BETWEEN ? AND ?'];
    const params = [req.companyId, startDate, endDate];

    if (machine && machine !== 'all') {
      filters.push('o.machine = ?');
      params.push(machine);
    }

    if (isRestricted) {
      const placeholders = allowedMachines.map(() => '?').join(',');
      filters.push(`o.machine IN (${placeholders})`);
      params.push(...allowedMachines);
    }

    const [rows] = await pool.execute(
      `
        SELECT
          pr.reportDate,
          pr.shiftName,
          pr.quantity,
          o.id AS orderId,
          o.orderNo,
          o.materialNo,
          o.materialName,
          o.status AS orderStatus,
          o.machine AS machineName,
          o.priority,
          o.startDate,
          o.expectedEndDate,
          o.actualEndDate,
          o.reportedQuantity AS orderReportedQuantity,
          m.id AS machineId,
          m.machineGroup,
          m.lineCode,
          m.status AS machineStatus
        FROM production_reports pr
        JOIN orders o ON pr.orderId = o.id
        LEFT JOIN machines m ON m.name = o.machine
        WHERE ${filters.join(' AND ')}
        ORDER BY pr.reportDate ASC, o.machine ASC, o.orderNo ASC, pr.shiftName ASC
      `,
      params
    );

    const dayMap = new Map();
    const globalMachineSet = new Set();
    const globalOrderSet = new Set();
    let totalQuantity = 0;

    rows.forEach((row) => {
      const quantity = Number(row.quantity) || 0;
      totalQuantity += quantity;
      const dateKey = row.reportDate;

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: dateKey,
          totalQuantity: 0,
          machinesMap: new Map(),
        });
      }

      const dayEntry = dayMap.get(dateKey);
      dayEntry.totalQuantity += quantity;

      const machineName = row.machineName || '未指定机台';
      globalMachineSet.add(machineName);

      if (!dayEntry.machinesMap.has(machineName)) {
        const meta = machineMetaMap.get(machineName) || {};
        dayEntry.machinesMap.set(machineName, {
          machineName,
          machineId: row.machineId || meta.id || null,
          machineGroup: meta.machineGroup || row.machineGroup || null,
          lineCode: meta.lineCode || row.lineCode || null,
          machineStatus: meta.status || row.machineStatus || null,
          totalQuantity: 0,
          shiftSummary: {},
          ordersMap: new Map(),
        });
      }

      const machineEntry = dayEntry.machinesMap.get(machineName);
      machineEntry.totalQuantity += quantity;

      const shiftKey = row.shiftName || '未指定班次';
      machineEntry.shiftSummary[shiftKey] = (machineEntry.shiftSummary[shiftKey] || 0) + quantity;

      const orderKey = row.orderId || `${machineName}-${row.orderNo}`;
      if (!machineEntry.ordersMap.has(orderKey)) {
        machineEntry.ordersMap.set(orderKey, {
          orderId: row.orderId,
          orderNo: row.orderNo,
          materialNo: row.materialNo,
          materialName: row.materialName,
          orderStatus: row.orderStatus,
          startDate: row.startDate,
          expectedEndDate: row.expectedEndDate,
          actualEndDate: row.actualEndDate,
          totalQuantity: 0,
          shiftDetails: [],
        });
      }

      const orderEntry = machineEntry.ordersMap.get(orderKey);
      orderEntry.totalQuantity += quantity;
      orderEntry.shiftDetails.push({
        shiftName: row.shiftName || '未指定班次',
        quantity,
      });

      globalOrderSet.add(orderKey);
    });

    const days = Array.from(dayMap.values())
      .map((day) => {
        const machines = Array.from(day.machinesMap.values())
          .map((machineEntry) => ({
            machineName: machineEntry.machineName,
            machineId: machineEntry.machineId,
            machineGroup: machineEntry.machineGroup,
            lineCode: machineEntry.lineCode,
            machineStatus: machineEntry.machineStatus,
            totalQuantity: machineEntry.totalQuantity,
            shiftSummary: Object.entries(machineEntry.shiftSummary)
              .map(([shiftName, quantity]) => ({ shiftName, quantity }))
              .sort((a, b) => a.shiftName.localeCompare(b.shiftName, 'zh-CN')),
            orders: Array.from(machineEntry.ordersMap.values())
              .map((order) => ({
                ...order,
                shiftDetails: order.shiftDetails.sort((a, b) =>
                  (a.shiftName || '').localeCompare(b.shiftName || '', 'zh-CN')
                ),
              }))
              .sort((a, b) => (a.orderNo || '').localeCompare(b.orderNo || '', 'zh-CN')),
          }))
          .sort((a, b) => a.machineName.localeCompare(b.machineName, 'zh-CN'));

        return {
          date: day.date,
          totalQuantity: day.totalQuantity,
          machineCount: machines.length,
          machines,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 汇总可用机台列表（包含无产量的机台）
    const availableMachinesMap = new Map();
    machineRows.forEach((row) => {
      availableMachinesMap.set(row.name, {
        machineId: row.id,
        machineName: row.name,
        machineGroup: row.machineGroup,
        lineCode: row.lineCode,
        machineStatus: row.status,
      });
    });
    rows.forEach((row) => {
      if (!availableMachinesMap.has(row.machineName)) {
        availableMachinesMap.set(row.machineName, {
          machineId: row.machineId || null,
          machineName: row.machineName,
          machineGroup: row.machineGroup || null,
          lineCode: row.lineCode || null,
          machineStatus: row.machineStatus || null,
        });
      }
    });

    const availableMachines = Array.from(availableMachinesMap.values()).sort((a, b) =>
      (a.machineName || '').localeCompare(b.machineName || '', 'zh-CN')
    );

    const summary = {
      totalQuantity,
      machineCount: globalMachineSet.size,
      orderCount: globalOrderSet.size,
      dayCount: days.length,
      averagePerMachine:
        globalMachineSet.size > 0 ? Number((totalQuantity / globalMachineSet.size).toFixed(1)) : 0,
      averagePerDay: days.length > 0 ? Number((totalQuantity / days.length).toFixed(1)) : 0,
    };

    res.json({
      startDate,
      endDate,
      filter: {
        machine: machine && machine !== 'all' ? machine : 'all',
      },
      availableMachines,
      summary,
      days,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/production-reports', authenticateToken, async (req, res) => {
  try {
    const { orderId, shiftName, reportDate, quantity } = req.body;
    await pool.execute(`
      INSERT INTO production_reports (orderId, shiftName, reportDate, quantity) 
      VALUES (?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = CURRENT_TIMESTAMP
    `, [orderId, shiftName, reportDate, quantity]);
    res.json({ message: '产量上报成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/shifts/:machineId', authenticateToken, async (req, res) => {
  try {
    const { machineId } = req.params;
    const [shifts] = await pool.execute('SELECT * FROM shifts WHERE machineId = ? ORDER BY sortOrder, name', [machineId]);
    res.json(shifts || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shifts', authenticateToken, async (req, res) => {
  try {
    const { machineId, name } = req.body;
    const [maxOrder] = await pool.execute('SELECT COALESCE(MAX(sortOrder), 0) + 1 as nextOrder FROM shifts WHERE machineId = ?', [machineId]);
    const [result] = await pool.execute('INSERT INTO shifts (machineId, name, sortOrder) VALUES (?, ?, ?)', [machineId, name, maxOrder[0].nextOrder]);
    res.json({ id: result.insertId, machineId, name, sortOrder: maxOrder[0].nextOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/shifts/:shiftId', authenticateToken, async (req, res) => {
  try {
    const { shiftId } = req.params;
    await pool.execute('DELETE FROM shifts WHERE id = ?', [shiftId]);
    res.json({ message: '班次删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;