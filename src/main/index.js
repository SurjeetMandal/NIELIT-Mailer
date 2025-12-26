import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import { parse } from 'csv-parse'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import * as path from 'path'
import { default as pLimit } from 'p-limit'
import icon from '../../resources/icon.png?asset'

dotenv.config({ path: path.join(process.resourcesPath, '.env') })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'NotAvailableForGitHub',
    pass: 'SameForPass'
  }
})

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Electron Mail Distributor',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../resources/icon.png'),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (is.dev) mainWindow.webContents.openDevTools()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.nielit-mailer')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  setupIPCHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// --- IPC HANDLERS ---
function setupIPCHandlers() {
  ipcMain.handle('open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(options)
    if (!result.canceled && result.filePaths.length > 0) return result.filePaths
    return null
  })

  ipcMain.handle(
    'distribute-files',
    async (event, { csvFilePath, certDirectoryPath, scorecardDirectoryPath }) => {
      if (!csvFilePath || (!certDirectoryPath && !scorecardDirectoryPath)) {
        return {
          success: false,
          message: 'Please select at least one folder: Certificates or Scorecards.'
        }
      }

      const records = []

      try {
        console.log('📘 Reading CSV file:', csvFilePath)
        const parser = fs
          .createReadStream(csvFilePath)
          .pipe(parse({ columns: true, skip_empty_lines: true }))
        for await (const record of parser) records.push(record)

        console.log(`✅ Loaded ${records.length} records from CSV`)

        const certFilenames = certDirectoryPath ? fs.readdirSync(certDirectoryPath) : []
        const scorecardFilenames = scorecardDirectoryPath
          ? fs.readdirSync(scorecardDirectoryPath)
          : []

        console.log('📁 Certificate folder files:', certFilenames.length)
        console.log('📁 Scorecard folder files:', scorecardFilenames.length)

        const certMap = new Map(
          certFilenames
            .filter((f) => f.endsWith('.pdf'))
            .map((f) => {
              const key = f.split(' ')[0].trim() // ✅ take only part before first space
              return [key, path.join(certDirectoryPath, f)]
            })
        )

        const scorecardMap = new Map(
          scorecardFilenames
            .filter((f) => f.endsWith('.pdf'))
            .map((f) => {
              const key = f.split(' ')[0].trim() // ✅ take only part before first space
              return [key, path.join(scorecardDirectoryPath, f)]
            })
        )

        console.log('🗂 Certificate keys (first 5):', Array.from(certMap.keys()).slice(0, 5))
        console.log('🗂 Scorecard keys (first 5):', Array.from(scorecardMap.keys()).slice(0, 5))

        const limit = (pLimit.default || pLimit)(5)
        const results = []

        const emailTasks = records.map((student) =>
          limit(async () => {
            const courseId = student['BATCH']?.trim()
            const rollNo = student['ROLL_NO']?.trim()
            const email = student['EMAIL_ID']?.trim()
            const studentName = student['NAME']?.trim()
            const courseName = student['COURSE_NAME']?.trim()
            const attachments = []

            console.log('\n🔍 Processing student:', {
              rollNo,
              courseId,
              email,
              studentName,
              courseName
            })

            if (!email) {
              console.log('❌ Missing email for roll no:', rollNo)
              results.push({ success: false, rollNo, reason: 'Missing email' })
              return
            }

            const certFileKey = `${rollNo}_${courseId}`
            const scorecardFileKey = `${2 * parseInt(rollNo) - 1}_${courseId}`

            console.log('🧩 Matching keys:', { certFileKey, scorecardFileKey })

            if (certMap.has(certFileKey)) {
              console.log('✅ Found certificate:', certMap.get(certFileKey))
              attachments.push({
                filename: path.basename(certMap.get(certFileKey)),
                path: certMap.get(certFileKey)
              })
            } else {
              console.log('⚠️ Certificate not found for key:', certFileKey)
            }

            if (!isNaN(parseInt(rollNo)) && scorecardMap.has(scorecardFileKey)) {
              console.log('✅ Found scorecard:', scorecardMap.get(scorecardFileKey))
              attachments.push({
                filename: path.basename(scorecardMap.get(scorecardFileKey)),
                path: scorecardMap.get(scorecardFileKey)
              })
            } else {
              console.log('⚠️ Scorecard not found for key:', scorecardFileKey)
            }

            if (attachments.length > 0) {
              const hasCert = certMap.has(certFileKey)
              const hasScore = scorecardMap.has(scorecardFileKey)
              const subject =
                hasCert && hasScore
                  ? `Course Completion Certificate & Scorecard: ${courseId} - ${courseName}`
                  : hasCert
                    ? `Course Completion Certificate: ${courseId} - ${courseName}`
                    : `Scorecard: ${courseId} - ${courseName}`

              const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject,
                html: `
              <p>Dear ${studentName || 'Student'},</p>
              <p><b>Congratulations!</b> You have successfully completed the course "${courseName}".</p>

              <p>To get more details about any other course in IT/ Electronics, visit the website of NIELIT Delhi Centre at 
              <a href="https://www.nielit.gov.in/delhi/index.php" target="_blank">www.nielit.gov.in/delhi/index.php</a> regularly.<br>
              You can follow our <a href="https://www.facebook.com/NDL.NIELIT/" target="_blank">Facebook</a> and 
              <a href="https://x.com/NDL_NIELIT" target="_blank">X (Formerly Twitter)</a> accounts. 

              We will be looking forward to hearing about the developments you have made.</p

              <p>Please find attached your ${
                hasCert && hasScore
                  ? 'Certificate and Scorecard'
                  : hasCert
                    ? 'Certificate'
                    : 'Scorecard'
              }.</p>
              <p>Regards,<br>NIELIT Delhi Centre, Janakpuri</p>`,
                attachments
              }

              try {
                console.log('📨 Sending email to:', email)
                await transporter.sendMail(mailOptions)
                console.log('✅ Email sent successfully to:', email)
                results.push({ success: true, rollNo, email, attachments: attachments.length })
              } catch (err) {
                console.error('❌ Failed to send email to:', email, 'Error:', err.message)
                results.push({ success: false, rollNo, reason: err.message })
              }
            } else {
              console.log('❌ No matching files found for:', { rollNo, courseId })
              results.push({ success: false, rollNo, reason: 'No matching files found' })
            }
          })
        )

        await Promise.allSettled(emailTasks)

        // Prepare CSV log
        const csvData = results.map((r) => {
          const student = records.find((s) => s['ROLL_NO']?.trim() === r.rollNo)
          return {
            Name: student?.NAME || 'Unknown',
            Email: student?.EMAIL_ID || 'Unknown',
            Message: r.success
              ? `Email sent successfully with ${r.attachments || 0} attachments`
              : `Failed: ${r.reason || 'Unknown reason'}`
          }
        })

        console.log('\n📊 Summary:')
        console.table(csvData)

        return {
          success: true,
          message: `Distribution completed for ${records.length} students.`,
          results,
          csvData
        }
      } catch (error) {
        console.error('🔥 Critical error:', error)
        return { success: false, message: `Error: ${error.message}` }
      }
    }
  )
}
