import React, { useState, useCallback, useMemo, useEffect } from 'react';
import SimpleMDE from "react-simplemde-editor";
import { v4 as uuidv4 } from 'uuid'
import { flattenArr, objToArr, timestampToString } from './utils/helper'
import fileHelper from './utils/fileHelper';
import * as marked from 'marked'
import { faPlus, faFileImport, faSave } from '@fortawesome/free-solid-svg-icons'
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import "easymde/dist/easymde.min.css";

import FileSearch from './components/FileSearch';
import FileList from './components/FileList';
import Loader from './components/Loader';
import defaultFiles from './utils/defaultFiles';
import BottomBtn from './components/BottomBtn';
import TabList from './components/TabList';
import useIpcRenderer from './hooks/useIpcRenderer';

// nodejs modules
const { join, basename, extname, dirname } = window.require('path')
const { ipcRenderer } = window.require('electron')
const remote = window.require('@electron/remote')
const Store = window.require('electron-store')

const fileStore = new Store({name: 'Files Data'})
const settingsStore = new Store({name: 'Settings'})
const getAutoSync = () => {
  return ['accessKey', 'secretKey', 'bucketName', 'enableAutoSync'].every(key => !!settingsStore.get(key))
}

const saveFilesToStore = (files) => {
  const filesStoreObj = objToArr(files).reduce((result, file) => {
    const {id, path, title, createdAt, isSynced, updateAt} = file
    result[id] = {
      id,
      path,
      title,
      createdAt,
      isSynced,
      updateAt
    }
    return result
  }, {})
  fileStore.set('files', filesStoreObj)
}

function App() {
  const [files, setFiles] = useState(fileStore.get('files') || {})
  const [activeFileID, setActiveFileID] = useState('')
  const [openedFileIDs, setOpenedFileIDs] = useState([])
  const [unsavedFileIDs, setUnsavedFileIDs] = useState([])
  const [searchedFiles, setSearchedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  const savedLocation = settingsStore.get('savedFileLocation') || remote.app.getPath('documents')
  const openedFiles = openedFileIDs.map(openID => {
    return files[openID]
  })
  const activeFile = files[activeFileID]

  const filesArr = objToArr(files)

  const fileListArr = useMemo(() => (searchedFiles?.length ? searchedFiles : filesArr), [searchedFiles, filesArr])

  const updateFile = (id, value, name, isNew=false) => {
    // const newFiles = files.map(file => {
    //   if (file.id === id) {
    //     file[name] = value
    //     file.isNew = false
    //   }
    //   return file
    // })
    
    const newPath = name === 'body' ? files[id].path 
    : isNew ? join(savedLocation, `${value}.md`) : join(dirname(files[id].path), `${value}.md`)
    const newFile = {...files[id], [name]: value, isNew: false, path: newPath}
    const newFiles = {...files, [id]: newFile}
    if (isNew) {
      fileHelper.writeFile(newPath, files[id].body).then(() => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    } else {
      if (name === 'title') {
        fileHelper.renameFile(files[id].path , newPath)
        .then(() => {
          if (getAutoSync() && files[id].isSynced) {
            ipcRenderer.send('rename-file', {key: `${files[id].title}.md`, newKey: `${value}.md`})
          }
          setFiles(newFiles)
          saveFilesToStore(newFiles)
        })
      } else if (name === 'body') {
        fileHelper.writeFile(newPath, value).then(() => {
          setFiles(newFiles)
        })
      }
    }
    
    // const searchNewFiles = searchedFiles.map(file => {
    //   if (file.id === id) {
    //     file[name] = value
    //     file.isNew = false
    //   }
    //   return file
    // })
    // setSearchedFiles(searchNewFiles)
  }

  const fileChange = (value) => {
    updateFile(activeFileID, value, 'body', false)

    if (!unsavedFileIDs.includes(activeFileID)) {
      setUnsavedFileIDs([...unsavedFileIDs, activeFileID])
    }
  }

  const options = useMemo(() => {
    return {
      minHeight: '600px',
      previewRender: (plainText, preview) => {
        setTimeout(() => {
          preview.innerHTML = marked.parse(plainText)
        },300)
        return 'Loading...'
      }
    }
  }, [])

  const fileClick = (fileID) => {
    setActiveFileID(fileID)
    const currentFile = files[fileID]
    const {id, title, path, isLoaded} = currentFile

    console.log(currentFile,openedFileIDs,'currentFile---')
    if (!isLoaded) {
      if (getAutoSync()) {
        ipcRenderer.send('download-file', {key: `${title}.md`, path, id})
      } else {
        fileHelper.readFile(path).then(value => {
          const newFile = {...currentFile, body: value, isLoaded: true}
          setFiles({...files, [fileID]: newFile})
        })
      }
    }
    if (!openedFileIDs.includes(fileID)) {
      setOpenedFileIDs([...openedFileIDs, fileID])
    }
  }

  const tabClick = (fileID) => {
    setActiveFileID(fileID)
  }

  const tabClose = (id) => {
    const tabsWithout = openedFileIDs.filter(fileID => fileID !== id)
    setOpenedFileIDs(tabsWithout)
    if (tabsWithout?.length) {
      setActiveFileID(tabsWithout[0])
    } else {
      setActiveFileID('')
    }
  }

  const deleteFile = (id) => {
    if (files[id].isNew) {
      const {[id]: value, ...afterDelete} = files
      setFiles(afterDelete)
    } else {
      const {path, isSynced, title} = files[id]
      fileHelper.deleteFile(path).then(() => {
        const {[id]: value, ...afterDelete} = files
        // const searchNewFiles = searchedFiles.filter(file => file.id !== id)
        setFiles(afterDelete)
        saveFilesToStore(afterDelete)
        // setSearchedFiles(searchNewFiles)
        if (getAutoSync() && isSynced) {
          ipcRenderer.send('delete-file', {key: `${title}.md`, path, id})
        } 
        tabClose(id)
      })
    }
  }

  const updateFileName = (id, title, isNew) => {
    updateFile(id, title, 'title', isNew)
  }

  const fileSearch = (keyword) => {
    const newFiles = filesArr.filter(file => file.title?.includes(keyword))
    setSearchedFiles(newFiles)
  }

  const createNewFile = () => {
    const newId = uuidv4()
    const newFile = {
      id: newId,
      title: '',
      body: '## 请输入 markdown',
      createdAt: Date.now(),
      isNew: true
    }
    setFiles({...files, [newId]: newFile})
  }

  const saveCurrentFile = () => {
    const {path, body, title} = activeFile
    // const newPath = join(savedLocation, `${activeFile.title}.md`)
    fileHelper.writeFile(path, body).then(() => {
      setUnsavedFileIDs(unsavedFileIDs.filter((id) => id !== activeFile.id))
      if (getAutoSync()) {
        ipcRenderer.send('upload-file', {key: `${title}.md`, path})
      }
    })
  }

  const importFiles = () => {
    remote.dialog.showOpenDialog({
      title: '选择导入的 Markdown 文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown files', extensions: ['md'] },
      ]
    }).then((result) => {
      if (Array.isArray(result.filePaths)) {
        const filteredPaths = result.filePaths.filter(path => {
          const alreadyAdded = Object.values(files).find(file => {
            return file.path === path
          })
          return !alreadyAdded
        })

        const importFilesArr = filteredPaths.map(path => {
          return {
            id: uuidv4(),
            title: basename(path, extname(path)),
            path
          }
        })
        const newFiles = { ...files, ...flattenArr(importFilesArr) }
        setFiles(newFiles)
        saveFilesToStore(newFiles)
        if (importFilesArr.length) {
          remote.dialog.showMessageBox({
            type: 'info',
            title: `成功导入了${importFilesArr.length}个文件`,
            message: `成功导入了${importFilesArr.length}个文件`,
          })
        }
      }
    })
  }

  const activeFileUploaded = () => {
    const {id} = activeFile
    const modifiedFile = {...files[id], isSynced: true, updateAt: Date.now()}
    const newFiles = {...files, [id]: modifiedFile}
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }

  const activeFileDownloaded = (event, message) => {
    const currentFile = files[message.id]
    const {id, path} = currentFile
    fileHelper.readFile(path).then(value => {
      let newFile
      if (message.status === 'download-success') {
        newFile = {...files[id], body: value, isLoaded: true, isSynced: true, updateAt: Date.now()}
      } else {
        newFile = {...files[id], body: value, isLoaded: true}
      }
      const newFiles = {...files, [id]: newFile}
      setFiles(newFiles)
      saveFilesToStore(newFiles)
    })
  }

  const filesUploaded = () => {
    const newFiles = objToArr(files).reduce((result, file) => {
      const currentTime = Date.now()
      result[file.id] = {
        ...files[file.id],
        isSynced: true,
        updateAt: currentTime
      }
      return result
    }, {})
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }
  
  useIpcRenderer({
    'create-new-file': createNewFile,
    'import-file': importFiles,
    'save-edit-file': saveCurrentFile,
    'active-file-uploaded': activeFileUploaded,
    'file-downloaded': activeFileDownloaded,
    'files-uploaded': filesUploaded,
    'loading-status': (message, status) => {
      setIsLoading(status)
    },
  })

  return (
    <div className="App container-fluid">
      {isLoading && <Loader />}
      <div className='row'>
        <div className='col-3 left-panel'>
          <FileSearch title={'我的云文档'} onFileSearch={fileSearch} />
          <FileList
            files={fileListArr} 
            onFileClick={fileClick} 
            onFileDelete={deleteFile}
            onSaveEdit={updateFileName}
          />
          <div className='row no-gutters button-group'>
            <div className='col'>
              <BottomBtn text='新建' colorClass='btn-primary' icon={faPlus} onBtnClick={createNewFile} />
            </div>
            <div className='col'>
              <BottomBtn text='导入' colorClass='btn-success' icon={faFileImport} onBtnClick={importFiles} />
            </div>
          </div>
        </div>
        <div className='col-9 right-panel'>
          {!activeFile && <div className='start-page'>
            选择或者创建新的 Markdown 文档
          </div>}
          {activeFile &&
            <>
              <TabList
                files={openedFiles}
                activeId={activeFileID}
                unsaveIds={unsavedFileIDs}
                onTabClick={tabClick}
                onCloseTab={tabClose}
              />
              <SimpleMDE
                key={activeFile?.id}
                value={activeFile?.body}
                onChange={fileChange}
                options={options}
              />
              {/* <BottomBtn text='保存' colorClass='btn-success' icon={faSave} onBtnClick={saveCurrentFile} /> */}
              {activeFile.isSynced && <span className='sync-status'>已同步，上次同步时间{timestampToString(activeFile.updateAt)}</span>}
            </>
          }
        </div>
      </div>
    </div>
  );
}

export default App;
