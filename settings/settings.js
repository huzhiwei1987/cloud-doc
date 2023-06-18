const remote = window.require('@electron/remote')
const { ipcRenderer } = window.require('electron')
const Store = require('electron-store')
const settingsStore = new Store({name: 'Settings'})
const qiniuConfigArr = ['#savedFileLocation', '#accessKey', '#secretKey', '#bucketName']

const $ = (selector) => {
  const result = document.querySelectorAll(selector)
  return result.length > 1 ? result : result[0]
}

document.addEventListener('DOMContentLoaded', () => {
  qiniuConfigArr.forEach(selector => {
    const savedValue = settingsStore.get(selector?.replace('#', ''))
    if (savedValue) {
      $(selector).value = savedValue
    }
  })
  
  $('#select-new-location').addEventListener('click', () => {
    console.log('点击了')
    remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: '选择文件的存储路径'
    }).then((result) => {
      console.log(result, 'path')
      if (Array.isArray(result.filePaths)) {
        $('#savedFileLocation').value = result.filePaths[0]
      }
    })
  })

  $('#settings-form').addEventListener('submit', (e) => {
    e.preventDefault()
    qiniuConfigArr.forEach(selector => {
      if ($(selector)) {
        const { id, value } = $(selector)
        settingsStore.set(id, value || '')
      }
    })
    ipcRenderer.send('config-is-saved')
    remote.getCurrentWindow().close()
  })
  $('.nav-tabs').addEventListener('click', (e) => {
    e.preventDefault()
    $('.nav-link').forEach(ele => {
      ele.classList.remove('active')
    })
    e.target.classList.add('active')
    $('.config-area').forEach(ele => {
      ele.style.display = 'none'
    })
    $(e.target.dataset.tab).style.display = 'block'
  })
})