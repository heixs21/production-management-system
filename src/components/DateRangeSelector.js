import React, { useState, useEffect } from 'react';

const DateRangeSelector = ({ selectedRange, onRangeChange, customStartDate, customEndDate, onCustomDateChange }) => {
  const [showCustom, setShowCustom] = useState(selectedRange === 'custom');

  // 同步自定义状态
  useEffect(() => {
    setShowCustom(selectedRange === 'custom');
  }, [selectedRange]);
  const ranges = [
    { 
      key: 'thisMonth', 
      label: '本月',
      getRange: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0); // 下个月的0号就是本月最后一天
        return { start, end };
      }
    },
    { 
      key: 'lastMonth', 
      label: '上月',
      getRange: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0); // 本月的0号就是上月最后一天
        return { start, end };
      }
    },
    { 
      key: 'nextMonth', 
      label: '下月',
      getRange: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const start = new Date(year, month + 1, 1);
        const end = new Date(year, month + 2, 0); // 下下个月的0号就是下月最后一天
        return { start, end };
      }
    },
    { 
      key: 'thisYear', 
      label: '本年',
      getRange: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        return { start, end };
      }
    },
    { 
      key: 'lastYear', 
      label: '上一年',
      getRange: () => {
        const now = new Date();
        const start = new Date(now.getFullYear() - 1, 0, 1);
        const end = new Date(now.getFullYear() - 1, 11, 31);
        return { start, end };
      }
    },
    {
      key: 'custom',
      label: '自定义',
      getRange: () => {
        return {
          start: customStartDate ? new Date(customStartDate) : new Date(),
          end: customEndDate ? new Date(customEndDate) : new Date()
        };
      }
    }
  ];

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentRangeInfo = () => {
    const range = ranges.find(r => r.key === selectedRange);
    if (range) {
      const { start, end } = range.getRange();
      return `${formatDate(start)} 至 ${formatDate(end)}`;
    }
    return '';
  };

  return (
    <div className="flex items-center space-x-4 mb-4 p-3 bg-blue-50 rounded">
      <span className="text-sm font-medium text-blue-800">时间范围：</span>
      <div className="flex space-x-2">
        {ranges.map(range => (
          <button
            key={range.key}
            onClick={() => {
              if (range.key === 'custom') {
                setShowCustom(!showCustom);
              }
              onRangeChange(range.key);
            }}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              selectedRange === range.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-600 hover:bg-blue-100'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* 自定义日期选择 */}
      {showCustom && selectedRange === 'custom' && (
        <div className="flex items-center space-x-2 mt-2">
          <span className="text-sm text-blue-700">从：</span>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => onCustomDateChange(e.target.value, customEndDate)}
            className="px-2 py-1 border rounded text-sm"
          />
          <span className="text-sm text-blue-700">到：</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => onCustomDateChange(customStartDate, e.target.value)}
            className="px-2 py-1 border rounded text-sm"
          />
        </div>
      )}

      <span className="text-sm text-blue-600">
        {getCurrentRangeInfo()}
      </span>
    </div>
  );
};

export default DateRangeSelector;
