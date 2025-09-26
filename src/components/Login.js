import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { COMPANIES } from '../config/companies';
import { getErrorMessage } from '../utils/errorMessages';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('hetai-logistics'); // 默认和泰链运
  const [step, setStep] = useState('login'); // 直接进入登录
  const { login } = useAuth();

  const handleCompanySelect = (companyId) => {
    setSelectedCompany(companyId);
    localStorage.setItem('selectedCompany', companyId);
    setStep('login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password, selectedCompany);
    
    if (!result.success) {
      setError(getErrorMessage(result.error));
    }
    
    setLoading(false);
  };

  const handleBack = () => {
    setStep('company');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            生产管理系统
          </h2>
          {step === 'company' && (
            <div className="mt-8">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleCompanySelect('hetai-logistics')}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg cursor-pointer transition-colors shadow-md hover:shadow-lg"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3">🚚</div>
                    <h3 className="text-lg font-bold mb-1">和泰链运</h3>
                  </div>
                </button>
                <button 
                  onClick={() => handleCompanySelect('hetai-mechanical')}
                  className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg cursor-pointer transition-colors shadow-md hover:shadow-lg"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3">⚙️</div>
                    <h3 className="text-lg font-bold mb-1">和泰机电</h3>
                  </div>
                </button>
              </div>
            </div>
          )}
          {/* 暂时隐藏公司选择显示 */}
          {false && step === 'login' && (
            <div className="mt-4">
              <div className="text-center mb-4">
                <div className={`inline-flex items-center px-4 py-2 rounded-lg ${
                  selectedCompany === 'hetai-logistics' ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <span className="text-sm text-gray-600">已选择：</span>
                  <span className={`font-semibold ml-1 ${
                    selectedCompany === 'hetai-logistics' ? 'text-blue-800' : 'text-green-800'
                  }`}>{COMPANIES[selectedCompany]?.name}</span>
                  <button 
                    onClick={handleBack}
                    className={`ml-2 text-sm ${
                      selectedCompany === 'hetai-logistics' ? 'text-blue-600 hover:text-blue-800' : 'text-green-600 hover:text-green-800'
                    }`}
                  >
                    更换
                  </button>
                </div>
              </div>
            </div>
          )}
          <p className="mt-2 text-center text-sm text-gray-600">
            请登录您的账户
          </p>
        </div>
        {step === 'login' && (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="用户名"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="密码"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-400 ${
                selectedCompany === 'hetai-logistics' 
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>


        </form>
        )}
      </div>
    </div>
  );
};

export default Login;