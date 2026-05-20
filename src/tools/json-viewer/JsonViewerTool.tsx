import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';

const defaultData = [
  {
    id: 1,
    name: '张三',
    contact: { email: 'zhang@example.com', phone: '13800000000' },
    roles: ['管理员', '编辑'],
    active: true
  },
  {
    id: 2,
    name: '李四',
    contact: { email: 'li@example.com', phone: null },
    roles: ['访客'],
    active: false
  }
];

// Helper to determine type color
const getTypeColor = (val: any) => {
  if (val === null) return 'text-gray-500 italic';
  if (typeof val === 'string') return 'text-green-600';
  if (typeof val === 'number') return 'text-blue-600';
  if (typeof val === 'boolean') return 'text-red-600 font-bold';
  return 'text-gray-800';
};

// Recursive Component for JSON Node
const JsonNode: React.FC<{ data: any }> = ({ data }) => {
  if (data === null) {
    return <span className={getTypeColor(data)}>null</span>;
  }

  if (typeof data !== 'object') {
    return <span className={getTypeColor(data)}>{String(data)}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-500 italic">[ ]</span>;

    const isArrayOfObjects = data.every(
      item => item !== null && typeof item === 'object' && !Array.isArray(item)
    );

    if (isArrayOfObjects) {
      // Get all unique keys
      const allKeys = new Set<string>();
      data.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
      const headers = Array.from(allKeys);

      return (
        <table className="w-full text-sm border-collapse border border-gray-200 m-1">
          <thead>
            <tr>
              <th className="border border-gray-200 p-2 bg-gray-50 text-gray-800 font-semibold text-left w-8">#</th>
              {headers.map(key => (
                <th key={key} className="border border-gray-200 p-2 bg-gray-50 text-gray-800 font-semibold text-left whitespace-nowrap">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-200 p-2 text-gray-400 text-xs">{index + 1}</td>
                {headers.map(key => (
                  <td key={key} className="border border-gray-200 p-2 align-top">
                    {item.hasOwnProperty(key) ? <JsonNode data={item[key]} /> : <span className="text-gray-300">-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else {
      // Simple List Table
      return (
        <table className="w-full text-sm border-collapse border border-gray-200 m-1">
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-200 p-2 align-top">
                  <JsonNode data={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  }

  // Object
  const keys = Object.keys(data);
  if (keys.length === 0) return <span className="text-gray-500 italic">{"{ }"}</span>;

  return (
    <table className="w-full text-sm border-collapse border border-gray-200 m-1">
      <tbody>
        {keys.map(key => (
          <tr key={key}>
            <th className="border border-gray-200 p-2 bg-gray-50 text-gray-800 font-semibold text-left w-32 whitespace-nowrap align-top">
              {key}
            </th>
            <td className="border border-gray-200 p-2 align-top !p-0">
              {/* Reset padding for nested table to merge borders smoothly */}
              <div className="p-2">
                <JsonNode data={data[key]} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const JsonViewerTool = () => {
  const [inputJson, setInputJson] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentWidthRef = useRef<HTMLDivElement>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync scrollbars
  const handleTopScroll = useCallback(() => {
    if (isSyncing || !topScrollRef.current || !bottomScrollRef.current) return;
    setIsSyncing(true);
    bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    setTimeout(() => setIsSyncing(false), 10);
  }, [isSyncing]);

  const handleBottomScroll = useCallback(() => {
    if (isSyncing || !topScrollRef.current || !bottomScrollRef.current) return;
    setIsSyncing(true);
    topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    setTimeout(() => setIsSyncing(false), 10);
  }, [isSyncing]);

  // Update top scrollbar content width
  const updateScrollWidth = useCallback(() => {
    if (bottomScrollRef.current && contentWidthRef.current) {
      contentWidthRef.current.style.width = `${bottomScrollRef.current.scrollWidth}px`;
    }
  }, []);

  useLayoutEffect(() => {
    updateScrollWidth();
    window.addEventListener('resize', updateScrollWidth);
    return () => window.removeEventListener('resize', updateScrollWidth);
  }, [parsedData, errorMsg, updateScrollWidth]);

  const processJson = (text: string) => {
    if (!text.trim()) {
      setParsedData(null);
      setErrorMsg('');
      return;
    }
    try {
      const data = JSON.parse(text);
      setParsedData(data);
      setErrorMsg('');
    } catch (e: any) {
      setParsedData(null);
      setErrorMsg(`JSON 格式错误: ${e.message}`);
    }
  };

  const handleGenerate = () => {
    processJson(inputJson);
  };

  const handleLoadDefault = () => {
    const text = JSON.stringify(defaultData, null, 2);
    setInputJson(text);
    processJson(text);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setInputJson(text);
      processJson(text);
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative bg-white border-2 border-gray-200 p-6 space-y-4">
        <div 
          className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
            backgroundSize: '300% 100%',
            animation: 'gradient-flow 16s linear infinite'
          }}
        />
        <h2 className="text-xl font-bold tracking-wide text-gray-900 flex items-center gap-2">
          <span>📊</span> JSON 表格查看器
        </h2>
        
        <textarea
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          placeholder="在此粘贴 JSON 文本..."
          className="w-full h-32 p-3 font-mono text-sm border-2 border-gray-200 bg-white focus:border-blue-500 focus:outline-none transition-colors resize-y rounded-none"
        />
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            生成表格视图
          </button>
          <button
            onClick={handleLoadDefault}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 font-medium transition-colors"
          >
            填入示例
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 font-medium transition-colors"
          >
            导入文件
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,.txt"
            className="hidden"
          />
          {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
        </div>
      </div>

      <div className="relative bg-white border-2 border-gray-200 flex flex-col" style={{ minHeight: '300px' }}>
        {/* Top Scrollbar */}
        <div 
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden border-b border-gray-200 bg-gray-50"
          style={{ height: '16px', scrollbarWidth: 'auto' }}
        >
          <div ref={contentWidthRef} style={{ height: '1px' }}></div>
        </div>
        
        {/* Main Content */}
        <div 
          ref={bottomScrollRef}
          onScroll={handleBottomScroll}
          className="flex-1 overflow-auto p-4 custom-scrollbar"
          style={{ maxHeight: '60vh', scrollbarWidth: 'auto', scrollbarGutter: 'stable' }}
        >
          {errorMsg ? (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
              {errorMsg}
            </div>
          ) : parsedData !== null ? (
            <div className="min-w-fit">
              <JsonNode data={parsedData} />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              请在上方输入 JSON 或导入文件以查看结果
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 6px;
          border: 3px solid #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* 避免内部表格出现双边框问题 */
        table table {
          border-style: hidden;
          margin: 0;
        }
        table table td, table table th {
          border-left: 1px solid #e5e7eb;
          border-top: 1px solid #e5e7eb;
        }
        table table tr:first-child th,
        table table tr:first-child td {
          border-top: none;
        }
        table table th:first-child,
        table table td:first-child {
          border-left: none;
        }
      `}</style>
    </div>
  );
};
