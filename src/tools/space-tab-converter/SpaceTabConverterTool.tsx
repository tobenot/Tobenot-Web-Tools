import React, { useState } from 'react'

export function SpaceTabConverterTool() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [stats, setStats] = useState('')
  const [copied, setCopied] = useState(false)

  const convertSpacesToTabs = () => {
    let convertedText = inputText
    let replacementCount = 0
    let oldLength
    do {
      oldLength = convertedText.length
      convertedText = convertedText.replace(/    /g, '\t')
      const newLength = convertedText.length
      replacementCount += (oldLength - newLength) / 3
    } while (convertedText.indexOf('    ') !== -1)

    setOutputText(convertedText)
    setStats(`Replaced ${replacementCount} occurrences of 4 spaces with tabs.`)
  }

  const convertTabsToSpaces = () => {
    let convertedText = inputText
    const tabCount = (inputText.match(/\t/g) || []).length
    convertedText = convertedText.replace(/\t/g, '    ')
    setOutputText(convertedText)
    setStats(`Replaced ${tabCount} tab characters with 4 spaces.`)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white border-2 border-gray-200 p-6 relative">
        <div 
          className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
            backgroundSize: '300% 100%',
            animation: 'gradient-flow 16s linear infinite'
          }}
        />
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">↔️</span>
          <h1 className="text-2xl font-bold tracking-wide text-gray-900">Space/Tab Converter</h1>
        </div>
        <p className="text-gray-600 mb-6">This tool converts between spaces and tabs for code indentation.</p>
        
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Input Text:</h2>
              <button 
                onClick={() => setInputText('')} 
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            </div>
            <textarea 
              className="w-full min-h-[200px] p-4 font-mono text-sm border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="Paste your text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              spellCheck="false"
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={convertSpacesToTabs}
              className="px-6 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors border-2 border-blue-200 hover:border-blue-300"
              style={{ borderRadius: '2px' }}
            >
              Convert 4 Spaces to Tab
            </button>
            <button 
              onClick={convertTabsToSpaces}
              className="px-6 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition-colors border-2 border-indigo-200 hover:border-indigo-300"
              style={{ borderRadius: '2px' }}
            >
              Convert Tab to 4 Spaces
            </button>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Output Text:</h2>
              {stats && (
                <span className="text-sm text-green-600 font-medium">
                  ✓ {stats}
                </span>
              )}
            </div>
            <textarea 
              className="w-full min-h-[200px] p-4 font-mono text-sm border-2 border-gray-200 bg-gray-50 focus:outline-none"
              placeholder="Result will appear here..."
              value={outputText}
              readOnly
              spellCheck="false"
            />
          </div>
          
          <div className="pt-2 border-t border-gray-100">
            <button 
              onClick={copyToClipboard}
              disabled={!outputText}
              className={`px-6 py-2 font-medium transition-colors border-2 ${
                !outputText 
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : copied
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              style={{ borderRadius: '2px' }}
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Result'}
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
