// 公司数据过滤中间件
const addCompanyFilter = (req, res, next) => {
  // 从JWT token中获取公司ID
  const companyId = req.user?.companyId || 'hetai-logistics';
  
  // 将公司ID添加到请求对象中
  req.companyId = companyId;
  
  console.log(`API请求: ${req.method} ${req.path}, 用户: ${req.user?.username}, 公司: ${companyId}`);
  
  next();
};

module.exports = { addCompanyFilter };