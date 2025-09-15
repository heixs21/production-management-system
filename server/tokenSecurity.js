const crypto = require('crypto');

// Token安全管理
class TokenSecurity {
  constructor() {
    // 使用内存存储，进程重启后自动清除
    this.tokenStore = new Map();
    this.encryptionKey = this.generateKey();
  }

  // 生成加密密钥
  generateKey() {
    return crypto.randomBytes(32);
  }

  // 加密Token
  encryptToken(token) {
    if (!token) return null;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  // 解密Token
  decryptToken(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;
    
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Token解密失败');
      return null;
    }
  }

  // 存储Token（加密）
  storeToken(service, token, expiryMinutes = 30) {
    const encryptedToken = this.encryptToken(token);
    const expiry = Date.now() + (expiryMinutes * 60 * 1000);
    
    this.tokenStore.set(service, {
      token: encryptedToken,
      expiry,
      lastAccess: Date.now()
    });
  }

  // 获取Token（解密）
  getToken(service) {
    const stored = this.tokenStore.get(service);
    if (!stored) return null;

    // 检查是否过期
    if (Date.now() > stored.expiry) {
      this.tokenStore.delete(service);
      return null;
    }

    // 更新最后访问时间
    stored.lastAccess = Date.now();
    
    return this.decryptToken(stored.token);
  }

  // 清除Token
  clearToken(service) {
    this.tokenStore.delete(service);
  }

  // 清除所有过期Token
  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [service, data] of this.tokenStore.entries()) {
      if (now > data.expiry) {
        this.tokenStore.delete(service);
      }
    }
  }

  // 获取Token状态（不返回实际Token）
  getTokenStatus(service) {
    const stored = this.tokenStore.get(service);
    if (!stored) return { exists: false };

    const isExpired = Date.now() > stored.expiry;
    return {
      exists: true,
      expired: isExpired,
      expiresIn: Math.max(0, stored.expiry - Date.now()),
      lastAccess: stored.lastAccess
    };
  }
}

// 创建全局实例
const tokenSecurity = new TokenSecurity();

// 定期清理过期Token
setInterval(() => {
  tokenSecurity.cleanupExpiredTokens();
}, 10 * 60 * 1000); // 每10分钟清理一次

module.exports = tokenSecurity;