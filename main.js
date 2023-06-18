const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const isDev = require('electron-is-dev')
const path = require('path')
const menuTemplate = require('./src/menuTemplate')
const AppWindow = require('./src/AppWindow')
const Store = require('electron-store')
const QiniuManager = require('./src/utils/QiniuManager')
const settingsStore = new Store({name: 'Settings'})
const fileStore = new Store({name: 'Files Data'})
Store.initRenderer()

let mainWindow, settingsWindow

const objToArr = (obj) => {
  return Object.keys(obj).map(key => obj[key])
}

const createManager = () => {
  const accessKey = settingsStore.get('accessKey')
  const secretKey = settingsStore.get('secretKey')
  const bucketName = settingsStore.get('bucketName')
  return new QiniuManager(accessKey, secretKey, bucketName)
}

app.on('ready', () => {
  const mainWindowConfig = {
    width: 1024,
    height: 680,
  }
  const urlLocation = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, './build/index.html')}`
  mainWindow = new AppWindow(mainWindowConfig, urlLocation)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  let menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  ipcMain.on('open-settings-window', () => {
    const settingsWindowConfig = {
      width: 700,
      height: 400,
      parent: mainWindow
    }
    const settingsFileLocation = `file://${path.join(__dirname, './settings/settings.html')}`
    // const settingsFileLocation = `http://localhost:8081/settings.html`
    settingsWindow = new AppWindow(settingsWindowConfig, settingsFileLocation)
    settingsWindow.removeMenu()
    settingsWindow.on('closed', () => {
      settingsWindow = null
    })
    require('@electron/remote/main').enable(settingsWindow.webContents)
  })
  ipcMain.on('upload-file', (event, data) => {
    const manager = createManager()
    manager.uploadFile(data.key, data.path).then(data => {
      console.log('上传成功', data)
      mainWindow.webContents.send('active-file-uploaded')
    }).catch(() => {
      dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
    })
  })
  ipcMain.on('download-file', (event, data) => {
    const manager = createManager()
    const filesObj = fileStore.get('files')
    const {key, path, id} = data
    manager.getStat(data.key).then((resp) => {
      console.log(resp, 'resp---')
      console.log(filesObj[data.id], 'filesObj---')
      const serverUpdatedTime = Math.round(resp.putTime / 10000)
      const localUpdatedTime = filesObj[id].createdAt
      if (serverUpdatedTime > localUpdatedTime || !localUpdatedTime) {
        manager.downloadFile(key, path).then(() => {
          console.log('new file downloaded')
          mainWindow.webContents.send('file-downloaded', {status: 'download-success', id})
        })
      } else {
        console.log('no new')
        mainWindow.webContents.send('file-downloaded', {status: 'no-new-file', id})
      }
    }).catch((error) => {
      // console.log(error, 'error---')
      if (error.statusCode === 612) {
        mainWindow.webContents.send('file-downloaded', {status: 'no-file', id})
      }
    })
  })
  ipcMain.on('delete-file', (event, data) => {
    const manager = createManager()
    manager.deleteFile(data.key).then(resp => {
      console.log('删除成功')
    }).catch(err => {
      dialog.showErrorBox('同步删除失败', '请检查七牛云参数是否正确')
    })
  })
  ipcMain.on('rename-file', (event, data) => {
    const manager = createManager()
    manager.renameFile(data.key, data.newKey).then(resp => {
      console.log('重命名成功')
    }).catch(err => {
      dialog.showErrorBox('同步重命名失败', '请检查七牛云参数是否正确')
    })
  })
  
  ipcMain.on('upload-all-to-qiniu', () => {
    mainWindow.webContents.send('loading-status', true)

    const manager = createManager()
    const filesObj = fileStore.get('files') || {}
    const uploadPromiseArr = Object.keys(filesObj).map(key => {
      const file = filesObj[key]
      return manager.uploadFile(`${file.title}.md`, file.path)
    })
    Promise.all(uploadPromiseArr).then(result => {
      console.log(result, 'result---111')
      dialog.showMessageBox({
        type: 'info',
        title: `成功上传了${result.length}个文件`,
        message: `成功上传了${result.length}个文件`,
      })
      mainWindow.webContents.send('files-uploaded')
    }).catch(() => {
      dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
    }).finally(() => {
      mainWindow.webContents.send('loading-status', false)
    })
  })
  ipcMain.on('download-all-to-local', () => {
    const filesObj = fileStore.get('files') || {}
    const filesArr = objToArr(filesObj)
    const manager = createManager()
    manager.getFileList().then(resp => {
      console.log(resp.items, filesArr, 'resp.items---')
      const downloadPromiseArr = resp.items.filter(item => {
        let flag = false
        const isLocal = filesArr.some(el => {
          return item.key.includes(el.title)
        })
        const serverUpdatedTime = Math.round(item.putTime / 10000)
        filesArr.forEach(el => {
          const localUpdatedTime = el.updateAt
          if (item.key.includes(el.title) && serverUpdatedTime > localUpdatedTime) {
            flag = true
          } else if (!isLocal) {
            flag = true
          }
        })
        return flag
      }).map(item => {
        const savedLocation = settingsStore.get('savedFileLocation')
        console.log(item, savedLocation, 'item===========================')
        
        return manager.downloadFile(item.key, path.join(savedLocation, `${item.key}`))
      })

      return Promise.all(downloadPromiseArr)
    }).then(arr => {
      console.log(arr, 'arr123')
    })
  })
  ipcMain.on('config-is-saved', () => {
    let qiniuMenu = process.platform === 'darwin' ? menu.items[3] : menu.items[2]
    const switchItems = (toggle) => {
      [1,2,3].forEach(number => {
        qiniuMenu.submenu.items[number].enabled = toggle
      })
    }
    const qiniuIsConfiged = ['accessKey', 'secretKey', 'bucketName'].every(key => !!settingsStore.get(key))
    switchItems(qiniuIsConfiged)
  })

  require('@electron/remote/main').initialize()
  require('@electron/remote/main').enable(mainWindow.webContents)
  
  
})