#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const log = (message) => {
  process.stdout.write(`${message}\n`)
}

try {
  log('Installing FRM Desktop dependencies...')

  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found. Run the script from the project root.')
  }

  execSync('npm install', { stdio: 'inherit' })

  const directories = ['dist', 'release', 'assets']
  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      log(`Created ${dir}/`)
    }
  })

  const schemaSource = path.join(process.cwd(), 'frm_schema.json')
  const schemaTarget = path.join(process.cwd(), 'assets', 'frm_schema.json')
  if (fs.existsSync(schemaSource) && !fs.existsSync(schemaTarget)) {
    fs.copyFileSync(schemaSource, schemaTarget)
    log('Copied frm_schema.json into assets/.')
  }

  log('Installation complete. Run "npm run dev" to start the application.')
} catch (error) {
  console.error('Installation failed:', error.message)
  process.exit(1)
}
