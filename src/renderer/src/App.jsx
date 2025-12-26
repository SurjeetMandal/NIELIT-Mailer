import { useState } from 'react'
import Logo from './assets/NIELIT_logo.png'

const App = () => {
  const [csvFile, setCsvFile] = useState(null)
  const [certDirectory, setCertDirectory] = useState(null)
  const [scorecardDirectory, setScorecardDirectory] = useState(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [csvLog, setCsvLog] = useState(null)

  const handleSelectFiles = async (inputName, properties, filters = []) => {
    if (!window.api?.openDialog) return setError('Electron API not available.')

    setStatus('Waiting for selection...')
    setError('')

    const paths = await window.api.openDialog({ properties, filters, title: `Select ${inputName}` })
    if (!paths || paths.length === 0) {
      setStatus('')
      return
    }

    const selectedPath = paths[0]
    const fileData = { path: selectedPath, name: selectedPath.split(/[\\/]/).pop() }

    if (inputName === 'studentsCsv') setCsvFile(fileData)
    else if (inputName === 'certificates') setCertDirectory(fileData)
    else if (inputName === 'scorecards') setScorecardDirectory(fileData)

    setStatus('')
  }

  const handleUpload = async () => {
    if (!window.api?.distributeFiles) return setError('Electron API not available.')

    setStatus('Processing and Distributing Files...')
    setError('')
    setCsvLog(null)

    if (!csvFile?.path || (!certDirectory?.path && !scorecardDirectory?.path)) {
      setError('Please select CSV and at least one folder (Certificates or Scorecards).')
      setStatus('')
      return
    }

    try {
      const response = await window.api.distributeFiles({
        csvFilePath: csvFile.path,
        certDirectoryPath: certDirectory?.path,
        scorecardDirectoryPath: scorecardDirectory?.path
      })

      if (response.success) {
        setStatus(response.message)
        setCsvLog(response.csvData)
        setCsvFile(null)
        setCertDirectory(null)
        setScorecardDirectory(null)
      } else setError(response.message)
    } catch (e) {
      setError(`Distribution failed: ${e.message}`)
      setStatus('')
    }
  }

  const downloadCsv = (csvData) => {
    if (!csvData || csvData.length === 0) return
    const headers = Object.keys(csvData[0]).join(',')
    const rows = csvData.map((r) =>
      Object.values(r)
        .map((v) => `"${v}"`)
        .join(',')
    )
    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'email_distribution_log.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const isDistributeDisabled = !csvFile || (!certDirectory && !scorecardDirectory)

  return (
    <div className="App">
      {/* Navbar Section */}
      <nav className="navbar">
        <div className="logo-container">
          <img src={Logo} alt="NIELIT Logo" height={60} className="logo-img" />
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-left">
          <div className="tag-badge">#10X Faster</div>
          <div className="tag-line">File Distribution Automation</div>
          <div className="headline">
            Effortlessly distribute certificates and scorecards to <br /> students with a single
            click.
          </div>
        </div>

        <div className="hero-right">
          <header className="app-header">
            <div className="upload-title">Upload Docs & DB</div>

            {/* 1. CSV Upload */}
            <div className="upload-group">
              <label>1. Upload Student CSV:</label>
              <span className="span_group">
                <button
                  onClick={() =>
                    handleSelectFiles(
                      'studentsCsv',
                      ['openFile'],
                      [{ name: 'CSV Files', extensions: ['csv'] }]
                    )
                  }
                  className="file-selector-button"
                >
                  {csvFile ? 'Change CSV' : 'Choose CSV'}
                </button>
                <p className="file-info">{csvFile ? csvFile.name : 'No file selected'}</p>
              </span>
            </div>

            {/* 2. Certificates Folder */}
            <div className="upload-group">
              <label>2. Select Certificates Folder:</label>
              <span className="span_group">
                <button
                  onClick={() => handleSelectFiles('certificates', ['openDirectory'])}
                  className="file-selector-button"
                >
                  {certDirectory ? 'Change Folder' : 'Choose Folder'}
                </button>
                <p className="file-info">
                  {certDirectory ? certDirectory.name : 'No folder selected'}
                </p>
              </span>
            </div>

            {/* 3. Scorecards Folder */}
            <div className="upload-group">
              <label>3. Select Scorecards Folder:</label>
              <span className="span_group">
                <button
                  onClick={() => handleSelectFiles('scorecards', ['openDirectory'])}
                  className="file-selector-button"
                >
                  {scorecardDirectory ? 'Change Folder' : 'Choose Folder'}
                </button>
                <p className="file-info">
                  {scorecardDirectory ? scorecardDirectory.name : 'No folder selected'}
                </p>
              </span>
            </div>

            {/* Action Button */}
            <button
              onClick={handleUpload}
              disabled={isDistributeDisabled}
              className="distribute-button"
            >
              Distribute Files
            </button>

            {/* Download CSV button */}
            {csvLog && (
              <button className="distribute-button" onClick={() => downloadCsv(csvLog)}>
                Download Email Log CSV
              </button>
            )}

            {status && <p className="status-message">{status}</p>}
            {error && <p className="error-message">{error}</p>}
          </header>
        </div>
      </div>
    </div>
  )
}

export default App
