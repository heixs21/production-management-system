-- ========================================
-- GUNT 生产管理系统 - 数据库优化脚本
-- 执行此脚本以添加索引和优化数据库性能
-- ========================================

USE gunt_db;

-- ========================================
-- 1. 工单表 (orders) 索引优化
-- ========================================

-- 查看当前索引
SHOW INDEX FROM orders;

-- 添加复合索引：按状态和日期查询（最常用）
CREATE INDEX IF NOT EXISTS idx_orders_status_dates 
ON orders(status, startDate, expectedEndDate, companyId);

-- 添加复合索引：按机台和状态查询
CREATE INDEX IF NOT EXISTS idx_orders_machine_status 
ON orders(machine, status, companyId);

-- 添加复合索引：按公司和日期范围查询
CREATE INDEX IF NOT EXISTS idx_orders_company_date_range 
ON orders(companyId, startDate, expectedEndDate);

-- 添加索引：按工单号快速查询
CREATE INDEX IF NOT EXISTS idx_orders_orderno 
ON orders(orderNo, companyId);

-- 添加索引：按物料号查询
CREATE INDEX IF NOT EXISTS idx_orders_materialno 
ON orders(materialNo, companyId);

-- 添加索引：暂停状态查询
CREATE INDEX IF NOT EXISTS idx_orders_paused 
ON orders(isPaused, actualEndDate, companyId);

-- 添加索引：紧急工单查询
CREATE INDEX IF NOT EXISTS idx_orders_urgent 
ON orders(isUrgent, priority, startDate);

-- 添加全文索引：支持工单号、物料号、物料名称搜索
ALTER TABLE orders ADD FULLTEXT INDEX idx_orders_fulltext 
(orderNo, materialNo, materialName);

-- ========================================
-- 2. 机台表 (machines) 索引优化
-- ========================================

-- 添加复合索引：按公司和状态查询
CREATE INDEX IF NOT EXISTS idx_machines_company_status 
ON machines(companyId, status);

-- 添加索引：按机台组查询
CREATE INDEX IF NOT EXISTS idx_machines_group 
ON machines(machineGroup, companyId);

-- 添加索引：OPC UA启用状态
CREATE INDEX IF NOT EXISTS idx_machines_opcua 
ON machines(opcuaEnabled, companyId);

-- ========================================
-- 3. 物料表 (materials) 索引优化
-- ========================================

-- 添加复合索引：按类别查询
CREATE INDEX IF NOT EXISTS idx_materials_category 
ON materials(category, companyId);

-- 添加复合索引：按类别和特征查询
CREATE INDEX IF NOT EXISTS idx_materials_category_feature 
ON materials(category, feature, companyId);

-- 添加全文索引：支持物料搜索
ALTER TABLE materials ADD FULLTEXT INDEX idx_materials_fulltext 
(category, feature, modelThickness);

-- ========================================
-- 4. 生产报告表 (production_reports) 索引优化
-- ========================================

-- 添加复合索引：按工单和日期查询
CREATE INDEX IF NOT EXISTS idx_reports_order_date 
ON production_reports(orderId, reportDate, companyId);

-- 添加复合索引：按班次和日期查询
CREATE INDEX IF NOT EXISTS idx_reports_shift_date 
ON production_reports(shiftName, reportDate, companyId);

-- ========================================
-- 5. 班次表 (shifts) 索引优化
-- ========================================

-- 添加复合索引：按机台查询
CREATE INDEX IF NOT EXISTS idx_shifts_machine 
ON shifts(machineId, sortOrder, companyId);

-- ========================================
-- 6. 用户表 (users) 索引优化
-- ========================================

-- 添加复合索引：按公司和角色查询
CREATE INDEX IF NOT EXISTS idx_users_company_role 
ON users(companyId, role);

-- ========================================
-- 7. 分析表并优化
-- ========================================

-- 分析所有表，更新统计信息
ANALYZE TABLE orders;
ANALYZE TABLE machines;
ANALYZE TABLE materials;
ANALYZE TABLE production_reports;
ANALYZE TABLE shifts;
ANALYZE TABLE users;

-- 优化所有表
OPTIMIZE TABLE orders;
OPTIMIZE TABLE machines;
OPTIMIZE TABLE materials;
OPTIMIZE TABLE production_reports;
OPTIMIZE TABLE shifts;
OPTIMIZE TABLE users;

-- ========================================
-- 8. 查看索引使用情况
-- ========================================

-- 查看所有索引
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    CARDINALITY,
    INDEX_TYPE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'gunt_db'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- 查看表大小和索引大小
SELECT 
    TABLE_NAME,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS `总大小(MB)`,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS `数据大小(MB)`,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS `索引大小(MB)`,
    TABLE_ROWS AS `行数`
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'gunt_db'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

-- ========================================
-- 9. 性能监控查询
-- ========================================

-- 查看慢查询设置
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';

-- 启用慢查询日志（运行时设置）
-- SET GLOBAL slow_query_log = 'ON';
-- SET GLOBAL long_query_time = 2;

-- ========================================
-- 优化完成！
-- ========================================

-- 验证索引创建成功
SELECT 
    TABLE_NAME,
    COUNT(*) AS `索引数量`
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'gunt_db'
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;

-- 输出优化摘要
SELECT 
    'orders' AS 表名,
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='gunt_db' AND TABLE_NAME='orders') AS 索引数
UNION ALL
SELECT 
    'machines',
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='gunt_db' AND TABLE_NAME='machines')
UNION ALL
SELECT 
    'materials',
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='gunt_db' AND TABLE_NAME='materials')
UNION ALL
SELECT 
    'production_reports',
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='gunt_db' AND TABLE_NAME='production_reports')
UNION ALL
SELECT 
    'shifts',
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='gunt_db' AND TABLE_NAME='shifts')
UNION ALL
SELECT 
    'users',
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='gunt_db' AND TABLE_NAME='users');

-- ========================================
-- 注意事项:
-- 1. 在生产环境执行前请先备份数据库
-- 2. 建议在业务低峰期执行此脚本
-- 3. OPTIMIZE TABLE 会锁表，大表可能需要较长时间
-- 4. 定期执行 ANALYZE TABLE 以更新统计信息
-- ========================================

